CREATE TABLE public.case_final_reviews (
 case_id uuid PRIMARY KEY REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
 content_hash text NOT NULL,
 result jsonb NOT NULL,
 passed boolean NOT NULL DEFAULT false,
 stale boolean NOT NULL DEFAULT false,
 checked_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.case_final_reviews TO authenticated;
GRANT ALL ON public.case_final_reviews TO service_role;
ALTER TABLE public.case_final_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read final reviews" ON public.case_final_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER touch_final_review BEFORE UPDATE ON public.case_final_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_case_ai_recommendations();

CREATE OR REPLACE FUNCTION private.final_case_input(_case_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object('title', c.title, 'exam_mode', c.exam_mode, 'initial_prompt', c.initial_prompt, 'questions_text', c.questions_text, 'rubric_mode', c.rubric_mode, 'public_rubric', c.checklist_rubric, 'answer_key_text', coalesce(a.answer_key_text,c.answer_key_text,''), 'checklist_rubric', coalesce(a.checklist_rubric,c.checklist_rubric)) FROM public.clinical_cases c LEFT JOIN public.case_answer_keys a ON a.case_id=c.id WHERE c.id=_case_id;
$$;
REVOKE ALL ON FUNCTION private.final_case_input(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.final_case_input(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.get_final_case_input(_case_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.final_case_input(_case_id); $$;
REVOKE ALL ON FUNCTION public.get_final_case_input(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_final_case_input(uuid) TO service_role;

CREATE OR REPLACE FUNCTION private.record_final_case_review(_case_id uuid, _input jsonb, _result jsonb, _checked_by uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE _current jsonb; _passed boolean;
BEGIN
 PERFORM 1 FROM public.clinical_cases WHERE id=_case_id FOR UPDATE;
 PERFORM 1 FROM public.case_answer_keys WHERE case_id=_case_id FOR UPDATE;
 _current := private.final_case_input(_case_id);
 IF _current IS NULL OR _current IS DISTINCT FROM _input THEN RAISE EXCEPTION 'Isi soal berubah selama pemeriksaan. Simpan lalu analisis ulang.'; END IF;
 IF jsonb_typeof(_result->'issues') IS DISTINCT FROM 'array' OR jsonb_typeof(_result->'passed') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Hasil pemeriksaan tidak valid'; END IF;
 _passed := (_result->>'passed')::boolean AND jsonb_array_length(_result->'issues')=0 AND nullif(_result->>'initial_prompt','') IS NULL AND nullif(_result->>'questions_text','') IS NULL;
 INSERT INTO public.case_final_reviews(case_id,content_hash,result,passed,stale,checked_by) VALUES (_case_id,md5(_input::text),_result,_passed,false,_checked_by)
 ON CONFLICT (case_id) DO UPDATE SET content_hash=excluded.content_hash,result=excluded.result,passed=excluded.passed,stale=false,checked_by=excluded.checked_by,updated_at=now();
END; $$;
REVOKE ALL ON FUNCTION private.record_final_case_review(uuid,jsonb,jsonb,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.record_final_case_review(uuid,jsonb,jsonb,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.record_final_case_review(_case_id uuid,_input jsonb,_result jsonb,_checked_by uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.record_final_case_review(_case_id,_input,_result,_checked_by); $$;
REVOKE ALL ON FUNCTION public.record_final_case_review(uuid,jsonb,jsonb,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_final_case_review(uuid,jsonb,jsonb,uuid) TO service_role;

CREATE OR REPLACE FUNCTION private.final_case_ready(_case_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.case_final_reviews r WHERE r.case_id=_case_id AND r.passed AND NOT r.stale AND r.content_hash=md5(private.final_case_input(_case_id)::text));
$$;
REVOKE ALL ON FUNCTION private.final_case_ready(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.final_case_ready(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.final_case_ready(_case_id uuid) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.final_case_ready(_case_id); $$;
REVOKE ALL ON FUNCTION public.final_case_ready(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.final_case_ready(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.invalidate_final_case_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='clinical_cases' THEN
  IF ROW(NEW.title,NEW.exam_mode,NEW.initial_prompt,NEW.questions_text,NEW.checklist_rubric,NEW.answer_key_text,NEW.rubric_mode) IS DISTINCT FROM ROW(OLD.title,OLD.exam_mode,OLD.initial_prompt,OLD.questions_text,OLD.checklist_rubric,OLD.answer_key_text,OLD.rubric_mode) THEN UPDATE public.case_final_reviews SET stale=true WHERE case_id=NEW.id; END IF;
 ELSE
  IF TG_OP='DELETE' THEN UPDATE public.case_final_reviews SET stale=true WHERE case_id=OLD.case_id; RETURN OLD;
  ELSIF TG_OP='INSERT' THEN UPDATE public.case_final_reviews SET stale=true WHERE case_id=NEW.case_id;
  ELSIF ROW(NEW.answer_key_text,NEW.checklist_rubric) IS DISTINCT FROM ROW(OLD.answer_key_text,OLD.checklist_rubric) THEN UPDATE public.case_final_reviews SET stale=true WHERE case_id=NEW.case_id;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.invalidate_final_case_review() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER invalidate_final_case_text AFTER UPDATE ON public.clinical_cases FOR EACH ROW EXECUTE FUNCTION private.invalidate_final_case_review();
CREATE TRIGGER invalidate_final_case_answers AFTER INSERT OR UPDATE OR DELETE ON public.case_answer_keys FOR EACH ROW EXECUTE FUNCTION private.invalidate_final_case_review();

CREATE OR REPLACE FUNCTION private.require_final_case_publish() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status='published' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
  IF NOT private.final_case_ready(NEW.id) THEN RAISE EXCEPTION 'Soal belum lolos pemeriksaan akhir kebocoran. Simpan sebagai draft lalu periksa di detail soal.' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.require_final_case_publish() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER require_final_case_publish AFTER INSERT OR UPDATE ON public.clinical_cases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.require_final_case_publish();
ALTER TABLE public.clinical_cases ALTER COLUMN status SET DEFAULT 'draft';

DROP POLICY "Admins manage sessions" ON public.exam_sessions;
CREATE POLICY "Admins read sessions" ON public.exam_sessions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins update sessions" ON public.exam_sessions FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK(public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins delete sessions" ON public.exam_sessions FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins deploy reviewed cases" ON public.exam_sessions FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin'::public.app_role) AND public.final_case_ready(case_id));

CREATE OR REPLACE FUNCTION private.apply_final_case_review(_case_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE _review public.case_final_reviews%ROWTYPE;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'Hanya admin dapat menerapkan saran' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.clinical_cases WHERE id=_case_id FOR UPDATE;
 PERFORM 1 FROM public.case_answer_keys WHERE case_id=_case_id FOR UPDATE;
 SELECT * INTO _review FROM public.case_final_reviews WHERE case_id=_case_id;
 IF NOT FOUND OR _review.stale OR _review.content_hash IS DISTINCT FROM md5(private.final_case_input(_case_id)::text) THEN RAISE EXCEPTION 'Rekomendasi sudah kedaluwarsa. Analisis ulang.'; END IF;
 UPDATE public.clinical_cases SET initial_prompt=coalesce(nullif(_review.result->>'initial_prompt',''),initial_prompt), questions_text=coalesce(nullif(_review.result->>'questions_text',''),questions_text) WHERE id=_case_id;
END; $$;
REVOKE ALL ON FUNCTION private.apply_final_case_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.apply_final_case_review(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.apply_final_case_review(_case_id uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.apply_final_case_review(_case_id); $$;
REVOKE ALL ON FUNCTION public.apply_final_case_review(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_final_case_review(uuid) TO authenticated;
