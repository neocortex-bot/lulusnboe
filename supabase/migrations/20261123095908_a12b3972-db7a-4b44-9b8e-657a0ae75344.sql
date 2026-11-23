GRANT USAGE ON SCHEMA private TO service_role;
CREATE OR REPLACE FUNCTION public.deploy_exam_batch(_request_id uuid, _stations jsonb)
 RETURNS TABLE(id uuid, station_token text)
 LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE _entry jsonb; _existing jsonb; _session_id uuid; _count integer; _case_id uuid; _title text;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Hanya admin dapat deploy' USING ERRCODE='42501'; END IF;
 IF _request_id IS NULL OR jsonb_typeof(_stations) IS DISTINCT FROM 'array' OR jsonb_array_length(_stations)=0 THEN RAISE EXCEPTION 'Permintaan deploy tidak valid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text, 0));
 _count := jsonb_array_length(_stations);
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_stations) x WHERE nullif(x->>'station_token','') IS NULL OR x->>'deployment_id' IS NULL OR x->>'case_id' IS NULL OR (x->>'sequence_order')::integer < 1) OR (SELECT count(DISTINCT x->>'station_token') FROM jsonb_array_elements(_stations) x) <> _count THEN RAISE EXCEPTION 'Kode atau urutan station tidak valid'; END IF;
 SELECT payload INTO _existing FROM public.exam_deployment_requests WHERE request_id=_request_id;
 IF FOUND THEN
  IF _existing IS DISTINCT FROM _stations THEN RAISE EXCEPTION 'Identitas deploy telah digunakan untuk pilihan berbeda'; END IF;
  RETURN QUERY SELECT s.id,s.station_token FROM public.exam_sessions s JOIN public.exam_sequence_items q ON q.session_id=s.id WHERE q.deployment_id IN (SELECT (x->>'deployment_id')::uuid FROM jsonb_array_elements(_stations) x);
  RETURN;
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_stations) x LEFT JOIN public.clinical_cases c ON c.id=(x->>'case_id')::uuid WHERE c.id IS NULL OR c.status IS DISTINCT FROM 'published') THEN RAISE EXCEPTION 'Soal harus tersedia dan dipublikasikan'; END IF;
 FOR _case_id IN SELECT DISTINCT (x->>'case_id')::uuid FROM jsonb_array_elements(_stations) x ORDER BY 1 LOOP
  SELECT title INTO _title FROM public.clinical_cases WHERE clinical_cases.id=_case_id FOR UPDATE;
  PERFORM 1 FROM public.case_answer_keys WHERE case_id=_case_id FOR UPDATE;
  IF NOT public.final_case_ready(_case_id) THEN RAISE EXCEPTION 'Soal "%" belum lolos pemeriksaan akhir kebocoran dan kesesuaian. Periksa di detail soal sebelum deployment.', _title USING ERRCODE='23514'; END IF;
 END LOOP;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_stations) x WHERE nullif(x->>'examiner_id','') IS NOT NULL AND NOT public.has_role((x->>'examiner_id')::uuid,'admin'::public.app_role)) THEN RAISE EXCEPTION 'Penguji harus admin'; END IF;
 INSERT INTO public.exam_deployment_requests(request_id,payload) VALUES (_request_id,_stations);
 FOR _entry IN SELECT value FROM jsonb_array_elements(_stations) LOOP
  INSERT INTO public.exam_sessions(case_id,station_token,status,show_results_to_candidate_override,examiner_id,show_examiner_panel)
  VALUES ((_entry->>'case_id')::uuid,_entry->>'station_token','waiting',coalesce((_entry->>'show_results_to_candidate_override')::boolean,true),nullif(_entry->>'examiner_id','')::uuid,coalesce((_entry->>'show_examiner_panel')::boolean,false)) RETURNING exam_sessions.id INTO _session_id;
  INSERT INTO public.exam_sequence_items(deployment_id,station_token,case_id,sequence_order,session_id)
  VALUES ((_entry->>'deployment_id')::uuid,_entry->>'station_token',(_entry->>'case_id')::uuid,(_entry->>'sequence_order')::integer,_session_id);
  id := _session_id; station_token := _entry->>'station_token'; RETURN NEXT;
 END LOOP;
END; $$;