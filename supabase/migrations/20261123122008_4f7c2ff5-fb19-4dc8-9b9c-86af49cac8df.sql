-- All fixtures are rolled back; no AI calls or real-case approvals.
DO $test$
DECLARE _case uuid := gen_random_uuid(); _admin uuid; _request uuid := gen_random_uuid(); _n integer;
BEGIN
 SELECT user_id INTO _admin FROM public.user_roles WHERE role='admin' LIMIT 1;
 IF _admin IS NULL THEN RAISE EXCEPTION 'Test requires an admin'; END IF;
 BEGIN
  INSERT INTO public.clinical_cases(id,title,status,initial_prompt,questions_text,created_by,checklist_rubric)
  VALUES (_case,'__manual_approval_test__','draft','Pasien sesak.','Minta pemeriksaan.',_admin,'{"enabled":true,"items":[{"id":"a","text":"Minta EKG","points":2,"isCritical":true}]}');
  INSERT INTO public.case_answer_keys(case_id,answer_key_text) VALUES (_case,'Kunci privat');
  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000000"}',true);
  SET LOCAL ROLE authenticated;
  BEGIN
   PERFORM public.approve_final_case_review(_case);
   RAISE EXCEPTION 'Non-admin approved case';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Non-admin changed readiness'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',_admin)::text,true);
  SET LOCAL ROLE authenticated;
  PERFORM public.approve_final_case_review(_case);
  RESET ROLE;
  IF NOT private.final_case_ready(_case) THEN RAISE EXCEPTION 'Manual approval did not unlock case'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.case_final_reviews WHERE case_id=_case AND checked_by=_admin AND result->>'source'='manual') THEN RAISE EXCEPTION 'Manual audit not saved'; END IF;
  UPDATE public.clinical_cases SET status='published' WHERE id=_case;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO _n FROM public.deploy_exam_batch(_request,jsonb_build_array(jsonb_build_object('case_id',_case,'station_token',gen_random_uuid()::text,'deployment_id',gen_random_uuid(),'sequence_order',1)));
  IF _n<>1 THEN RAISE EXCEPTION 'Manual approval did not enable deployment'; END IF;
  RESET ROLE;
  UPDATE public.clinical_cases SET questions_text='Pertanyaan diubah.' WHERE id=_case;
  IF private.final_case_ready(_case) THEN RAISE EXCEPTION 'Edit kept manual approval'; END IF;
  IF (SELECT answer_key_text FROM public.case_answer_keys WHERE case_id=_case)<>'Kunci privat' THEN RAISE EXCEPTION 'Approval changed key'; END IF;
  RAISE EXCEPTION 'rollback manual fixtures' USING ERRCODE='Z0001';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.clinical_cases WHERE id=_case) OR EXISTS(SELECT 1 FROM public.exam_deployment_requests WHERE request_id=_request) THEN RAISE EXCEPTION 'Test fixtures remain'; END IF;
END;
$test$;