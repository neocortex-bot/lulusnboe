-- Transactional integration test: the nested rollback leaves no cases/sessions/results.
DO $test$
DECLARE
 _case uuid:=gen_random_uuid(); _admin uuid; _input jsonb; _before jsonb; _session uuid;
 _request uuid:=gen_random_uuid(); _deployment uuid:=gen_random_uuid(); _stations jsonb;
 _token text:=gen_random_uuid()::text; _n integer;
 _good jsonb:='{"passed":true,"summary":"Aman","issues":[],"initial_prompt":null,"questions_text":null}';
 _bad jsonb:='{"passed":false,"summary":"Hasil EKG bocor","issues":[{"field":"initial_prompt","kind":"leak","quote":"EKG: AV block total","reason":"Minta pemeriksaan dulu"}],"initial_prompt":"Pasien sesak.","questions_text":null}';
BEGIN
 SELECT user_id INTO _admin FROM public.user_roles WHERE role='admin' LIMIT 1;
 IF _admin IS NULL THEN RAISE EXCEPTION 'Test requires an existing admin'; END IF;
 BEGIN
  INSERT INTO public.clinical_cases(id,title,status,initial_prompt,questions_text,created_by,checklist_rubric)
  VALUES (_case,'__final_review_transaction_test__','draft','Pasien sesak. EKG: AV block total','1. Pemeriksaan apa yang diminta?',_admin,'{"enabled":true,"items":[{"id":"a","text":"Minta EKG","points":2,"isCritical":true}]}');
  INSERT INTO public.case_answer_keys(case_id,answer_key_text,checklist_rubric)
  VALUES (_case,'Minta EKG lalu interpretasikan AV block total.','{"enabled":true,"items":[{"id":"a","text":"Minta EKG","points":2,"isCritical":true,"answer":"Saya meminta EKG"}],"digital_properties":[{"label":"EKG","value":"AV block total","needs_media":true}]}');
  _input:=private.final_case_input(_case);
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Unchecked case passed'; END IF;
  BEGIN
   UPDATE public.clinical_cases SET status='published' WHERE id=_case;
   SET CONSTRAINTS ALL IMMEDIATE;
   RAISE EXCEPTION 'Unchecked publication allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM private.record_final_case_review(_case,_input,_bad,_admin);
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Leaked case passed'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',_admin)::text,true);
  SET LOCAL ROLE authenticated;
  BEGIN
   INSERT INTO public.exam_sessions(case_id,station_token) VALUES (_case,_token);
   RAISE EXCEPTION 'RLS allowed unchecked direct deployment';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   UPDATE public.case_final_reviews SET passed=true WHERE case_id=_case;
   RAISE EXCEPTION 'Admin forged final review';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.record_final_case_review(_case,_input,_good,_admin);
   RAISE EXCEPTION 'Admin invoked service-only approval';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- Accepting the stored correction changes only candidate-facing text.
  PERFORM public.apply_final_case_review(_case);
  RESET ROLE;
  IF (SELECT initial_prompt FROM public.clinical_cases WHERE id=_case) <> 'Pasien sesak.' THEN RAISE EXCEPTION 'Correction not saved'; END IF;
  IF (SELECT answer_key_text FROM public.case_answer_keys WHERE case_id=_case) <> 'Minta EKG lalu interpretasikan AV block total.' THEN RAISE EXCEPTION 'Answer key changed'; END IF;
  IF (SELECT checklist_rubric->'items'->0->>'answer' FROM public.case_answer_keys WHERE case_id=_case) <> 'Saya meminta EKG' THEN RAISE EXCEPTION 'Word by Word changed'; END IF;
  IF private.final_case_ready(_case) OR NOT (SELECT stale FROM public.case_final_reviews WHERE case_id=_case) THEN RAISE EXCEPTION 'Acceptance incorrectly approved case'; END IF;
  _input:=private.final_case_input(_case);
  SET LOCAL ROLE service_role;
  PERFORM public.get_final_case_input(_case);
  PERFORM public.record_final_case_review(_case,_input,_good,_admin);
  RESET ROLE;
  UPDATE public.clinical_cases SET status='published' WHERE id=_case;
  SET CONSTRAINTS ALL IMMEDIATE;
  _stations:=jsonb_build_array(jsonb_build_object('case_id',_case,'station_token',_token,'deployment_id',_deployment,'sequence_order',1));
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO _n FROM public.deploy_exam_batch(_request,_stations);
  IF _n<>1 THEN RAISE EXCEPTION 'Passing deployment did not create exactly one session'; END IF;
  SELECT count(*) INTO _n FROM public.deploy_exam_batch(_request,_stations);
  IF _n<>1 THEN RAISE EXCEPTION 'Idempotent retry failed'; END IF;
  RESET ROLE;
  SELECT id INTO _session FROM public.exam_sessions WHERE station_token=_token;
  INSERT INTO public.exam_results(session_id,candidate_id,ai_score_report) VALUES (_session,_admin,'{"items":[{"rubricItemId":"a","item":"Minta EKG","points":2,"maxPoints":2,"manualOverride":true}]}');
  SELECT ai_score_report INTO _before FROM public.exam_results WHERE session_id=_session;
  UPDATE public.case_answer_keys SET answer_key_text=answer_key_text||' Koreksi admin.' WHERE case_id=_case;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Edited answer key still passed'; END IF;
  IF (SELECT ai_score_report FROM public.exam_results WHERE session_id=_session) IS DISTINCT FROM _before THEN RAISE EXCEPTION 'Grading changed'; END IF;
  SET LOCAL ROLE authenticated;
  BEGIN
   PERFORM public.deploy_exam_batch(gen_random_uuid(),jsonb_build_array(jsonb_build_object('case_id',_case,'station_token',gen_random_uuid()::text,'deployment_id',gen_random_uuid(),'sequence_order',1)));
   RAISE EXCEPTION 'Stale case deployed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RESET ROLE;
  BEGIN
   PERFORM private.record_final_case_review(_case,_input,_good,_admin);
   RAISE EXCEPTION 'Outdated in-flight check saved';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM NOT LIKE 'Isi soal berubah%' THEN RAISE; END IF;
  END;
  -- Every other content edit must invalidate a previously passing check.
  PERFORM private.record_final_case_review(_case,private.final_case_input(_case),_good,_admin);
  UPDATE public.clinical_cases SET questions_text='1. Pemeriksaan berikutnya?' WHERE id=_case;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Question edit did not invalidate'; END IF;
  PERFORM private.record_final_case_review(_case,private.final_case_input(_case),_good,_admin);
  UPDATE public.clinical_cases SET initial_prompt='Pasien sesak sejak kemarin.' WHERE id=_case;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Vignette edit did not invalidate'; END IF;
  PERFORM private.record_final_case_review(_case,private.final_case_input(_case),_good,_admin);
  UPDATE public.case_answer_keys SET checklist_rubric=jsonb_set(checklist_rubric,'{items,0,answer}','"Word by Word baru"') WHERE case_id=_case;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Word by Word edit did not invalidate'; END IF;
  PERFORM private.record_final_case_review(_case,private.final_case_input(_case),_good,_admin);
  UPDATE public.case_answer_keys SET checklist_rubric=jsonb_set(checklist_rubric,'{digital_properties,0,value}','"Temuan baru"') WHERE case_id=_case;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Property edit did not invalidate'; END IF;
  PERFORM private.record_final_case_review(_case,private.final_case_input(_case),_good,_admin);
  UPDATE public.case_answer_keys SET checklist_rubric=jsonb_set(checklist_rubric,'{items,0,text}','"Rubrik baru"') WHERE case_id=_case;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Rubric edit did not invalidate'; END IF;
  RAISE EXCEPTION 'rollback final review fixtures' USING ERRCODE='Z0001';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.clinical_cases WHERE id=_case) OR EXISTS(SELECT 1 FROM public.exam_deployment_requests WHERE request_id=_request) THEN RAISE EXCEPTION 'Test left fixtures behind'; END IF;
END;
$test$;