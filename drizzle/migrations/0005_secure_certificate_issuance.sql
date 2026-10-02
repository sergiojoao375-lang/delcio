CREATE OR REPLACE FUNCTION public.issue_course_certificate(_full_name text)
RETURNS public.course_certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _final_score integer;
  _certificate public.course_certificates;
  _clean_name text := trim(_full_name);
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF char_length(_clean_name) < 2 OR char_length(_clean_name) > 100 THEN
    RAISE EXCEPTION 'Invalid full name';
  END IF;

  SELECT score INTO _final_score
  FROM public.level_tests
  WHERE user_id = _user_id
    AND kind = 'final'
    AND status = 'done'
    AND passed = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF _final_score IS NULL THEN
    RAISE EXCEPTION 'Final exam not passed';
  END IF;

  SELECT * INTO _certificate
  FROM public.course_certificates
  WHERE user_id = _user_id;

  IF FOUND THEN
    RETURN _certificate;
  END IF;

  INSERT INTO public.course_certificates (user_id, full_name, final_score)
  VALUES (_user_id, _clean_name, _final_score)
  RETURNING * INTO _certificate;

  RETURN _certificate;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_course_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_course_certificate(text) TO authenticated, service_role;