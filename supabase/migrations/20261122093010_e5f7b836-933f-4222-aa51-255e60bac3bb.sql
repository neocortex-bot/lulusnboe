DO $$
DECLARE
  c uuid; a uuid; b uuid; candidate uuid; all_admins integer; visible_admins integer;
  dep uuid := gen_random_uuid(); missing_dep uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); s3 uuid := gen_random_uuid();
  r record; retry record; advanced record; legacy record; round2 record;
  tok1 text := 'rotation-test-' || s1; tok2 text := 'rotation-test-' || s2;
  new1 text := 'rotation-test-' || gen_random_uuid(); new2 text := 'rotation-test-' || gen_random_uuid();
  next_token text := 'rotation-test-' || gen_random_uuid();
BEGIN
  BEGIN
    SELECT id INTO c FROM public.clinical_cases LIMIT 1;
    SELECT user_id INTO a FROM public.user_roles WHERE role='admin' AND NOT public.is_master_admin(user_id) LIMIT 1;
    SELECT user_id INTO b FROM public.user_roles WHERE role='admin' AND user_id<>a LIMIT 1;
    SELECT id INTO candidate FROM public.profiles LIMIT 1;
    IF c IS NULL OR a IS NULL OR b IS NULL OR candidate IS NULL THEN RAISE EXCEPTION 'Requires case, two admins (one regular), and profile'; END IF;

    SELECT count(*) INTO all_admins FROM public.user_roles WHERE role='admin';
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',a,'role','authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT count(*) INTO visible_admins FROM public.user_roles WHERE role='admin';
    IF visible_admins<>all_admins THEN RAISE EXCEPTION 'Regular admin must see every examiner'; END IF;
    BEGIN
      INSERT INTO public.user_roles(user_id,role) VALUES(gen_random_uuid(),'admin');
      RAISE EXCEPTION 'Regular admin must not change roles';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    EXECUTE 'RESET ROLE';

    INSERT INTO public.exam_sessions(id,case_id,station_token,status,examiner_id,show_examiner_panel,show_results_to_candidate_override)
    VALUES(s1,c,tok1,'completed',a,true,true),(s2,c,tok2,'completed',b,false,false),
          (s3,c,'rotation-test-'||s3,'completed',a,true,true);
    INSERT INTO public.exam_sequence_items(deployment_id,station_token,case_id,sequence_order,session_id)
    VALUES(dep,tok1,c,1,s1),(dep,tok2,c,2,s2),
          (missing_dep,'rotation-test-'||s3,c,1,s3),(missing_dep,next_token,c,2,NULL);
    INSERT INTO public.exam_results(session_id,candidate_id) VALUES(s1,candidate),(s2,candidate);

    PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
    EXECUTE 'SET LOCAL ROLE anon';
    SELECT * INTO r FROM public.reset_completed_station_sequence(tok2,ARRAY[new1,new2]);
    SELECT * INTO retry FROM public.reset_completed_station_sequence(tok2,ARRAY[new1,new2]);
    SELECT * INTO legacy FROM public.regenerate_station_session(c,'rotation-test-'||gen_random_uuid(),tok1);
    SELECT * INTO advanced FROM public.advance_station_sequence('rotation-test-'||s3,1);
    EXECUTE 'RESET ROLE';

    IF r.id IS DISTINCT FROM retry.id OR r.deployment_id IS DISTINCT FROM retry.deployment_id THEN RAISE EXCEPTION 'Reset retry duplicated deployment'; END IF;
    IF (SELECT count(*) FROM public.exam_sequence_items WHERE deployment_id=r.deployment_id)<>2 THEN RAISE EXCEPTION 'Expected exactly two rotated items'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.exam_sessions WHERE station_token=new1 AND examiner_id=a AND show_examiner_panel AND show_results_to_candidate_override AND status='waiting' AND current_candidate_id IS NULL)
      OR NOT EXISTS(SELECT 1 FROM public.exam_sessions WHERE station_token=new2 AND examiner_id=b AND NOT show_examiner_panel AND NOT show_results_to_candidate_override) THEN RAISE EXCEPTION 'Reset lost per-item examiner configuration'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.exam_sessions WHERE id=legacy.id AND examiner_id=a AND show_examiner_panel) THEN RAISE EXCEPTION 'Legacy regeneration must use exact source, not latest case session'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.exam_sessions WHERE id=advanced.next_id AND examiner_id=a AND show_examiner_panel) THEN RAISE EXCEPTION 'Advance creation lost examiner'; END IF;

    UPDATE public.exam_sessions SET examiner_id=b WHERE id=advanced.next_id;
    PERFORM public.advance_station_sequence('rotation-test-'||s3,1);
    IF (SELECT examiner_id FROM public.exam_sessions WHERE id=advanced.next_id) IS DISTINCT FROM b THEN RAISE EXCEPTION 'Advance overwrote explicit examiner'; END IF;
    UPDATE public.exam_sessions SET examiner_id=NULL WHERE id=advanced.next_id;
    PERFORM public.advance_station_sequence('rotation-test-'||s3,1);
    IF (SELECT examiner_id FROM public.exam_sessions WHERE id=advanced.next_id) IS DISTINCT FROM a THEN RAISE EXCEPTION 'Advance failed to repair missing examiner'; END IF;

    UPDATE public.exam_sessions SET status='completed' WHERE station_token IN(new1,new2);
    INSERT INTO public.exam_results(session_id,candidate_id) SELECT id,candidate FROM public.exam_sessions WHERE station_token IN(new1,new2);
    SELECT * INTO round2 FROM public.reset_completed_station_sequence(new2,ARRAY['rotation-test-'||gen_random_uuid(),'rotation-test-'||gen_random_uuid()]);
    IF NOT EXISTS(SELECT 1 FROM public.exam_sequence_items i JOIN public.exam_sessions s ON s.id=i.session_id WHERE i.deployment_id=round2.deployment_id AND i.sequence_order=1 AND s.examiner_id=a)
      OR NOT EXISTS(SELECT 1 FROM public.exam_sequence_items i JOIN public.exam_sessions s ON s.id=i.session_id WHERE i.deployment_id=round2.deployment_id AND i.sequence_order=2 AND s.examiner_id=b) THEN RAISE EXCEPTION 'Second rotation lost examiner'; END IF;

    BEGIN
      PERFORM public.regenerate_station_session(c,'rotation-test-'||gen_random_uuid(),'unknown-source');
      RAISE EXCEPTION 'Missing source must be rejected';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    RAISE EXCEPTION 'rollback fixtures' USING ERRCODE='ZX001';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    RAISE NOTICE 'PASS: regular-admin directory, protected roles, anonymous rotation, retry, exact legacy source, advance repair, and repeat rotation';
  END;
END $$;