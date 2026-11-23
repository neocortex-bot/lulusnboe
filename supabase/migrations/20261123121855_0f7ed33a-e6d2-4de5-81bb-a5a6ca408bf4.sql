CREATE OR REPLACE FUNCTION private.approve_final_case_review(_case_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE _input jsonb; _admin uuid := auth.uid();
BEGIN
 IF _admin IS NULL OR NOT public.has_role(_admin,'admin'::public.app_role) THEN RAISE EXCEPTION 'Hanya admin dapat menandai soal sudah sesuai' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.clinical_cases WHERE id=_case_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Soal tidak ditemukan'; END IF;
 PERFORM 1 FROM public.case_answer_keys WHERE case_id=_case_id FOR UPDATE;
 _input := private.final_case_input(_case_id);
 PERFORM private.record_final_case_review(_case_id,_input,jsonb_build_object('passed',true,'source','manual','summary','Ditandai sudah sesuai oleh admin (tanpa analisis AI).','issues','[]'::jsonb,'initial_prompt',NULL,'questions_text',NULL),_admin);
END; $$;
REVOKE ALL ON FUNCTION private.approve_final_case_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.approve_final_case_review(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.approve_final_case_review(_case_id uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.approve_final_case_review(_case_id); $$;
REVOKE ALL ON FUNCTION public.approve_final_case_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_final_case_review(uuid) TO authenticated;