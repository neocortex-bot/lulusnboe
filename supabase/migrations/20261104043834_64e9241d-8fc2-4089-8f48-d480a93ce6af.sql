CREATE OR REPLACE FUNCTION public.rubric_text_head(_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(btrim(regexp_replace(regexp_replace(split_part(coalesce(_text, ''), E'\n', 1), '\s*SKOR\s*:.*$', '', 'i'), '\s+', ' ', 'g')))
$$;
REVOKE ALL ON FUNCTION public.rubric_text_head(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rubric_text_head(text) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_rubric_report(_report jsonb, _rubric jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  _definitions jsonb; _old_items jsonb; _items jsonb := '[]'::jsonb;
  _definition jsonb; _old jsonb; _item jsonb; _text text; _def_id text; _pos integer;
  _old_idx integer; _used integer[] := '{}'; _claimed integer[] := '{}';
  _max numeric; _old_max numeric; _earned numeric; _coverage text;
  _total numeric := 0; _possible numeric := 0; _critical_fail boolean := false; _pending boolean := false; _score integer;
BEGIN
  IF _report IS NULL OR jsonb_typeof(_report) <> 'object' OR jsonb_typeof(_report->'items') <> 'array' THEN RETURN _report; END IF;
  _definitions := CASE WHEN jsonb_typeof(_rubric) = 'array' THEN _rubric WHEN jsonb_typeof(_rubric->'items') = 'array' THEN _rubric->'items' ELSE NULL END;
  IF _definitions IS NULL THEN RETURN _report; END IF;
  _old_items := _report->'items';

  -- Old items that some current definition claims by id, exact text, or text head.
  SELECT coalesce(array_agg(DISTINCT o.ord::integer), '{}') INTO _claimed
  FROM jsonb_array_elements(_old_items) WITH ORDINALITY o(value, ord)
  JOIN jsonb_array_elements(_definitions) d(value) ON
       (nullif(d.value->>'id','') IS NOT NULL AND o.value->>'rubricItemId' = d.value->>'id')
    OR btrim(o.value->>'item') = btrim(CASE WHEN jsonb_typeof(d.value)='string' THEN d.value #>> '{}' ELSE coalesce(d.value->>'text', d.value->>'item_text', d.value->>'item','') END)
    OR (public.rubric_text_head(o.value->>'item') <> '' AND public.rubric_text_head(o.value->>'item') = public.rubric_text_head(CASE WHEN jsonb_typeof(d.value)='string' THEN d.value #>> '{}' ELSE coalesce(d.value->>'text', d.value->>'item_text', d.value->>'item','') END));

  _pos := 0;
  FOR _definition IN SELECT value FROM jsonb_array_elements(_definitions) LOOP
    _pos := _pos + 1;
    _text := CASE WHEN jsonb_typeof(_definition) = 'string' THEN _definition #>> '{}' ELSE coalesce(_definition->>'text', _definition->>'item_text', _definition->>'item', '') END;
    _def_id := nullif(_definition->>'id', '');
    _max := greatest(0, coalesce((_definition->>'points')::numeric, (_definition->>'point_value')::numeric, 10));
    _old := NULL; _old_idx := NULL;

    -- 1) stable id, 2) exact text, 3) same text head (before SKOR), 4) same position for an edited item
    SELECT o.value, o.ord INTO _old, _old_idx FROM jsonb_array_elements(_old_items) WITH ORDINALITY o(value, ord)
    WHERE NOT (o.ord::integer = ANY(_used)) AND (
         (_def_id IS NOT NULL AND o.value->>'rubricItemId' = _def_id)
      OR btrim(o.value->>'item') = btrim(_text)
      OR (public.rubric_text_head(_text) <> '' AND public.rubric_text_head(o.value->>'item') = public.rubric_text_head(_text)))
    ORDER BY CASE WHEN _def_id IS NOT NULL AND o.value->>'rubricItemId' = _def_id THEN 0
                  WHEN btrim(o.value->>'item') = btrim(_text) THEN 1 ELSE 2 END, o.ord
    LIMIT 1;

    IF _old IS NULL THEN
      SELECT o.value, o.ord INTO _old, _old_idx FROM jsonb_array_elements(_old_items) WITH ORDINALITY o(value, ord)
      WHERE o.ord = _pos AND NOT (o.ord::integer = ANY(_used)) AND NOT (o.ord::integer = ANY(_claimed))
        AND NOT coalesce((o.value->>'pendingAssessment')::boolean, false)
        AND (nullif(o.value->>'rubricItemId','') IS NULL OR _def_id IS NULL OR o.value->>'rubricItemId' = _def_id);
    END IF;

    IF _old IS NULL THEN
      _earned := 0; _pending := true;
      _item := jsonb_build_object('comment', 'Butir baru; belum dinilai.', 'pendingAssessment', true);
    ELSE
      _used := _used || _old_idx;
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
    IF _def_id IS NOT NULL THEN _item := _item || jsonb_build_object('rubricItemId', _def_id); END IF;
    _critical_fail := _critical_fail OR (coalesce((_item->>'isCritical')::boolean, false) AND _earned <= 0 AND _max > 0 AND NOT coalesce((_item->>'pendingAssessment')::boolean, false));
    _total := _total + _earned; _possible := _possible + _max;
    _items := _items || jsonb_build_array(_item);
  END LOOP;
  _score := CASE WHEN _possible > 0 THEN round(_total / _possible * 100)::integer ELSE 0 END;
  RETURN _report || jsonb_build_object('items', _items, 'totalScore', _total, 'totalPossible', _possible,
    'score', _score, 'hasCriticalFail', _critical_fail, 'pendingRubricAssessment', _pending,
    'passStatus', CASE WHEN _possible = 0 THEN 'BELUM DINILAI' WHEN _score >= 68 AND NOT _critical_fail THEN 'LULUS' ELSE 'TIDAK LULUS' END);
END $$;
REVOKE ALL ON FUNCTION public.reconcile_rubric_report(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_rubric_report(jsonb,jsonb) TO service_role;