ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS absent_count integer DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_staff_course_attendance(
    p_student_id bigint,
    p_enrollment_id bigint,
    p_day date,
    p_status text,
    p_source text,
    p_undo_id bigint DEFAULT NULL,
    p_excuse_cycle integer DEFAULT NULL,
    p_compensation boolean DEFAULT false,
    p_substitute_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    scope public.enrollments%ROWTYPE;
    logged public.attendance%ROWTYPE;
    day_start timestamptz := p_day::timestamp AT TIME ZONE 'Africa/Cairo';
    day_end timestamptz := (p_day + 1)::timestamp AT TIME ZONE 'Africa/Cairo';
    course_suffix text := '\s+\[(رصد آلي|معلم|بديل|إشراف|تأجيل)[^\]]*\].*$';
    label text;
    duration integer;
BEGIN
    IF p_source NOT IN ('teacher', 'supervisor')
        OR p_status NOT IN ('present', 'absent', 'excused', 'postponed')
        OR p_source IS NULL OR p_status IS NULL OR p_day IS NULL
        OR (p_source = 'teacher' AND (p_status = 'present' OR p_undo_id IS NOT NULL)) THEN
        RAISE EXCEPTION 'Invalid attendance action';
    END IF;

    SELECT * INTO STRICT scope FROM public.enrollments
    WHERE id = p_enrollment_id AND student_id = p_student_id FOR UPDATE;

    IF p_undo_id IS NOT NULL THEN
        DELETE FROM public.attendance
        WHERE id = p_undo_id AND student_id = p_student_id
          AND joined_at >= day_start AND joined_at < day_end
          AND trim(regexp_replace(course_name, course_suffix, '')) = trim(scope.course_name)
          AND (CASE WHEN strpos(course_name, '[تأجيل') > 0 THEN 'postponed' ELSE status END) = p_status
        RETURNING * INTO STRICT logged;

        IF p_status <> 'postponed' THEN
            UPDATE public.enrollments
            SET remaining_credits = COALESCE(remaining_credits, 0) + (p_status IN ('present', 'absent'))::integer,
                present_count = greatest(0, COALESCE(present_count, 0) - (p_status = 'present')::integer),
                absent_count = greatest(0, COALESCE(absent_count, 0) - (
                    p_status = 'absent' OR (p_status = 'excused' AND (
                        strpos(logged.course_name, ' [معلم]') > 0 OR strpos(logged.course_name, ' [بديل:') > 0
                    ))
                )::integer),
                excuse_count = greatest(0, COALESCE(excuse_count, 0) - (p_status = 'excused')::integer)
            WHERE id = scope.id RETURNING * INTO STRICT scope;
        END IF;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.attendance
            WHERE student_id = p_student_id AND joined_at >= day_start AND joined_at < day_end
              AND trim(regexp_replace(course_name, course_suffix, '')) = trim(scope.course_name)
        ) THEN
            RAISE EXCEPTION 'Attendance already recorded for this course and date';
        END IF;

        IF p_status IN ('present', 'absent') AND COALESCE(scope.remaining_credits, 0) <= 0 THEN
            RAISE EXCEPTION 'No remaining credits for this course';
        END IF;

        IF p_status <> 'postponed' THEN
            UPDATE public.enrollments
            SET remaining_credits = COALESCE(remaining_credits, 0) - (p_status IN ('present', 'absent'))::integer,
                present_count = COALESCE(present_count, 0) + (p_status = 'present')::integer,
                absent_count = COALESCE(absent_count, 0) + (p_status = 'absent' OR (p_status = 'excused' AND p_source = 'teacher'))::integer,
                excuse_count = COALESCE(excuse_count, 0) + (p_status = 'excused')::integer,
                max_allowed_excuses = CASE WHEN p_status = 'excused' AND p_source = 'teacher'
                    THEN COALESCE(p_excuse_cycle, max_allowed_excuses) ELSE max_allowed_excuses END
            WHERE id = scope.id RETURNING * INTO STRICT scope;
        END IF;

        label := CASE
            WHEN p_status = 'postponed' THEN ' [معلم] [تأجيل معلم]'
            WHEN p_source = 'supervisor' AND p_compensation THEN ' [إشراف - تعويض]'
            WHEN NULLIF(p_substitute_name, '') IS NOT NULL THEN ' [بديل: ' || p_substitute_name || ']'
            WHEN p_source = 'supervisor' THEN ' [إشراف]'
            ELSE ' [معلم]'
        END;
        duration := substring(to_jsonb(scope)->>'session_duration' from '^[0-9]{1,3}')::integer;

        INSERT INTO public.attendance (student_id, course_name, status, joined_at, duration_minutes)
        VALUES (p_student_id, scope.course_name || label,
            CASE WHEN p_status = 'postponed' THEN 'excused' ELSE p_status END,
            CASE WHEN now() >= day_start AND now() < day_end THEN now() ELSE day_start + interval '12 hours' END,
            CASE WHEN p_status = 'postponed' THEN 0 ELSE COALESCE(NULLIF(duration, 0), 20) END)
        RETURNING * INTO STRICT logged;
    END IF;

    RETURN jsonb_build_object('attendance_id', logged.id, 'remaining_credits', scope.remaining_credits);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_staff_course_attendance(bigint, bigint, date, text, text, bigint, integer, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_staff_course_attendance(bigint, bigint, date, text, text, bigint, integer, boolean, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.postpone_teacher_course_group(p_enrollment_ids bigint[], p_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    enrollment_id bigint;
    student_id bigint;
BEGIN
    FOR enrollment_id IN
        SELECT DISTINCT id FROM unnest(p_enrollment_ids) AS requested(id) ORDER BY id
    LOOP
        SELECT e.student_id INTO STRICT student_id FROM public.enrollments e WHERE e.id = enrollment_id;
        PERFORM public.apply_staff_course_attendance(student_id, enrollment_id, p_day, 'postponed', 'teacher');
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.postpone_teacher_course_group(bigint[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.postpone_teacher_course_group(bigint[], date) TO anon, authenticated;

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
    existing_status text;
BEGIN
    SELECT * INTO STRICT enrollment
    FROM public.enrollments
    WHERE student_id = p_student_id AND course_name = p_course_name
    FOR UPDATE;

    SELECT status INTO existing_status
    FROM public.attendance
    WHERE student_id = p_student_id AND joined_at >= today_start AND joined_at < tomorrow_start
      AND trim(regexp_replace(course_name, '\s+\[(رصد آلي|معلم|بديل|إشراف|تأجيل)[^\]]*\].*$', '')) = trim(p_course_name)
    ORDER BY joined_at DESC LIMIT 1;
    IF FOUND THEN
        IF existing_status NOT IN ('present', 'attended', 'late') THEN
            RAISE EXCEPTION 'Attendance already recorded for this course and date';
        END IF;
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
