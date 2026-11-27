ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS present_count integer DEFAULT 0;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS renewal_request_id text UNIQUE;

CREATE OR REPLACE FUNCTION public.record_student_classroom_entry(
    p_student_id bigint,
    p_course_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    enrollment public.enrollments%ROWTYPE;
    cairo_now timestamp := now() AT TIME ZONE 'Africa/Cairo';
    today_start timestamptz := date_trunc('day', cairo_now) AT TIME ZONE 'Africa/Cairo';
    tomorrow_start timestamptz := (date_trunc('day', cairo_now) + interval '1 day') AT TIME ZONE 'Africa/Cairo';
    day_names text[] := ARRAY['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    scheduled_days text;
    session_minutes text;
    attendance_course text;
BEGIN
    SELECT * INTO STRICT enrollment
    FROM public.enrollments
    WHERE student_id = p_student_id AND course_name = p_course_name
    FOR UPDATE;

    IF EXISTS (
        SELECT 1 FROM public.attendance
        WHERE student_id = p_student_id
          AND joined_at >= today_start AND joined_at < tomorrow_start
          AND status IN ('present', 'attended', 'late')
          AND split_part(course_name, ' [رصد آلي', 1) = p_course_name
    ) THEN
        RETURN jsonb_build_object('remaining_credits', enrollment.remaining_credits, 'present_count', enrollment.present_count);
    END IF;

    IF COALESCE(enrollment.remaining_credits, 0) <= 0 THEN
        RAISE EXCEPTION 'No remaining credits for this course';
    END IF;

    UPDATE public.enrollments
    SET remaining_credits = remaining_credits - 1,
        present_count = COALESCE(present_count, 0) + 1
    WHERE id = enrollment.id
    RETURNING * INTO STRICT enrollment;

    scheduled_days := to_jsonb(enrollment)->>'subscription_days';
    session_minutes := substring(to_jsonb(enrollment)->>'session_duration' from '^[0-9]{1,3}');
    attendance_course := p_course_name || CASE
        WHEN COALESCE(scheduled_days, '') <> '' AND strpos(
            translate(scheduled_days, 'أإآ', 'ااا'),
            translate(day_names[extract(dow FROM cairo_now)::int + 1], 'أإآ', 'ااا')
        ) = 0 THEN ' [رصد آلي - تعويض]'
        ELSE ' [رصد آلي - دخول الطالب]'
    END;

    INSERT INTO public.attendance (student_id, course_name, status, duration_minutes)
    VALUES (p_student_id, attendance_course, 'present', COALESCE(NULLIF(session_minutes::int, 0), 20));

    RETURN jsonb_build_object('remaining_credits', enrollment.remaining_credits, 'present_count', enrollment.present_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_student_classroom_entry(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_classroom_entry(bigint, text) TO anon, authenticated;
