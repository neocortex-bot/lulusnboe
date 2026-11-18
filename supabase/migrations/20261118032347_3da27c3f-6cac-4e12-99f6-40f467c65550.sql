CREATE OR REPLACE FUNCTION public.is_deployment_participant(_deployment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exam_sequence_items i
    JOIN public.exam_sessions s ON s.id = i.session_id
    WHERE i.deployment_id = _deployment_id AND s.current_candidate_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.get_station_sequence_items(_station_token text)
RETURNS TABLE(deployment_id uuid, station_token text, sequence_order integer, session_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.deployment_id, i.station_token, i.sequence_order, i.session_id
  FROM public.exam_sequence_items i
  WHERE i.deployment_id = (SELECT c.deployment_id FROM public.exam_sequence_items c WHERE c.station_token = _station_token LIMIT 1)
  ORDER BY i.sequence_order
$$;
GRANT EXECUTE ON FUNCTION public.get_station_sequence_items(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public read sequence items" ON public.exam_sequence_items;
CREATE POLICY "Participants read own deployment items" ON public.exam_sequence_items
  FOR SELECT TO authenticated USING (public.is_deployment_participant(deployment_id));

DROP POLICY IF EXISTS "Authenticated can upload exam audio" ON storage.objects;
CREATE POLICY "Candidates upload own exam audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exam-audio' AND split_part(name, '_', 2) = (select auth.uid()::text));