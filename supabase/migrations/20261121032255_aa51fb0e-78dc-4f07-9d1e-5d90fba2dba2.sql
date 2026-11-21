DROP FUNCTION IF EXISTS public.get_case_assets_for_display(uuid);
DROP FUNCTION IF EXISTS public.get_case_digital_properties(uuid);

CREATE OR REPLACE FUNCTION public.can_view_case_at_station(_case_id uuid, _station_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.exam_sessions s WHERE s.case_id = _case_id
               AND s.current_candidate_id = auth.uid() AND auth.uid() IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.exam_sessions s WHERE s.case_id = _case_id
               AND _station_token IS NOT NULL AND s.station_token = _station_token AND s.status = 'active')
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_case_at_station(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_case_assets_for_display(_case_id uuid, _station_token text DEFAULT NULL)
RETURNS TABLE(id uuid, asset_url text, asset_type text, trigger_keywords text[], category text, answer_text text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT ca.id, ca.asset_url, ca.asset_type, ca.trigger_keywords, ca.category, ca.answer_text
  FROM public.case_assets ca
  WHERE ca.case_id = _case_id AND public.can_view_case_at_station(_case_id, _station_token)
$$;

CREATE FUNCTION public.get_case_digital_properties(_case_id uuid, _station_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(ak.checklist_rubric->'digital_properties', '[]'::jsonb)
  FROM public.case_answer_keys ak
  WHERE ak.case_id = _case_id AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.exam_sessions s WHERE s.case_id = _case_id AND s.show_examiner_panel
       AND ((auth.uid() IS NOT NULL AND s.current_candidate_id = auth.uid())
         OR (_station_token IS NOT NULL AND s.station_token = _station_token AND s.status = 'active'))))
$$;
GRANT EXECUTE ON FUNCTION public.get_case_assets_for_display(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_case_digital_properties(uuid, text) TO anon, authenticated;

-- Only reveal the caller's own token; sibling tokens stay hidden.
CREATE OR REPLACE FUNCTION public.get_station_sequence_items(_station_token text)
RETURNS TABLE(deployment_id uuid, station_token text, sequence_order integer, session_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT i.deployment_id,
         CASE WHEN i.station_token = _station_token THEN i.station_token ELSE NULL END,
         i.sequence_order, i.session_id
  FROM public.exam_sequence_items i
  WHERE _station_token IS NOT NULL AND length(_station_token) >= 4
    AND i.deployment_id = (SELECT c.deployment_id FROM public.exam_sequence_items c WHERE c.station_token = _station_token LIMIT 1)
  ORDER BY i.sequence_order
$$;

-- Reset only allowed shortly after the sequence finished, so old tokens cannot be replayed.
CREATE OR REPLACE FUNCTION public.reset_window_open(_station_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((
    SELECT max(r.created_at) > now() - interval '6 hours'
    FROM public.exam_sequence_items own
    JOIN public.exam_sequence_items sib ON sib.deployment_id = own.deployment_id
    JOIN public.exam_results r ON r.session_id = sib.session_id
    WHERE own.station_token = _station_token), false)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
$$;
REVOKE EXECUTE ON FUNCTION public.reset_window_open(text) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE _def text;
BEGIN
  SELECT pg_get_functiondef('public.reset_completed_station_sequence(text,text[])'::regprocedure) INTO _def;
  _def := regexp_replace(_def,
    '(station sequence not found''\s*;\s*END IF\s*;)',
    E'\\1\n  IF NOT public.reset_window_open(_station_token) THEN RAISE EXCEPTION ''station reset window expired'' USING ERRCODE = ''42501''; END IF;');
  IF position('reset_window_open' in _def) = 0 THEN RAISE EXCEPTION 'patch failed'; END IF;
  EXECUTE _def;
END $$;