INSERT INTO public.case_answer_keys (case_id, answer_key_text, checklist_rubric)
SELECT cc.id, COALESCE(cc.answer_key_text, ''), jsonb_build_object('properties', to_jsonb(cc.properties))
FROM public.clinical_cases cc
WHERE cardinality(cc.properties) > 0
  AND NOT EXISTS (SELECT 1 FROM public.case_answer_keys ak WHERE ak.case_id = cc.id)
ON CONFLICT (case_id) DO NOTHING;

UPDATE public.case_answer_keys ak
SET checklist_rubric = jsonb_set(COALESCE(ak.checklist_rubric, '{}'::jsonb), '{properties}', (
  SELECT jsonb_agg(v ORDER BY ord) FROM (
    SELECT v, min(ord) ord FROM (
      SELECT to_jsonb(p) v, o ord FROM unnest(cc.properties) WITH ORDINALITY u(p, o)
      UNION ALL
      SELECT e, 100000 + o FROM jsonb_array_elements(COALESCE(ak.checklist_rubric->'properties','[]'::jsonb)) WITH ORDINALITY j(e, o)
    ) a GROUP BY v
  ) b), true)
FROM public.clinical_cases cc
WHERE ak.case_id = cc.id AND cardinality(cc.properties) > 0;