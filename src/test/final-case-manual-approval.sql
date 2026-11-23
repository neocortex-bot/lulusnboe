-- Run transactionally against an environment with an existing admin; fixtures are rolled back.
DO $test$
DECLARE
 _case uuid:=gen_random_uuid(); _admin uuid; _candidate uuid:=gen_random_uuid();
 _hash text; _saved jsonb; _before jsonb; _n integer;
BEGIN
 SELECT user_id INTO _admin FROM public.user_roles WHERE role='admin' LIMIT 1;
 IF _admin IS NULL THEN RAISE EXCEPTION 'Test requires an existing admin'; END IF;
 BEGIN
  INSERT INTO public.clinical_cases(id,title,status,initial_prompt,questions_text,created_by,checklist_rubric)
  VALUES (_case,'__manual_final_review_test__','draft','Pasien sesak.','1. Sebutkan pemeriksaan yang Anda minta.',_admin,'{"enabled":true,"items":[{"id":"a","text":"Minta EKG","points":2,"isCritical":true}]}');
  INSERT INTO public.case_answer_keys(case_id,answer_key_text,checklist_rubric)
  VALUES (_case,'Minta EKG.','{"enabled":true,"items":[{"id":"a","text":"Minta EKG","points":2,"isCritical":true,"answer":"Saya meminta EKG"}]}');
  _before:=private.final_case_input(_case);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',_candidate)::text,true);
  SET LOCAL ROLE authenticated;
  BEGIN
   PERFORM public.get_final_case_review_hash(_case);
   RAISE EXCEPTION 'Candidate read approval snapshot';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.approve_final_case_manually(_case,md5(_before::text),true);
   RAISE EXCEPTION 'Candidate approved manually';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',_admin)::text,true);
  SET LOCAL ROLE authenticated;
  _hash:=public.get_final_case_review_hash(_case);
  IF _hash IS DISTINCT FROM md5(_before::text) THEN RAISE EXCEPTION 'Snapshot hash mismatch'; END IF;
  BEGIN
   PERFORM public.approve_final_case_manually(_case,_hash,false);
   RAISE EXCEPTION 'Unconfirmed manual approval allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
   PERFORM public.approve_final_case_manually(_case,'outdated-hash',true);
   RAISE EXCEPTION 'Outdated content approved';
  EXCEPTION WHEN check_violation THEN NULL; END;
  _saved:=public.approve_final_case_manually(_case,_hash,true);
  IF _saved->'result'->>'approval_method' IS DISTINCT FROM 'manual' THEN RAISE EXCEPTION 'Manual provenance missing'; END IF;
  IF _saved->>'checked_by' IS DISTINCT FROM _admin::text THEN RAISE EXCEPTION 'Approver not recorded'; END IF;
  IF NOT public.final_case_ready(_case) THEN RAISE EXCEPTION 'Manual approval did not unlock'; END IF;
  UPDATE public.clinical_cases SET status='published' WHERE id=_case;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO _n FROM public.deploy_exam_batch(gen_random_uuid(),jsonb_build_array(jsonb_build_object('case_id',_case,'station_token',gen_random_uuid()::text,'deployment_id',gen_random_uuid(),'sequence_order',1)));
  IF _n<>1 THEN RAISE EXCEPTION 'Manually approved deployment failed'; END IF;
  RESET ROLE;
  IF private.final_case_input(_case) IS DISTINCT FROM _before THEN RAISE EXCEPTION 'Manual approval changed case or grading inputs'; END IF;
  UPDATE public.case_answer_keys SET answer_key_text='Minta EKG dan interpretasikan.' WHERE case_id=_case;
  SET LOCAL ROLE authenticated;
  IF public.final_case_ready(_case) THEN RAISE EXCEPTION 'Manual approval survived a content edit'; END IF;
  BEGIN
   PERFORM public.deploy_exam_batch(gen_random_uuid(),jsonb_build_array(jsonb_build_object('case_id',_case,'station_token',gen_random_uuid()::text,'deployment_id',gen_random_uuid(),'sequence_order',1)));
   RAISE EXCEPTION 'Stale manual approval deployed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RESET ROLE;
  RAISE EXCEPTION 'rollback manual approval fixtures' USING ERRCODE='Z0001';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.clinical_cases WHERE id=_case) THEN RAISE EXCEPTION 'Test left fixtures behind'; END IF;
END;
$test$;