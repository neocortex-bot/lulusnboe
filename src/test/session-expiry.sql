-- Run against the connected database; every fixture is rolled back.
BEGIN;
DO $$
DECLARE
  c uuid; candidate uuid; dep uuid := gen_random_uuid();
  fresh uuid := gen_random_uuid(); expired uuid := gen_random_uuid();
  reading uuid := gen_random_uuid(); next_question uuid := gen_random_uuid();
  started uuid := gen_random_uuid(); state text;
BEGIN
  SELECT id INTO c FROM public.clinical_cases LIMIT 1;
  SELECT id INTO candidate FROM public.profiles LIMIT 1;
  IF c IS NULL OR candidate IS NULL THEN RAISE EXCEPTION 'Test requires one case and profile'; END IF;
  INSERT INTO public.exam_sessions(id,case_id,station_token,status,created_at,current_candidate_id)
  VALUES
    (fresh,c,'expiry-test-'||fresh,'waiting',statement_timestamp()-interval '14 minutes 59 seconds',NULL),
    (expired,c,'expiry-test-'||expired,'waiting',statement_timestamp()-interval '15 minutes',NULL),
    (reading,c,'expiry-test-'||reading,'active',statement_timestamp()-interval '1 hour',candidate),
    (next_question,c,'expiry-test-'||next_question,'waiting',statement_timestamp()-interval '1 hour',NULL),
    (started,c,'expiry-test-'||started,'active',statement_timestamp()-interval '1 hour',candidate);
  INSERT INTO public.exam_sequence_items(deployment_id,station_token,case_id,sequence_order,session_id)
  VALUES(dep,'expiry-test-'||started,c,1,started),(dep,'expiry-test-'||next_question,c,2,next_question);

  SELECT status INTO state FROM public.get_session_by_token('expiry-test-'||fresh);
  IF state <> 'waiting' THEN RAISE EXCEPTION 'Must remain waiting before 15 minutes'; END IF;
  SELECT status INTO state FROM public.get_session_by_token('expiry-test-'||expired);
  IF state <> 'expired' THEN RAISE EXCEPTION 'Must expire at 15 minutes'; END IF;
  SELECT status INTO state FROM public.get_session_by_token('expiry-test-'||reading);
  IF state <> 'active' THEN RAISE EXCEPTION 'Must not expire reading'; END IF;
  SELECT status INTO state FROM public.get_session_by_token('expiry-test-'||next_question);
  IF state <> 'waiting' THEN RAISE EXCEPTION 'Must protect next question during active sequence'; END IF;

  UPDATE public.exam_sessions SET status='completed' WHERE id=started;
  INSERT INTO public.exam_results(session_id,candidate_id,created_at) VALUES(started,candidate,statement_timestamp());
  SELECT status INTO state FROM public.get_session_by_token('expiry-test-'||next_question);
  IF state <> 'waiting' THEN RAISE EXCEPTION 'Must allow next question for 15 minutes after result'; END IF;

  BEGIN
    UPDATE public.exam_sessions SET status='active',current_candidate_id=candidate WHERE id=expired;
    RAISE EXCEPTION 'Expired direct claim was allowed';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM = 'Expired direct claim was allowed' THEN RAISE; END IF;
  END;
  UPDATE public.exam_sessions SET status='active',current_candidate_id=candidate WHERE id=fresh;
END $$;
ROLLBACK;