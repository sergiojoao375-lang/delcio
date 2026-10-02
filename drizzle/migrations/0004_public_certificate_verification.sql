CREATE OR REPLACE FUNCTION public.verify_course_certificate(_verification_code uuid)
RETURNS TABLE (
  verification_code uuid,
  full_name text,
  course_title text,
  level text,
  final_score integer,
  issued_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.verification_code, c.full_name, c.course_title, c.level, c.final_score, c.issued_at
  FROM public.course_certificates c
  WHERE c.verification_code = _verification_code
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_course_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_course_certificate(uuid) TO anon, authenticated, service_role;