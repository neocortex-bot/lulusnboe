CREATE OR REPLACE FUNCTION public.sync_results_after_rubric_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _case_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'case_answer_keys' THEN
    _case_id := (to_jsonb(NEW)->>'case_id')::uuid;
  ELSE
    _case_id := (to_jsonb(NEW)->>'id')::uuid;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.checklist_rubric IS NOT DISTINCT FROM OLD.checklist_rubric THEN RETURN NEW; END IF;
  UPDATE public.exam_results r SET ai_score_report = public.reconcile_rubric_report(r.ai_score_report, NEW.checklist_rubric)
  FROM public.exam_sessions s WHERE s.id = r.session_id AND s.case_id = _case_id
    AND jsonb_typeof(r.ai_score_report->'items') = 'array'
    AND r.ai_score_report IS DISTINCT FROM public.reconcile_rubric_report(r.ai_score_report, NEW.checklist_rubric);
  RETURN NEW;
END $function$;

UPDATE public.case_answer_keys k SET checklist_rubric = jsonb_set(k.checklist_rubric, '{items}',
  (SELECT jsonb_agg(CASE WHEN (i->>'points')::numeric > 2 THEN i || '{"points":2}'::jsonb ELSE i END ORDER BY ord)
   FROM jsonb_array_elements(k.checklist_rubric->'items') WITH ORDINALITY t(i, ord)))
WHERE jsonb_typeof(k.checklist_rubric->'items') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(k.checklist_rubric->'items') i WHERE (i->>'points')::numeric > 2);

UPDATE public.clinical_cases c SET checklist_rubric = jsonb_set(c.checklist_rubric, '{items}',
  (SELECT jsonb_agg(CASE WHEN (i->>'points')::numeric > 2 THEN i || '{"points":2}'::jsonb ELSE i END ORDER BY ord)
   FROM jsonb_array_elements(c.checklist_rubric->'items') WITH ORDINALITY t(i, ord)))
WHERE jsonb_typeof(c.checklist_rubric->'items') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.checklist_rubric->'items') i WHERE (i->>'points')::numeric > 2);