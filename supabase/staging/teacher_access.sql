-- Staging cutover only. Provision Supabase Auth identities and migrate the
-- student and supervisor clients before revoking anonymous production access.
BEGIN;

CREATE SCHEMA IF NOT EXISTS monir_private;
REVOKE ALL ON SCHEMA monir_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA monir_private TO authenticated;

CREATE TABLE IF NOT EXISTS monir_private.teacher_identity (
    auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    teacher_id bigint NOT NULL UNIQUE REFERENCES public.teachers(id) ON DELETE CASCADE
);
REVOKE ALL ON monir_private.teacher_identity FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION monir_private.teacher_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT teacher_id FROM monir_private.teacher_identity WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION monir_private.owns_teacher_course(student bigint, course text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments AS enrollment
        WHERE enrollment.teacher_id = monir_private.teacher_id()
          AND enrollment.student_id = student
          AND (course IS NULL OR enrollment.course_name = trim(regexp_replace(
                course, '\s+\[(رصد آلي|معلم|بديل|إشراف|تأجيل)[^\]]*\].*$', ''
          )))
    );
$$;

REVOKE ALL ON FUNCTION monir_private.teacher_id(), monir_private.owns_teacher_course(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION monir_private.teacher_id(), monir_private.owns_teacher_course(bigint, text) TO authenticated;

REVOKE ALL ON public.users, public.teachers, public.students, public.enrollments,
    public.attendance, public.support_tickets, public.notifications, public.payments, public.teacher_payouts
FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS users_all ON public.users;
DROP POLICY IF EXISTS teachers_all ON public.teachers;
DROP POLICY IF EXISTS students_all ON public.students;
DROP POLICY IF EXISTS enrollments_all ON public.enrollments;
DROP POLICY IF EXISTS attendance_all ON public.attendance;
DROP POLICY IF EXISTS support_tickets_all ON public.support_tickets;
DROP POLICY IF EXISTS notifications_all ON public.notifications;
DROP POLICY IF EXISTS payments_all ON public.payments;
DROP POLICY IF EXISTS teacher_payouts_all ON public.teacher_payouts;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.teachers, public.enrollments, public.attendance,
    public.support_tickets, public.notifications TO authenticated;
GRANT SELECT (id, name, student_code, age, qr_code, status) ON public.students TO authenticated;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5);
GRANT UPDATE (current_surah, current_aya, rating) ON public.enrollments TO authenticated;
DO $$
DECLARE
    table_name text;
    seq text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['public.support_tickets', 'public.notifications'] LOOP
        seq := pg_get_serial_sequence(table_name, 'id');
        IF seq IS NOT NULL THEN
            EXECUTE format('GRANT USAGE ON SEQUENCE %s TO authenticated', seq);
        END IF;
    END LOOP;
END;
$$;
GRANT INSERT ON public.support_tickets, public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

CREATE POLICY monir_teacher_profile ON public.teachers FOR SELECT TO authenticated
    USING (id = monir_private.teacher_id());
CREATE POLICY monir_teacher_students ON public.students FOR SELECT TO authenticated
    USING (monir_private.owns_teacher_course(id, NULL));
CREATE POLICY monir_teacher_enrollment_read ON public.enrollments FOR SELECT TO authenticated
    USING (teacher_id = monir_private.teacher_id());
CREATE POLICY monir_teacher_enrollment_plan ON public.enrollments FOR UPDATE TO authenticated
    USING (teacher_id = monir_private.teacher_id()) WITH CHECK (teacher_id = monir_private.teacher_id());
CREATE POLICY monir_teacher_attendance_read ON public.attendance FOR SELECT TO authenticated
    USING (course_name IS NOT NULL AND monir_private.owns_teacher_course(student_id, course_name));
CREATE POLICY monir_teacher_ticket_read ON public.support_tickets FOR SELECT TO authenticated
    USING (teacher_id = monir_private.teacher_id());
CREATE POLICY monir_teacher_ticket_open ON public.support_tickets FOR INSERT TO authenticated
    WITH CHECK (teacher_id = monir_private.teacher_id() AND student_id IS NULL
        AND status = 'open' AND admin_reply IS NULL);
CREATE POLICY monir_teacher_notification_read ON public.notifications FOR SELECT TO authenticated
    USING (type LIKE 'teacher:' || monir_private.teacher_id()::text || ':%');
CREATE POLICY monir_teacher_notification_seen ON public.notifications FOR UPDATE TO authenticated
    USING (type LIKE 'teacher:' || monir_private.teacher_id()::text || ':%')
    WITH CHECK (type LIKE 'teacher:' || monir_private.teacher_id()::text || ':%');
CREATE POLICY monir_teacher_student_notification_send ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (type IN ('quran_plan', 'session_postponed') AND is_read = 0 AND course_name IS NOT NULL
        AND monir_private.owns_teacher_course(student_id, course_name));

REVOKE EXECUTE ON FUNCTION public.apply_staff_course_attendance(bigint, bigint, date, text, text, bigint, integer, boolean, text),
    public.postpone_teacher_course_group(bigint[], date), public.record_student_classroom_entry(bigint, text)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.teacher_portal_identity()
RETURNS bigint
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT monir_private.teacher_id(); $$;

CREATE OR REPLACE FUNCTION public.teacher_portal_record_attendance(
    p_student_id bigint, p_enrollment_id bigint, p_status text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    enrollment public.enrollments%ROWTYPE;
    today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
    month_start date := date_trunc('month', today::timestamp)::date;
    schedule text;
    cycle_size integer;
    excuse_cycle integer;
BEGIN
    SELECT * INTO enrollment FROM public.enrollments
        WHERE id = p_enrollment_id AND student_id = p_student_id AND teacher_id = monir_private.teacher_id()
        FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enrollment not assigned to this teacher' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.students AS student
        WHERE student.id = p_student_id AND
            lower(trim(COALESCE(student.status, to_jsonb(student)->>'account_status', ''))) IN
            ('inactive', 'موقوف', 'غير نشط', 'frozen', 'paused', 'stopped', 'expired')
    ) THEN
        RAISE EXCEPTION 'Student account is paused';
    END IF;
    IF p_status = 'excused' THEN
        schedule := translate(COALESCE(to_jsonb(enrollment)->>'subscription_days', ''), 'أإآة', 'اااه');
        SELECT CASE WHEN count(*) >= 2 OR strpos(schedule, ' و ') > 0 THEN 8 ELSE 4 END INTO cycle_size
        FROM unnest(ARRAY['سبت', 'احد', 'اثنين', 'اتنين', 'ثلاثاء', 'تلاتاء', 'اربعاء', 'خميس', 'جمعه']) AS days(day)
        WHERE strpos(schedule, day) > 0;
        excuse_cycle := (COALESCE(enrollment.present_count, 0) + COALESCE(enrollment.absent_count, 0)) / cycle_size + 1;
        IF COALESCE(enrollment.remaining_credits, 0) <= 0 OR
            (COALESCE(enrollment.excuse_count, 0) > 0 AND (
                enrollment.max_allowed_excuses = excuse_cycle OR enrollment.excuse_count >= excuse_cycle
            )) OR EXISTS (
                SELECT 1 FROM public.attendance AS record
                WHERE record.student_id = p_student_id AND record.status = 'excused'
                  AND record.joined_at >= month_start::timestamp AT TIME ZONE 'Africa/Cairo'
                  AND record.joined_at < (month_start + interval '1 month') AT TIME ZONE 'Africa/Cairo'
                  AND strpos(record.course_name, '[تأجيل') = 0
                  AND trim(regexp_replace(record.course_name, '\s+\[(رصد آلي|معلم|بديل|إشراف|تأجيل)[^\]]*\].*$', '')) = enrollment.course_name
            ) THEN
            RAISE EXCEPTION 'No excuse remaining for this course';
        END IF;
    END IF;
    RETURN public.apply_staff_course_attendance(
        p_student_id, p_enrollment_id, today, p_status, 'teacher', p_excuse_cycle => excuse_cycle
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_portal_postpone_group(p_enrollment_ids bigint[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    enrollment record;
BEGIN
    FOR enrollment IN
        SELECT requested.id, assigned.student_id
        FROM (SELECT DISTINCT unnest(p_enrollment_ids) AS id) AS requested
        LEFT JOIN public.enrollments AS assigned ON assigned.id = requested.id
            AND assigned.teacher_id = monir_private.teacher_id()
        ORDER BY requested.id
    LOOP
        PERFORM public.teacher_portal_record_attendance(enrollment.student_id, enrollment.id, 'postponed');
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_portal_identity(),
    public.teacher_portal_record_attendance(bigint, bigint, text), public.teacher_portal_postpone_group(bigint[])
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_portal_identity(),
    public.teacher_portal_record_attendance(bigint, bigint, text), public.teacher_portal_postpone_group(bigint[])
TO authenticated;

COMMIT;
