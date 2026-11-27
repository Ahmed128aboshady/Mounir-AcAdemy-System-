ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS teacher_id bigint REFERENCES public.teachers(id);

UPDATE public.support_tickets AS ticket
SET teacher_id = teacher.id
FROM public.teachers AS teacher
WHERE ticket.teacher_id IS NULL
  AND ticket.student_id IS NULL
  AND substring(ticket.student_name FROM '\[معلم #([0-9]+)\]') = teacher.id::text;

CREATE INDEX IF NOT EXISTS support_tickets_teacher_created_idx
ON public.support_tickets (teacher_id, created_at DESC) WHERE teacher_id IS NOT NULL;
