CREATE OR REPLACE FUNCTION public.deploy_exam_batch(_request_id uuid, _stations jsonb)
RETURNS TABLE(id uuid, station_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _entry jsonb; _existing jsonb; _session_id uuid; _count integer;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
   RAISE EXCEPTION 'Hanya admin dapat deploy' USING ERRCODE='42501';
 END IF;
 IF _request_id IS NULL OR jsonb_typeof(_stations) IS DISTINCT FROM 'array' OR jsonb_array_length(_stations)=0 THEN
   RAISE EXCEPTION 'Permintaan deploy tidak valid';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text, 0));
 _count := jsonb_array_length(_stations);
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_stations) x WHERE nullif(x->>'station_token','') IS NULL OR x->>'deployment_id' IS NULL OR x->>'case_id' IS NULL OR (x->>'sequence_order')::integer < 1) OR
 (SELECT count(DISTINCT x->>'station_token') FROM jsonb_array_elements(_stations) x) <> _count THEN
   RAISE EXCEPTION 'Kode atau urutan station tidak valid';
 END IF;
 SELECT payload INTO _existing FROM public.exam_deployment_requests WHERE request_id=_request_id;
 IF FOUND THEN
   IF _existing IS DISTINCT FROM _stations THEN RAISE EXCEPTION 'Identitas deploy telah digunakan untuk pilihan berbeda'; END IF;
   RETURN QUERY SELECT s.id,s.station_token FROM public.exam_sessions s JOIN public.exam_sequence_items q ON q.session_id=s.id WHERE q.deployment_id IN (SELECT (x->>'deployment_id')::uuid FROM jsonb_array_elements(_stations) x);
   RETURN;
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_stations) x LEFT JOIN public.clinical_cases c ON c.id=(x->>'case_id')::uuid WHERE c.id IS NULL OR c.status IS DISTINCT FROM 'published') THEN
   RAISE EXCEPTION 'Soal harus tersedia dan dipublikasikan';
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_stations) x WHERE nullif(x->>'examiner_id','') IS NOT NULL AND NOT public.has_role((x->>'examiner_id')::uuid,'admin'::public.app_role)) THEN
   RAISE EXCEPTION 'Penguji harus admin';
 END IF;
 INSERT INTO public.exam_deployment_requests(request_id,payload) VALUES (_request_id,_stations);
 FOR _entry IN SELECT value FROM jsonb_array_elements(_stations) LOOP
   INSERT INTO public.exam_sessions(case_id,station_token,status,show_results_to_candidate_override,examiner_id,show_examiner_panel)
   VALUES ((_entry->>'case_id')::uuid,_entry->>'station_token','waiting',coalesce((_entry->>'show_results_to_candidate_override')::boolean,true),nullif(_entry->>'examiner_id','')::uuid,coalesce((_entry->>'show_examiner_panel')::boolean,false)) RETURNING exam_sessions.id INTO _session_id;
   INSERT INTO public.exam_sequence_items(deployment_id,station_token,case_id,sequence_order,session_id)
   VALUES ((_entry->>'deployment_id')::uuid,_entry->>'station_token',(_entry->>'case_id')::uuid,(_entry->>'sequence_order')::integer,_session_id);
   id := _session_id; station_token := _entry->>'station_token'; RETURN NEXT;
 END LOOP;
END;
$$;
CREATE TABLE public.exam_deployment_requests(request_id uuid PRIMARY KEY, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.exam_deployment_requests TO service_role;
ALTER TABLE public.exam_deployment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON FUNCTION public.deploy_exam_batch(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.deploy_exam_batch(uuid,jsonb) TO authenticated;