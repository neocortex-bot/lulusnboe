ALTER TABLE public.case_answer_keys
  ADD COLUMN IF NOT EXISTS previous_answer_key_text text,
  ADD COLUMN IF NOT EXISTS answer_key_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_rubric_items jsonb,
  ADD COLUMN IF NOT EXISTS rubric_edited_at timestamptz;

CREATE OR REPLACE FUNCTION public.rubric_text_projection(_rubric jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', e->>'id',
    'text', coalesce(e->>'text', e->>'item', ''),
    'answer', coalesce(e->>'answer', '')) ORDER BY o), '[]'::jsonb)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_rubric->'items') = 'array' THEN _rubric->'items'
                                 WHEN jsonb_typeof(_rubric) = 'array' THEN _rubric ELSE '[]'::jsonb END)
       WITH ORDINALITY AS t(e, o)
$$;

CREATE OR REPLACE FUNCTION public.track_answer_key_edits()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.answer_key_text IS DISTINCT FROM OLD.answer_key_text THEN
    NEW.previous_answer_key_text := OLD.answer_key_text;
    NEW.answer_key_edited_at := now();
  END IF;
  IF public.rubric_text_projection(NEW.checklist_rubric) IS DISTINCT FROM public.rubric_text_projection(OLD.checklist_rubric) THEN
    NEW.previous_rubric_items := public.rubric_text_projection(OLD.checklist_rubric);
    NEW.rubric_edited_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS track_answer_key_edits ON public.case_answer_keys;
CREATE TRIGGER track_answer_key_edits BEFORE UPDATE ON public.case_answer_keys
FOR EACH ROW EXECUTE FUNCTION public.track_answer_key_edits();