CREATE OR REPLACE FUNCTION public.reconcile_rubric_report(_report jsonb, _rubric jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  _definitions jsonb; _old_items jsonb; _items jsonb := '[]'::jsonb;
  _definition jsonb; _old jsonb; _item jsonb; _text text;
  _max numeric; _old_max numeric; _earned numeric; _coverage text;
  _total numeric := 0; _possible numeric := 0; _critical_fail boolean := false; _pending boolean := false; _score integer;
BEGIN
  IF _report IS NULL OR jsonb_typeof(_report) <> 'object' OR jsonb_typeof(_report->'items') <> 'array' THEN RETURN _report; END IF;
  _definitions := CASE WHEN jsonb_typeof(_rubric) = 'array' THEN _rubric WHEN jsonb_typeof(_rubric->'items') = 'array' THEN _rubric->'items' ELSE NULL END;
  IF _definitions IS NULL THEN RETURN _report; END IF;
  _old_items := _report->'items';
  FOR _definition IN SELECT value FROM jsonb_array_elements(_definitions) LOOP
    _text := CASE WHEN jsonb_typeof(_definition) = 'string' THEN _definition #>> '{}' ELSE coalesce(_definition->>'text', _definition->>'item_text', _definition->>'item', '') END;
    _max := greatest(0, coalesce((_definition->>'points')::numeric, (_definition->>'point_value')::numeric, 10));
    SELECT value INTO _old FROM jsonb_array_elements(_old_items)
    WHERE (nullif(_definition->>'id', '') IS NOT NULL AND value->>'rubricItemId' = _definition->>'id')
       OR btrim(value->>'item') = btrim(_text)
    ORDER BY CASE WHEN nullif(_definition->>'id', '') IS NOT NULL AND value->>'rubricItemId' = _definition->>'id' THEN 0 ELSE 1 END LIMIT 1;
    IF _old IS NULL THEN
      _earned := 0; _coverage := 'none'; _pending := true;
      _item := jsonb_build_object('comment', 'Butir baru atau berubah; belum dinilai.', 'pendingAssessment', true);
    ELSE
      _old_max := greatest(0, coalesce((_old->>'maxPoints')::numeric, 2));
      _earned := coalesce((_old->>'points')::numeric,
        CASE WHEN _old->>'coverage' = 'full' THEN _old_max WHEN _old->>'coverage' = 'partial' THEN _old_max / 2 WHEN coalesce((_old->>'passed')::boolean, false) THEN _old_max ELSE 0 END);
      IF coalesce((_old->>'manualOverride')::boolean, false) THEN
        _earned := least(_max, greatest(0, _earned));
      ELSE
        _earned := CASE WHEN _old_max > 0 THEN round(least(1, greatest(0, _earned / _old_max)) * _max, 4) ELSE 0 END;
      END IF;
      _item := _old;
      _pending := _pending OR coalesce((_old->>'pendingAssessment')::boolean, false);
    END IF;
    _coverage := CASE WHEN _earned <= 0 THEN 'none' WHEN _earned >= _max THEN 'full' ELSE 'partial' END;
    _item := _item || jsonb_build_object('item', _text, 'points', _earned, 'maxPoints', _max,
      'coverage', _coverage, 'passed', _earned > 0,
      'isCritical', coalesce((_definition->>'isCritical')::boolean, (_definition->>'is_critical')::boolean, (_definition->>'critical')::boolean, false));
    IF nullif(_definition->>'id', '') IS NOT NULL THEN _item := _item || jsonb_build_object('rubricItemId', _definition->>'id'); END IF;
    _critical_fail := _critical_fail OR (coalesce((_item->>'isCritical')::boolean, false) AND _earned <= 0 AND _max > 0);
    _total := _total + _earned; _possible := _possible + _max;
    _items := _items || jsonb_build_array(_item);
  END LOOP;
  _score := CASE WHEN _possible > 0 THEN round(_total / _possible * 100)::integer ELSE 0 END;
  RETURN _report || jsonb_build_object('items', _items, 'totalScore', _total, 'totalPossible', _possible,
    'score', _score, 'hasCriticalFail', _critical_fail, 'pendingRubricAssessment', _pending,
    'passStatus', CASE WHEN _possible = 0 OR _pending THEN 'BELUM DINILAI' WHEN _score >= 68 AND NOT _critical_fail THEN 'LULUS' ELSE 'TIDAK LULUS' END);
END $$;
REVOKE ALL ON FUNCTION public.reconcile_rubric_report(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_rubric_report(jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_results_after_rubric_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _case_id uuid;
BEGIN
  _case_id := CASE WHEN TG_TABLE_NAME = 'case_answer_keys' THEN NEW.case_id ELSE NEW.id END;
  IF TG_OP = 'UPDATE' AND NEW.checklist_rubric IS NOT DISTINCT FROM OLD.checklist_rubric THEN RETURN NEW; END IF;
  UPDATE public.exam_results r SET ai_score_report = public.reconcile_rubric_report(r.ai_score_report, NEW.checklist_rubric)
  FROM public.exam_sessions s WHERE s.id = r.session_id AND s.case_id = _case_id
    AND jsonb_typeof(r.ai_score_report->'items') = 'array'
    AND r.ai_score_report IS DISTINCT FROM public.reconcile_rubric_report(r.ai_score_report, NEW.checklist_rubric);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_results_after_rubric_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_results_after_answer_key_rubric AFTER INSERT OR UPDATE OF checklist_rubric ON public.case_answer_keys FOR EACH ROW EXECUTE FUNCTION public.sync_results_after_rubric_change();
CREATE TRIGGER sync_results_after_case_rubric AFTER UPDATE OF checklist_rubric ON public.clinical_cases FOR EACH ROW EXECUTE FUNCTION public.sync_results_after_rubric_change();

CREATE OR REPLACE FUNCTION public.normalize_saved_exam_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rubric jsonb; _old_item jsonb; _items jsonb := '[]'::jsonb; _item jsonb;
BEGIN
  IF NEW.ai_score_report IS NULL OR jsonb_typeof(NEW.ai_score_report->'items') <> 'array' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND coalesce(auth.role(), '') <> 'authenticated' AND jsonb_typeof(OLD.ai_score_report->'items') = 'array' THEN
    FOR _item IN SELECT value FROM jsonb_array_elements(NEW.ai_score_report->'items') LOOP
      SELECT value INTO _old_item FROM jsonb_array_elements(OLD.ai_score_report->'items')
      WHERE coalesce((value->>'manualOverride')::boolean, false)
        AND ((nullif(_item->>'rubricItemId','') IS NOT NULL AND value->>'rubricItemId' = _item->>'rubricItemId') OR btrim(value->>'item') = btrim(_item->>'item')) LIMIT 1;
      _items := _items || jsonb_build_array(coalesce(_old_item, _item));
    END LOOP;
    NEW.ai_score_report := NEW.ai_score_report || jsonb_build_object('items', _items);
  END IF;
  SELECT coalesce(k.checklist_rubric, c.checklist_rubric) INTO _rubric
  FROM public.exam_sessions s JOIN public.clinical_cases c ON c.id = s.case_id
  LEFT JOIN public.case_answer_keys k ON k.case_id = c.id WHERE s.id = NEW.session_id;
  NEW.ai_score_report := public.reconcile_rubric_report(NEW.ai_score_report, _rubric);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.normalize_saved_exam_report() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER normalize_exam_report_before_save BEFORE INSERT OR UPDATE OF ai_score_report ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.normalize_saved_exam_report();