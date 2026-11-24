CREATE OR REPLACE FUNCTION public.anchor_exam_reading_time() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.current_candidate_id IS NULL THEN
  NEW.reading_started_at := NULL;
 ELSIF TG_OP='INSERT' THEN
  NEW.reading_started_at := clock_timestamp();
 ELSIF OLD.current_candidate_id IS DISTINCT FROM NEW.current_candidate_id THEN
  NEW.reading_started_at := clock_timestamp();
 ELSIF OLD.reading_started_at IS NULL AND NEW.reading_started_at IS NOT NULL THEN
  NEW.reading_started_at := clock_timestamp();
 ELSE
  NEW.reading_started_at := OLD.reading_started_at;
 END IF;
 IF TG_OP='UPDATE' AND OLD.session_start_time IS NOT NULL AND NEW.current_candidate_id IS NOT DISTINCT FROM OLD.current_candidate_id THEN
  NEW.session_start_time := OLD.session_start_time;
 ELSIF NEW.session_start_time IS NOT NULL AND (TG_OP='INSERT' OR OLD.session_start_time IS NULL) THEN
  NEW.session_start_time := clock_timestamp();
 END IF;
 RETURN NEW;
END; $$;
CREATE FUNCTION private.start_exam_reading_timer(_session_id uuid) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _start timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Silakan masuk kembali.' USING ERRCODE='42501'; END IF;
 SELECT s.reading_started_at INTO _start FROM public.exam_sessions s WHERE s.id=_session_id AND s.current_candidate_id=auth.uid() AND s.status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sesi tidak tersedia untuk peserta ini.' USING ERRCODE='42501'; END IF;
 IF _start IS NULL THEN
  UPDATE public.exam_sessions SET reading_started_at=clock_timestamp() WHERE id=_session_id RETURNING reading_started_at INTO _start;
 END IF;
 RETURN _start;
END; $$;
REVOKE ALL ON FUNCTION private.start_exam_reading_timer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.start_exam_reading_timer(uuid) TO authenticated,service_role;
CREATE FUNCTION public.start_exam_reading_timer(_session_id uuid) RETURNS timestamptz LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.start_exam_reading_timer(_session_id); $$;
REVOKE ALL ON FUNCTION public.start_exam_reading_timer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_exam_reading_timer(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.start_exam_timer(_session_id uuid) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _start timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Silakan masuk kembali.' USING ERRCODE='42501'; END IF;
 SELECT s.session_start_time INTO _start FROM public.exam_sessions s WHERE s.id=_session_id AND s.current_candidate_id=auth.uid() AND s.status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sesi tidak tersedia untuk peserta ini.' USING ERRCODE='42501'; END IF;
 IF _start IS NULL THEN
  UPDATE public.exam_sessions SET session_start_time=clock_timestamp() WHERE id=_session_id RETURNING session_start_time INTO _start;
 END IF;
 RETURN _start;
END; $$;