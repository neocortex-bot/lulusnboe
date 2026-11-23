CREATE TABLE public.case_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  kind text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  decisions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_ai_recommendations TO authenticated;
GRANT ALL ON public.case_ai_recommendations TO service_role;
ALTER TABLE public.case_ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage AI recommendations" ON public.case_ai_recommendations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND kind IN ('rubric_alignment','property_sync'));
CREATE OR REPLACE FUNCTION public.touch_case_ai_recommendations() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_touch_case_ai_recommendations BEFORE UPDATE ON public.case_ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.touch_case_ai_recommendations();