-- ============================================================
-- EuroNova Migration 00020: Dynamic NGO Surveys Engine
-- Tables for Community Surveys, Dynamic Options, and Anonymous Voting
-- ============================================================

-- 1. Table: ngo_surveys
CREATE TABLE IF NOT EXISTS public.ngo_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL DEFAULT 'Verified Organization',
  question TEXT NOT NULL,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('boolean', 'single_choice', 'multiple_choice')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table: ngo_survey_options
CREATE TABLE IF NOT EXISTS public.ngo_survey_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.ngo_surveys(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table: ngo_survey_votes
CREATE TABLE IF NOT EXISTS public.ngo_survey_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.ngo_surveys(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.ngo_survey_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ngo_survey_user_option UNIQUE (survey_id, option_id, user_id)
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ngo_surveys_org_id ON public.ngo_surveys(org_id);
CREATE INDEX IF NOT EXISTS idx_ngo_surveys_status ON public.ngo_surveys(status);
CREATE INDEX IF NOT EXISTS idx_ngo_surveys_created_at ON public.ngo_surveys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ngo_survey_options_survey_id ON public.ngo_survey_options(survey_id);
CREATE INDEX IF NOT EXISTS idx_ngo_survey_votes_survey_id ON public.ngo_survey_votes(survey_id);
CREATE INDEX IF NOT EXISTS idx_ngo_survey_votes_user_id ON public.ngo_survey_votes(user_id);

-- 5. Row Level Security Setup
ALTER TABLE public.ngo_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngo_survey_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngo_survey_votes ENABLE ROW LEVEL SECURITY;

-- Policies: ngo_surveys
DROP POLICY IF EXISTS "Public can view published ngo surveys" ON public.ngo_surveys;
CREATE POLICY "Public can view published ngo surveys"
  ON public.ngo_surveys FOR SELECT
  USING (status = 'published' OR auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com');

DROP POLICY IF EXISTS "Organizations can insert their own surveys" ON public.ngo_surveys;
CREATE POLICY "Organizations can insert their own surveys"
  ON public.ngo_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = org_id);

DROP POLICY IF EXISTS "Organizations can update their own surveys" ON public.ngo_surveys;
CREATE POLICY "Organizations can update their own surveys"
  ON public.ngo_surveys FOR UPDATE
  TO authenticated
  USING (auth.uid() = org_id);

DROP POLICY IF EXISTS "Organizations or admins can delete their own surveys" ON public.ngo_surveys;
CREATE POLICY "Organizations or admins can delete their own surveys"
  ON public.ngo_surveys FOR DELETE
  TO authenticated
  USING (auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com');

-- Policies: ngo_survey_options
DROP POLICY IF EXISTS "Public can view survey options" ON public.ngo_survey_options;
CREATE POLICY "Public can view survey options"
  ON public.ngo_survey_options FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Survey owners can insert survey options" ON public.ngo_survey_options;
CREATE POLICY "Survey owners can insert survey options"
  ON public.ngo_survey_options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ngo_surveys 
      WHERE id = ngo_survey_options.survey_id 
      AND (org_id = auth.uid() OR auth.email() = 'euronovaofficial@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Survey owners can update survey options" ON public.ngo_survey_options;
CREATE POLICY "Survey owners can update survey options"
  ON public.ngo_survey_options FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ngo_surveys 
      WHERE id = ngo_survey_options.survey_id 
      AND (org_id = auth.uid() OR auth.email() = 'euronovaofficial@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Survey owners can delete survey options" ON public.ngo_survey_options;
CREATE POLICY "Survey owners can delete survey options"
  ON public.ngo_survey_options FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ngo_surveys 
      WHERE id = ngo_survey_options.survey_id 
      AND (org_id = auth.uid() OR auth.email() = 'euronovaofficial@gmail.com')
    )
  );

-- Policies: ngo_survey_votes
DROP POLICY IF EXISTS "Public can view survey votes" ON public.ngo_survey_votes;
CREATE POLICY "Public can view survey votes"
  ON public.ngo_survey_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can cast votes" ON public.ngo_survey_votes;
CREATE POLICY "Authenticated users can cast votes"
  ON public.ngo_survey_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON public.ngo_survey_votes;
CREATE POLICY "Users can delete their own votes"
  ON public.ngo_survey_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.email() = 'euronovaofficial@gmail.com');
