ALTER FUNCTION public.get_exam_timing(uuid,text) SET SCHEMA private;
GRANT USAGE ON SCHEMA private TO anon,authenticated;
REVOKE ALL ON FUNCTION private.get_exam_timing(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_exam_timing(uuid,text) TO anon,authenticated,service_role;
CREATE FUNCTION public.get_exam_timing(_session_id uuid,_token text DEFAULT NULL) RETURNS TABLE(reading_started_at timestamptz, session_start_time timestamptz) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT * FROM private.get_exam_timing(_session_id,_token); $$;
REVOKE ALL ON FUNCTION public.get_exam_timing(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exam_timing(uuid,text) TO anon,authenticated,service_role;