ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS show_examiner_panel boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_session_by_token(text);

CREATE FUNCTION public.get_session_by_token(_token text)
RETURNS TABLE(
  id uuid,
  case_id uuid,
  status text,
  session_start_time timestamptz,
  sequence_order integer,
  sequence_total bigint,
  deployment_id uuid,
  show_examiner_panel boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT es.id,
         es.case_id,
         es.status,
         es.session_start_time,
         esi.sequence_order,
         CASE
           WHEN esi.deployment_id IS NULL THEN NULL
           ELSE (
             SELECT count(*)
             FROM public.exam_sequence_items grouped
             WHERE grouped.deployment_id = esi.deployment_id
           )
         END AS sequence_total,
         esi.deployment_id,
         es.show_examiner_panel
  FROM public.exam_sessions es
  LEFT JOIN public.exam_sequence_items esi
    ON esi.session_id = es.id
   AND esi.station_token = es.station_token
  WHERE es.station_token = _token
  ORDER BY esi.sequence_order NULLS LAST, es.id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_case_digital_properties(_case_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT coalesce(ak.checklist_rubric->'digital_properties', '[]'::jsonb)
  FROM public.case_answer_keys ak
  WHERE ak.case_id = _case_id
$$;