CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
ALTER FUNCTION public.regenerate_station_session(uuid,text,text) SET SCHEMA private;
CREATE FUNCTION public.regenerate_station_session(_case_id uuid, _new_token text, _previous_station_token text)
RETURNS TABLE(id uuid,case_id uuid,status text,session_start_time timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
SELECT * FROM private.regenerate_station_session(_case_id,_new_token,_previous_station_token);
$$;
REVOKE ALL ON FUNCTION public.regenerate_station_session(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_station_session(uuid,text,text) TO anon,authenticated,service_role;