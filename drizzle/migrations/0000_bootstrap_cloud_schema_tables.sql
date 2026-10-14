CREATE TYPE public.app_role AS ENUM ('admin', 'candidate');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nim text
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.clinical_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  exam_mode TEXT NOT NULL DEFAULT 'oral_board' CHECK (exam_mode IN ('oral_board', 'panel_exam')),
  initial_prompt TEXT NOT NULL DEFAULT '',
  checklist_rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_limit_seconds INTEGER NOT NULL DEFAULT 360,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  reading_time_seconds integer NOT NULL DEFAULT 120,
  answer_key_text text NOT NULL DEFAULT '',
  show_results_to_candidate boolean NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published',
  source TEXT NOT NULL DEFAULT 'admin',
  rubric_mode TEXT NOT NULL DEFAULT 'checklist',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  questions_text text NOT NULL DEFAULT ''
);

CREATE TABLE public.case_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.clinical_cases(id) ON DELETE CASCADE NOT NULL,
  asset_url TEXT NOT NULL,
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  asset_type TEXT NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'video', 'text')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category text NOT NULL DEFAULT 'examination',
  answer_text text NOT NULL DEFAULT ''
);

CREATE TABLE public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.clinical_cases(id) ON DELETE CASCADE NOT NULL,
  station_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'force_closed')),
  current_candidate_id UUID REFERENCES public.profiles(id),
  session_start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  show_results_to_candidate_override boolean NOT NULL DEFAULT false
);

CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.profiles(id) NOT NULL,
  audio_file_url TEXT,
  transcript TEXT,
  ai_score_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exam_results_candidate_session_unique UNIQUE (candidate_id, session_id)
);

CREATE TABLE public.exam_sequence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_token text NOT NULL,
  case_id uuid NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE,
  sequence_order integer NOT NULL,
  session_id uuid REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deployment_id uuid NOT NULL
);

CREATE TABLE public.case_answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.clinical_cases(id) ON DELETE CASCADE UNIQUE,
  answer_key_text text NOT NULL DEFAULT '',
  checklist_rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.station_deployment_resets (
  completed_deployment_id uuid PRIMARY KEY,
  next_deployment_id uuid NOT NULL UNIQUE,
  next_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  next_station_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.exam_access (
  user_id uuid PRIMARY KEY,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_sequence_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_answer_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.station_deployment_resets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_access TO authenticated;
GRANT SELECT ON public.clinical_cases TO anon;
GRANT SELECT ON public.exam_sequence_items TO anon;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.clinical_cases TO service_role;
GRANT ALL ON public.case_assets TO service_role;
GRANT ALL ON public.exam_sessions TO service_role;
GRANT ALL ON public.exam_results TO service_role;
GRANT ALL ON public.exam_sequence_items TO service_role;
GRANT ALL ON public.case_answer_keys TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.station_deployment_resets TO service_role;
GRANT ALL ON public.exam_access TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sequence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_deployment_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_access ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinical_cases_status ON public.clinical_cases(status);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_source ON public.clinical_cases(source);
CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_station_token_unique_idx ON public.exam_sessions (station_token);
CREATE UNIQUE INDEX IF NOT EXISTS exam_sequence_items_station_token_unique_idx ON public.exam_sequence_items (station_token);
CREATE UNIQUE INDEX IF NOT EXISTS exam_sequence_items_session_id_unique_idx ON public.exam_sequence_items (session_id) WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS exam_sequence_items_deployment_order_unique_idx ON public.exam_sequence_items (deployment_id, sequence_order);