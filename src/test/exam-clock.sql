-- Isolated session fixtures are rolled back; existing exams are untouched.
DO $test$
DECLARE
 _session uuid := gen_random_uuid(); _candidate uuid; _case uuid;
 _reading timestamptz; _answer timestamptz; _retry timestamptz;
 _token text := gen_random_uuid()::text; _n integer;
BEGIN
 SELECT user_id INTO _candidate FROM public.user_roles WHERE role='admin' LIMIT 1;
 SELECT id INTO _case FROM public.clinical_cases LIMIT 1;
 IF _candidate IS NULL OR _case IS NULL THEN RAISE EXCEPTION 'Fixtures require an existing account and case'; END IF;
 BEGIN
  INSERT INTO public.exam_sessions(id,case_id,station_token,status) VALUES (_session,_case,_token,'waiting');
  UPDATE public.exam_sessions SET current_candidate_id=_candidate,status='active' WHERE id=_session;
  SELECT reading_started_at INTO _reading FROM public.exam_sessions WHERE id=_session;
  IF _reading IS NULL OR abs(extract(epoch FROM clock_timestamp()-_reading))>2 THEN RAISE EXCEPTION 'Reading is not anchored to server'; END IF;
  UPDATE public.exam_sessions SET reading_started_at=_reading+interval '2 minutes' WHERE id=_session;
  IF (SELECT reading_started_at FROM public.exam_sessions WHERE id=_session)<>_reading THEN RAISE EXCEPTION 'Reading reset by device'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',_candidate)::text,true);
  SET LOCAL ROLE authenticated;
  IF public.start_exam_reading_timer(_session)<>_reading THEN RAISE EXCEPTION 'Reading retry changed start'; END IF;
  _answer := public.start_exam_timer(_session);
  _retry := public.start_exam_timer(_session);
  IF _answer IS NULL OR _answer<>_retry THEN RAISE EXCEPTION 'Answer retry changed start'; END IF;
  RESET ROLE;
  UPDATE public.exam_sessions SET session_start_time=_answer+interval '2 minutes' WHERE id=_session;
  IF (SELECT session_start_time FROM public.exam_sessions WHERE id=_session)<>_answer THEN RAISE EXCEPTION 'Device skew replaced answer start'; END IF;
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO _n FROM public.get_exam_timing(_session,'wrong-token');
  IF _n<>0 THEN RAISE EXCEPTION 'Wrong token read timing'; END IF;
  SELECT count(*) INTO _n FROM public.get_exam_timing(_session,_token) WHERE reading_started_at=_reading AND session_start_time=_answer;
  IF _n<>1 THEN RAISE EXCEPTION 'Monitor differs from candidate'; END IF;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000000"}',true);
  SET LOCAL ROLE authenticated;
  BEGIN
   PERFORM public.start_exam_timer(_session);
   RAISE EXCEPTION 'Other candidate could start timer';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE EXCEPTION 'rollback clock fixture' USING ERRCODE='Z0001';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.exam_sessions WHERE id=_session) THEN RAISE EXCEPTION 'Fixture remains'; END IF;
END;
$test$;