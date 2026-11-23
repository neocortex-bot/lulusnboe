CREATE OR REPLACE FUNCTION public.claim_exam_session(_session_id uuid, _candidate_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _session public.exam_sessions%ROWTYPE; _is_prep boolean;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _candidate_id THEN
    RETURN jsonb_build_object('success',false,'reason','forbidden');
  END IF;
  SELECT * INTO _session FROM public.exam_sessions WHERE id=_session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','session_not_found'); END IF;
  SELECT c.exam_mode = 'preparation' INTO _is_prep FROM public.clinical_cases c WHERE c.id=_session.case_id;
  IF NOT coalesce(_is_prep,false) AND NOT public.is_master_admin(_candidate_id) AND NOT EXISTS (SELECT 1 FROM public.exam_access ea WHERE ea.user_id=_candidate_id AND ea.allowed) THEN
    RETURN jsonb_build_object('success',false,'reason','not_allowed');
  END IF;
  IF public.exam_waiting_deadline(_session_id) <= statement_timestamp() THEN
    RETURN jsonb_build_object('success',false,'reason','session_expired');
  END IF;
  IF EXISTS (SELECT 1 FROM public.exam_results er WHERE er.candidate_id=_candidate_id AND er.session_id=_session_id) THEN
    RETURN jsonb_build_object('success',false,'reason','duplicate');
  END IF;
  IF _session.current_candidate_id=_candidate_id THEN RETURN jsonb_build_object('success',true,'outcome','reused'); END IF;
  IF _session.current_candidate_id IS NOT NULL THEN RETURN jsonb_build_object('success',false,'reason','already_claimed'); END IF;
  IF _session.status IN ('completed','force_closed') THEN RETURN jsonb_build_object('success',false,'reason','session_unavailable'); END IF;
  UPDATE public.exam_sessions SET current_candidate_id=_candidate_id,status='active' WHERE id=_session_id;
  RETURN jsonb_build_object('success',true,'outcome','claimed');
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_preparation_practice(_case_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Silakan masuk terlebih dahulu' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clinical_cases c WHERE c.id=_case_id AND c.exam_mode='preparation' AND c.status='published') THEN
    RAISE EXCEPTION 'Station persiapan tidak tersedia' USING ERRCODE='P0002';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text||_case_id::text, 0));
  SELECT s.id INTO _id FROM public.exam_sessions s
  WHERE s.case_id=_case_id AND s.current_candidate_id=_uid AND s.status='active' AND s.session_start_time IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.exam_results r WHERE r.session_id=s.id)
  ORDER BY s.created_at DESC LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  INSERT INTO public.exam_sessions(case_id, station_token, status, current_candidate_id, show_results_to_candidate_override)
  VALUES (_case_id, 'prep-'||replace(gen_random_uuid()::text,'-',''), 'active', _uid, true)
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;
REVOKE ALL ON FUNCTION public.start_preparation_practice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_preparation_practice(uuid) TO authenticated;