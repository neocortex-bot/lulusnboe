ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS reading_started_at timestamptz;
CREATE OR REPLACE FUNCTION public.anchor_exam_reading_time() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.current_candidate_id IS NULL THEN NEW.reading_started_at := NULL;
 ELSIF TG_OP='INSERT' THEN NEW.reading_started_at := clock_timestamp();
 ELSIF OLD.current_candidate_id IS DISTINCT FROM NEW.current_candidate_id THEN NEW.reading_started_at := clock_timestamp();
 ELSE NEW.reading_started_at := OLD.reading_started_at;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER anchor_exam_reading_time BEFORE INSERT OR UPDATE ON public.exam_sessions FOR EACH ROW EXECUTE FUNCTION public.anchor_exam_reading_time();
CREATE OR REPLACE FUNCTION public.get_exam_server_time() RETURNS timestamptz LANGUAGE sql VOLATILE SET search_path=public AS $$ SELECT clock_timestamp(); $$;
REVOKE ALL ON FUNCTION public.get_exam_server_time() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exam_server_time() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_exam_timing(_session_id uuid, _token text DEFAULT NULL) RETURNS TABLE(reading_started_at timestamptz, session_start_time timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.reading_started_at,s.session_start_time FROM public.exam_sessions s WHERE s.id=_session_id AND
 ((auth.uid() IS NOT NULL AND (s.current_candidate_id=auth.uid() OR s.examiner_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.is_master_admin(auth.uid()))) OR (_token IS NOT NULL AND s.station_token=_token));
$$;
REVOKE ALL ON FUNCTION public.get_exam_timing(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exam_timing(uuid,text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.start_exam_timer(_session_id uuid) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _start timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Silakan masuk kembali.' USING ERRCODE='42501'; END IF;
 SELECT s.session_start_time INTO _start FROM public.exam_sessions s WHERE s.id=_session_id AND s.current_candidate_id=auth.uid() AND s.status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sesi tidak tersedia untuk peserta ini.' USING ERRCODE='42501'; END IF;
 IF _start IS NULL THEN
  _start := clock_timestamp();
  UPDATE public.exam_sessions SET session_start_time=_start WHERE id=_session_id;
 END IF;
 RETURN _start;
END; $$;
REVOKE ALL ON FUNCTION public.start_exam_timer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_exam_timer(uuid) TO authenticated,service_role;