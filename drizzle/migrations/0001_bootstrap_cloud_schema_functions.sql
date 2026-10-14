CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND lower(email) = 'izzan.rijal@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_case(_user_id uuid, _case_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinical_cases
    WHERE id = _case_id AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_case_display(_case_id uuid)
RETURNS TABLE(title text, initial_prompt text, time_limit_seconds integer, questions_text text, reading_time_seconds integer, show_results_to_candidate boolean, exam_mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT cc.title, cc.initial_prompt, cc.time_limit_seconds, cc.questions_text,
         cc.reading_time_seconds, cc.show_results_to_candidate, cc.exam_mode
  FROM clinical_cases cc WHERE cc.id = _case_id
$$;

CREATE OR REPLACE FUNCTION public.get_case_assets_for_display(_case_id uuid)
RETURNS TABLE(id uuid, asset_url text, asset_type text, trigger_keywords text[], category text, answer_text text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT ca.id, ca.asset_url, ca.asset_type, ca.trigger_keywords, ca.category, ca.answer_text
  FROM case_assets ca WHERE ca.case_id = _case_id
$$;

CREATE OR REPLACE FUNCTION public.get_session_by_token(_token text)
RETURNS TABLE(
  id uuid,
  case_id uuid,
  status text,
  session_start_time timestamptz,
  sequence_order integer,
  sequence_total bigint,
  deployment_id uuid
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
         esi.deployment_id
  FROM public.exam_sessions es
  LEFT JOIN public.exam_sequence_items esi
    ON esi.session_id = es.id
   AND esi.station_token = es.station_token
  WHERE es.station_token = _token
  ORDER BY esi.sequence_order NULLS LAST, es.id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.regenerate_station_session(
  _case_id uuid,
  _new_token text
)
RETURNS TABLE(id uuid, case_id uuid, status text, session_start_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.exam_sessions (case_id, station_token, status)
  VALUES (_case_id, _new_token, 'waiting')
  RETURNING exam_sessions.id, exam_sessions.case_id, exam_sessions.status::text, exam_sessions.session_start_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_exam_timer(_session_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _now timestamptz := now();
BEGIN
  UPDATE exam_sessions
  SET session_start_time = _now
  WHERE id = _session_id AND current_candidate_id IS NOT NULL AND session_start_time IS NULL;

  IF NOT FOUND THEN
    -- Already started or invalid session
    SELECT session_start_time INTO _now FROM exam_sessions WHERE id = _session_id;
  END IF;

  RETURN _now;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_exam_session(
  _session_id uuid,
  _candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _session public.exam_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _candidate_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
  END IF;

  -- The row lock serializes an original claim and a retry whose first response
  -- was lost. A claim by the same candidate is successful and idempotent.
  SELECT * INTO _session
  FROM public.exam_sessions
  WHERE id = _session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'session_not_found');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.exam_results er
    WHERE er.candidate_id = _candidate_id
      AND er.session_id = _session_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'duplicate');
  END IF;

  IF _session.current_candidate_id = _candidate_id THEN
    RETURN jsonb_build_object('success', true, 'outcome', 'reused');
  END IF;

  IF _session.current_candidate_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  IF _session.status IN ('completed', 'force_closed') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'session_unavailable');
  END IF;

  UPDATE public.exam_sessions
  SET current_candidate_id = _candidate_id,
      status = 'active'
  WHERE id = _session_id;

  RETURN jsonb_build_object('success', true, 'outcome', 'claimed');
END;
$function$;

CREATE OR REPLACE FUNCTION public.advance_station_sequence(
  _station_token text,
  _completed_sequence_order integer
)
RETURNS TABLE(
  next_id uuid,
  next_case_id uuid,
  next_status text,
  next_session_start_time timestamptz,
  next_sequence_order integer,
  next_is_last boolean,
  next_station_token text,
  outcome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_item public.exam_sequence_items%ROWTYPE;
  _next_item public.exam_sequence_items%ROWTYPE;
  _existing public.exam_sessions%ROWTYPE;
  _new_session_id uuid;
  _deployment_override boolean := false;
BEGIN
  -- Serialize both mobile and station callers on the completed item first.
  SELECT * INTO _current_item
  FROM public.exam_sequence_items
  WHERE station_token = _station_token
  FOR UPDATE;

  IF NOT FOUND OR _current_item.sequence_order <> _completed_sequence_order THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::uuid, NULL::text, NULL::timestamptz,
      NULL::integer, false, NULL::text, 'invalid_order'::text;
    RETURN;
  END IF;

  SELECT COALESCE(bool_or(es.show_results_to_candidate_override), false)
  INTO _deployment_override
  FROM public.exam_sequence_items grouped
  LEFT JOIN public.exam_sessions es ON es.id = grouped.session_id
  WHERE grouped.deployment_id = _current_item.deployment_id;

  -- Do not assume sequence numbers are gapless. If any later item exists, it
  -- is the next question and must not be reported as completed.
  SELECT * INTO _next_item
  FROM public.exam_sequence_items
  WHERE deployment_id = _current_item.deployment_id
    AND sequence_order > _current_item.sequence_order
  ORDER BY sequence_order
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::uuid, NULL::text, NULL::timestamptz,
      NULL::integer, true, NULL::text, 'completed'::text;
    RETURN;
  END IF;

  IF _next_item.session_id IS NOT NULL THEN
    SELECT * INTO _existing
    FROM public.exam_sessions
    WHERE id = _next_item.session_id;

    IF FOUND THEN
      IF _deployment_override AND NOT _existing.show_results_to_candidate_override THEN
        UPDATE public.exam_sessions
        SET show_results_to_candidate_override = true
        WHERE id = _existing.id;
        _existing.show_results_to_candidate_override := true;
      END IF;

      RETURN QUERY SELECT
        _existing.id, _existing.case_id, _existing.status,
        _existing.session_start_time, _next_item.sequence_order,
        (_next_item.sequence_order = (
          SELECT max(last_item.sequence_order)
          FROM public.exam_sequence_items last_item
          WHERE last_item.deployment_id = _current_item.deployment_id
        )),
        _next_item.station_token, 'reused'::text;
      RETURN;
    END IF;
  END IF;

  -- Repair a partially-linked deployment without creating a duplicate token.
  SELECT * INTO _existing
  FROM public.exam_sessions
  WHERE station_token = _next_item.station_token;

  IF FOUND THEN
    IF _deployment_override AND NOT _existing.show_results_to_candidate_override THEN
      UPDATE public.exam_sessions
      SET show_results_to_candidate_override = true
      WHERE id = _existing.id;
      _existing.show_results_to_candidate_override := true;
    END IF;

    UPDATE public.exam_sequence_items
    SET session_id = _existing.id
    WHERE id = _next_item.id;

    RETURN QUERY SELECT
      _existing.id, _existing.case_id, _existing.status,
      _existing.session_start_time, _next_item.sequence_order,
      (_next_item.sequence_order = (
        SELECT max(last_item.sequence_order)
        FROM public.exam_sequence_items last_item
        WHERE last_item.deployment_id = _current_item.deployment_id
      )),
      _next_item.station_token, 'reused'::text;
    RETURN;
  END IF;

  INSERT INTO public.exam_sessions (
    case_id,
    station_token,
    status,
    show_results_to_candidate_override
  )
  VALUES (
    _next_item.case_id,
    _next_item.station_token,
    'waiting',
    _deployment_override
  )
  RETURNING id INTO _new_session_id;

  UPDATE public.exam_sequence_items
  SET session_id = _new_session_id
  WHERE id = _next_item.id;

  RETURN QUERY SELECT
    _new_session_id, _next_item.case_id, 'waiting'::text,
    NULL::timestamptz, _next_item.sequence_order,
    (_next_item.sequence_order = (
      SELECT max(last_item.sequence_order)
      FROM public.exam_sequence_items last_item
      WHERE last_item.deployment_id = _current_item.deployment_id
    )),
    _next_item.station_token, 'advanced'::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_completed_station_sequence(
  _station_token text,
  _new_tokens text[]
)
RETURNS TABLE(
  id uuid,
  case_id uuid,
  status text,
  session_start_time timestamptz,
  station_token text,
  deployment_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_item public.exam_sequence_items%ROWTYPE;
  _source record;
  _existing_reset public.station_deployment_resets%ROWTYPE;
  _new_deployment_id uuid := gen_random_uuid();
  _new_session_id uuid;
  _first_session_id uuid;
  _first_case_id uuid;
  _first_token text;
  _item_count integer;
  _token_count integer;
  _token_index integer := 0;
BEGIN
  -- This lock serializes a countdown/click race and requests from another tab.
  SELECT * INTO _current_item
  FROM public.exam_sequence_items
  WHERE exam_sequence_items.station_token = _station_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'station sequence not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.exam_sequence_items later
    WHERE later.deployment_id = _current_item.deployment_id
      AND later.sequence_order > _current_item.sequence_order
  ) THEN
    RAISE EXCEPTION 'station sequence is not complete';
  END IF;

  -- Return the same reset on retry instead of creating another deployment.
  SELECT * INTO _existing_reset
  FROM public.station_deployment_resets reset_mapping
  WHERE reset_mapping.completed_deployment_id = _current_item.deployment_id;

  IF FOUND THEN
    RETURN QUERY
    SELECT session.id,
           session.case_id,
           session.status,
           session.session_start_time,
           session.station_token,
           _existing_reset.next_deployment_id
    FROM public.exam_sessions session
    WHERE session.id = _existing_reset.next_session_id;
    RETURN;
  END IF;

  SELECT count(*) INTO _item_count
  FROM public.exam_sequence_items item
  WHERE item.deployment_id = _current_item.deployment_id;

  _token_count := COALESCE(array_length(_new_tokens, 1), 0);
  IF _token_count <> _item_count
     OR EXISTS (
       SELECT 1
       FROM unnest(_new_tokens) AS supplied(token)
       WHERE supplied.token IS NULL OR btrim(supplied.token) = ''
     )
     OR (
       SELECT count(DISTINCT supplied.token)
       FROM unnest(_new_tokens) AS supplied(token)
     ) <> _item_count THEN
    RAISE EXCEPTION 'one distinct station token is required for every sequence item';
  END IF;

  -- A reset is allowed only after every question session is terminal.
  IF EXISTS (
    SELECT 1
    FROM public.exam_sequence_items item
    LEFT JOIN public.exam_sessions session ON session.id = item.session_id
    WHERE item.deployment_id = _current_item.deployment_id
      AND (session.id IS NULL OR session.status NOT IN ('completed', 'force_closed'))
  ) THEN
    RAISE EXCEPTION 'all station sessions must be completed before reset';
  END IF;

  FOR _source IN
    SELECT item.case_id,
           item.sequence_order,
           session.show_results_to_candidate_override
    FROM public.exam_sequence_items item
    JOIN public.exam_sessions session ON session.id = item.session_id
    WHERE item.deployment_id = _current_item.deployment_id
    ORDER BY item.sequence_order, item.id
  LOOP
    _token_index := _token_index + 1;

    INSERT INTO public.exam_sessions (
      case_id,
      station_token,
      status,
      show_results_to_candidate_override
    )
    VALUES (
      _source.case_id,
      _new_tokens[_token_index],
      'waiting',
      _source.show_results_to_candidate_override
    )
    RETURNING exam_sessions.id INTO _new_session_id;

    INSERT INTO public.exam_sequence_items (
      deployment_id,
      station_token,
      case_id,
      sequence_order,
      session_id
    )
    VALUES (
      _new_deployment_id,
      _new_tokens[_token_index],
      _source.case_id,
      _source.sequence_order,
      _new_session_id
    );

    IF _first_session_id IS NULL THEN
      _first_session_id := _new_session_id;
      _first_case_id := _source.case_id;
      _first_token := _new_tokens[_token_index];
    END IF;
  END LOOP;

  INSERT INTO public.station_deployment_resets (
    completed_deployment_id,
    next_deployment_id,
    next_session_id,
    next_station_token
  )
  VALUES (
    _current_item.deployment_id,
    _new_deployment_id,
    _first_session_id,
    _first_token
  );

  RETURN QUERY SELECT
    _first_session_id,
    _first_case_id,
    'waiting'::text,
    NULL::timestamptz,
    _first_token,
    _new_deployment_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_master_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_case(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_case_display(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_case_assets_for_display(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_session_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_exam_timer(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_exam_session(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advance_station_sequence(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.regenerate_station_session(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_completed_station_sequence(text, text[]) TO anon, authenticated, service_role;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sequence_items;