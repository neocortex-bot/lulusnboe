CREATE OR REPLACE FUNCTION public.exam_waiting_deadline(_session_id uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN s.status = 'waiting' AND s.current_candidate_id IS NULL AND s.session_start_time IS NULL THEN
    GREATEST(s.created_at,
      COALESCE((SELECT max(r.created_at) FROM public.exam_sequence_items own
        JOIN public.exam_sequence_items sibling ON sibling.deployment_id = own.deployment_id
        JOIN public.exam_results r ON r.session_id = sibling.session_id
        WHERE own.session_id = s.id), s.created_at),
      CASE WHEN EXISTS (SELECT 1 FROM public.exam_sequence_items own
        JOIN public.exam_sequence_items sibling ON sibling.deployment_id = own.deployment_id
        JOIN public.exam_sessions active_session ON active_session.id = sibling.session_id
        WHERE own.session_id = s.id AND active_session.status = 'active')
        THEN statement_timestamp() ELSE s.created_at END
    ) + interval '15 minutes' ELSE NULL END
  FROM public.exam_sessions s WHERE s.id = _session_id;
$$;
REVOKE ALL ON FUNCTION public.exam_waiting_deadline(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_station_waiting_state(_token text)
RETURNS TABLE(status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN deadline.at <= statement_timestamp() THEN 'expired' ELSE s.status END,
    deadline.at
  FROM public.exam_sessions s
  CROSS JOIN LATERAL (SELECT public.exam_waiting_deadline(s.id) AS at) deadline
  WHERE s.station_token = _token LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_station_waiting_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_station_waiting_state(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_session_by_token(_token text)
RETURNS TABLE(id uuid, case_id uuid, status text, session_start_time timestamptz, sequence_order integer, sequence_total bigint, deployment_id uuid, show_examiner_panel boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT es.id, es.case_id,
    CASE WHEN public.exam_waiting_deadline(es.id) <= statement_timestamp() THEN 'expired' ELSE es.status END,
    es.session_start_time, esi.sequence_order,
    CASE WHEN esi.deployment_id IS NULL THEN NULL ELSE (SELECT count(*) FROM public.exam_sequence_items grouped WHERE grouped.deployment_id=esi.deployment_id) END,
    esi.deployment_id, es.show_examiner_panel
  FROM public.exam_sessions es LEFT JOIN public.exam_sequence_items esi
    ON esi.session_id=es.id AND esi.station_token=es.station_token
  WHERE es.station_token=_token ORDER BY esi.sequence_order NULLS LAST,es.id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.reject_expired_exam_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status='waiting' AND OLD.current_candidate_id IS NULL
     AND (NEW.status='active' OR NEW.current_candidate_id IS NOT NULL)
     AND public.exam_waiting_deadline(OLD.id) <= statement_timestamp() THEN
    RAISE EXCEPTION 'Sesi kedaluwarsa setelah 15 menit tidak digunakan. Silakan deploy ulang.' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reject_expired_exam_claim() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reject_expired_exam_claim BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.reject_expired_exam_claim();

CREATE OR REPLACE FUNCTION public.claim_exam_session(_session_id uuid, _candidate_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _session public.exam_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _candidate_id THEN
    RETURN jsonb_build_object('success',false,'reason','forbidden');
  END IF;
  IF NOT public.is_master_admin(_candidate_id) AND NOT EXISTS (SELECT 1 FROM public.exam_access ea WHERE ea.user_id=_candidate_id AND ea.allowed) THEN
    RETURN jsonb_build_object('success',false,'reason','not_allowed');
  END IF;
  SELECT * INTO _session FROM public.exam_sessions WHERE id=_session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','session_not_found'); END IF;
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
$$;

CREATE INDEX IF NOT EXISTS exam_results_session_created_idx ON public.exam_results(session_id, created_at DESC);
