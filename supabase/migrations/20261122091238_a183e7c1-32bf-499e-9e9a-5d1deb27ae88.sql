DO $$
DECLARE _def text;
BEGIN
  SELECT pg_get_functiondef('public.reset_completed_station_sequence(text,text[])'::regprocedure) INTO _def;
  _def := replace(_def, chr(13), '');
  _def := replace(_def, 'session.show_results_to_candidate_override' || chr(10) || '    FROM public.exam_sequence_items item', 'session.show_results_to_candidate_override, session.examiner_id, session.show_examiner_panel' || chr(10) || '    FROM public.exam_sequence_items item');
  _def := replace(_def, '      show_results_to_candidate_override' || chr(10) || '    )', '      show_results_to_candidate_override, examiner_id, show_examiner_panel' || chr(10) || '    )');
  _def := replace(_def, '      _source.show_results_to_candidate_override' || chr(10) || '    )', '      _source.show_results_to_candidate_override, _source.examiner_id, _source.show_examiner_panel' || chr(10) || '    )');
  IF position('_source.examiner_id' in _def)=0 OR position('session.examiner_id' in _def)=0 OR position('reset_window_open' in _def)=0 THEN RAISE EXCEPTION 'reset inheritance patch failed'; END IF;
  EXECUTE _def;

  SELECT pg_get_functiondef('public.advance_station_sequence(text,integer)'::regprocedure) INTO _def;
  _def := replace(_def, chr(13), '');
  _def := replace(_def, '  _new_session_id uuid;', '  _new_session_id uuid;' || chr(10) || '  _source_session public.exam_sessions%ROWTYPE;');
  _def := replace(_def, '  SELECT COALESCE(bool_or(es.show_results_to_candidate_override), false)', '  SELECT * INTO _source_session FROM public.exam_sessions WHERE id = _current_item.session_id;' || chr(10) || chr(10) || '  SELECT COALESCE(bool_or(es.show_results_to_candidate_override), false)');
  _def := replace(_def, '    show_results_to_candidate_override' || chr(10) || '  )', '    show_results_to_candidate_override, examiner_id, show_examiner_panel' || chr(10) || '  )');
  _def := replace(_def, '    _deployment_override' || chr(10) || '  )', '    _deployment_override, _source_session.examiner_id, COALESCE(_source_session.show_examiner_panel, false)' || chr(10) || '  )');
  -- Repair a missing examiner on an existing next session, never replace an explicitly assigned examiner.
  _def := replace(_def, '      RETURN QUERY SELECT' || chr(10) || '        _existing.id', '      IF _existing.examiner_id IS NULL AND _source_session.examiner_id IS NOT NULL THEN' || chr(10) || '        UPDATE public.exam_sessions SET examiner_id = _source_session.examiner_id WHERE id = _existing.id AND examiner_id IS NULL;' || chr(10) || '      END IF;' || chr(10) || '      RETURN QUERY SELECT' || chr(10) || '        _existing.id');
  _def := replace(_def, '    UPDATE public.exam_sequence_items' || chr(10) || '    SET session_id = _existing.id', '    IF _existing.examiner_id IS NULL AND _source_session.examiner_id IS NOT NULL THEN' || chr(10) || '      UPDATE public.exam_sessions SET examiner_id = _source_session.examiner_id WHERE id = _existing.id AND examiner_id IS NULL;' || chr(10) || '    END IF;' || chr(10) || '    UPDATE public.exam_sequence_items' || chr(10) || '    SET session_id = _existing.id');
  IF position('_source_session.examiner_id' in _def)=0 OR position('COALESCE(_source_session.show_examiner_panel, false)' in _def)=0 THEN RAISE EXCEPTION 'advance inheritance patch failed'; END IF;
  EXECUTE _def;
END $$;

CREATE OR REPLACE FUNCTION public.regenerate_station_session(_case_id uuid, _new_token text, _previous_station_token text)
RETURNS TABLE(id uuid, case_id uuid, status text, session_start_time timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _source public.exam_sessions%ROWTYPE;
BEGIN
  IF _previous_station_token IS NULL OR btrim(_new_token) = '' OR _new_token IS NULL THEN RAISE EXCEPTION 'station tokens required'; END IF;
  SELECT * INTO _source FROM public.exam_sessions s
  WHERE s.station_token = _previous_station_token AND s.case_id = _case_id FOR UPDATE;
  IF NOT FOUND OR _source.status NOT IN ('completed', 'force_closed') THEN
    RAISE EXCEPTION 'completed source station required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  INSERT INTO public.exam_sessions(case_id,station_token,status,show_results_to_candidate_override,examiner_id,show_examiner_panel)
  VALUES(_case_id,_new_token,'waiting',_source.show_results_to_candidate_override,_source.examiner_id,_source.show_examiner_panel)
  RETURNING exam_sessions.id,exam_sessions.case_id,exam_sessions.status::text,exam_sessions.session_start_time;
END $$;
REVOKE ALL ON FUNCTION public.regenerate_station_session(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_station_session(uuid,text,text) TO anon,authenticated,service_role;