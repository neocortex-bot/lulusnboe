DROP FUNCTION public.get_station_waiting_state(text);
DROP FUNCTION public.get_session_by_token(text);
CREATE FUNCTION public.get_session_by_token(_token text)
RETURNS TABLE(id uuid, case_id uuid, status text, session_start_time timestamptz, sequence_order integer, sequence_total bigint, deployment_id uuid, show_examiner_panel boolean, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT es.id, es.case_id,
 CASE WHEN public.exam_waiting_deadline(es.id) <= statement_timestamp() THEN 'expired' ELSE es.status END,
 es.session_start_time, esi.sequence_order,
 CASE WHEN esi.deployment_id IS NULL THEN NULL ELSE (SELECT count(*) FROM public.exam_sequence_items grouped WHERE grouped.deployment_id=esi.deployment_id) END,
 esi.deployment_id, es.show_examiner_panel, public.exam_waiting_deadline(es.id)
 FROM public.exam_sessions es LEFT JOIN public.exam_sequence_items esi ON esi.session_id=es.id AND esi.station_token=es.station_token
 WHERE es.station_token=_token ORDER BY esi.sequence_order NULLS LAST,es.id LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_session_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_by_token(text) TO anon, authenticated, service_role;