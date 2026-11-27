-- Run after teacher_access.sql on the test database. Link only verified Auth accounts.
BEGIN;

CREATE TABLE monir_private.student_identity (
    auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id bigint NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE
);

CREATE TABLE monir_private.supervisor_identity (
    auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

REVOKE ALL ON monir_private.student_identity, monir_private.supervisor_identity FROM PUBLIC, anon, authenticated;

CREATE FUNCTION monir_private.student_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT student_id FROM monir_private.student_identity WHERE auth_user_id = auth.uid();
$$;

CREATE FUNCTION monir_private.is_supervisor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (SELECT 1 FROM monir_private.supervisor_identity WHERE auth_user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION monir_private.student_id(), monir_private.is_supervisor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION monir_private.student_id(), monir_private.is_supervisor() TO authenticated;

CREATE POLICY monir_student_own_profile ON public.students FOR SELECT TO authenticated
    USING (id = monir_private.student_id());
CREATE POLICY monir_student_own_enrollment_read ON public.enrollments FOR SELECT TO authenticated
    USING (student_id = monir_private.student_id());
CREATE POLICY monir_student_own_attendance_read ON public.attendance FOR SELECT TO authenticated
    USING (student_id = monir_private.student_id());
CREATE POLICY monir_supervisor_enrollment_read ON public.enrollments FOR SELECT TO authenticated
    USING (monir_private.is_supervisor());
CREATE POLICY monir_supervisor_attendance_read ON public.attendance FOR SELECT TO authenticated
    USING (monir_private.is_supervisor());
CREATE POLICY monir_supervisor_teachers_read ON public.teachers FOR SELECT TO authenticated
    USING (monir_private.is_supervisor());
CREATE POLICY monir_supervisor_entry_notification_read ON public.notifications FOR SELECT TO authenticated
    USING (monir_private.is_supervisor() AND type = 'classroom_entry');

ALTER TABLE public.teacher_payouts ENABLE ROW LEVEL SECURITY;
GRANT SELECT (id, teacher_id, amount) ON public.teacher_payouts TO authenticated;
CREATE POLICY monir_supervisor_payout_read ON public.teacher_payouts FOR SELECT TO authenticated
    USING (monir_private.is_supervisor());

CREATE FUNCTION public.attendance_portal_identity(p_role text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT CASE p_role
        WHEN 'student' THEN (
            SELECT jsonb_build_object('role', 'student', 'student_id', s.id, 'student_code', s.student_code, 'full_name', s.name)
            FROM public.students s WHERE s.id = monir_private.student_id()
        )
        WHEN 'admin' THEN CASE WHEN monir_private.is_supervisor() THEN jsonb_build_object('role', 'admin') END
    END;
$$;

CREATE FUNCTION public.student_portal_attendance_profile()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'student', jsonb_build_object('id', s.id, 'name', s.name, 'student_code', s.student_code,
            'age', s.age, 'qr_code', s.qr_code, 'status', s.status, 'account_status', to_jsonb(s)->>'account_status'),
        'enrollments', COALESCE((
            SELECT jsonb_agg(to_jsonb(e) || jsonb_build_object('teachers', jsonb_build_object('name', t.name, 'bio', t.bio)) ORDER BY e.id)
            FROM public.enrollments e LEFT JOIN public.teachers t ON t.id = e.teacher_id WHERE e.student_id = s.id
        ), '[]'::jsonb)
    ) FROM public.students s WHERE s.id = monir_private.student_id();
$$;

CREATE FUNCTION public.student_portal_classroom_entry(p_course_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    verified_student_id bigint := monir_private.student_id();
BEGIN
    IF verified_student_id IS NULL THEN
        RAISE EXCEPTION 'Student account required' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.students AS student WHERE student.id = verified_student_id
        AND lower(trim(COALESCE(NULLIF(student.status, ''), to_jsonb(student)->>'account_status', ''))) IN
            ('inactive', 'موقوف', 'غير نشط', 'frozen', 'paused', 'stopped', 'expired')
    ) THEN
        RAISE EXCEPTION 'Student account is paused' USING ERRCODE = '42501';
    END IF;
    RETURN public.record_student_classroom_entry(verified_student_id, p_course_name);
END;
$$;

CREATE FUNCTION public.supervisor_portal_attendance_students()
RETURNS TABLE(id bigint, name text, student_code text, phone text, qr_code text, status text, account_status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT monir_private.is_supervisor() THEN
        RAISE EXCEPTION 'Supervisor account required' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY SELECT s.id, s.name, s.student_code,
        COALESCE(NULLIF(to_jsonb(s)->>'parent_phone', ''), to_jsonb(s)->>'phone'),
        s.qr_code, s.status, to_jsonb(s)->>'account_status'
    FROM public.students s ORDER BY s.id;
END;
$$;

CREATE FUNCTION public.supervisor_portal_record_attendance(
    p_student_id bigint, p_enrollment_id bigint, p_day date, p_status text,
    p_undo_id bigint DEFAULT NULL, p_compensation boolean DEFAULT false, p_substitute_name text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF NOT monir_private.is_supervisor() THEN
        RAISE EXCEPTION 'Supervisor account required' USING ERRCODE = '42501';
    END IF;
    RETURN public.apply_staff_course_attendance(
        p_student_id, p_enrollment_id, p_day, p_status, 'supervisor', p_undo_id,
        p_compensation => p_compensation, p_substitute_name => p_substitute_name
    );
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_portal_identity(text), public.student_portal_attendance_profile(),
    public.student_portal_classroom_entry(text), public.supervisor_portal_attendance_students(),
    public.supervisor_portal_record_attendance(bigint, bigint, date, text, bigint, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_portal_identity(text), public.student_portal_attendance_profile(),
    public.student_portal_classroom_entry(text), public.supervisor_portal_attendance_students(),
    public.supervisor_portal_record_attendance(bigint, bigint, date, text, bigint, boolean, text) TO authenticated;

COMMIT;
