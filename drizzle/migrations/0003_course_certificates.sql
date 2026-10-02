CREATE TABLE public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  verification_code uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  course_title text NOT NULL DEFAULT 'Curso Completo de Inglês',
  level text NOT NULL DEFAULT 'advanced',
  final_score integer NOT NULL,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_certificates TO authenticated;
GRANT ALL ON public.course_certificates TO service_role;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own certificate"
ON public.course_certificates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE INDEX idx_course_certificates_verification_code
ON public.course_certificates (verification_code);