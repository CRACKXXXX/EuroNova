-- ============================================================
-- EuroNova Migration 00012: Real Organization Tools
-- Tables for Team Squad, Webhooks configuration, and Surveys
-- ============================================================

-- 1. Table: org_team_members
CREATE TABLE IF NOT EXISTS public.org_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.users_org(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Coordinator' CHECK (role IN ('Owner', 'Coordinator', 'Reviewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_member_email UNIQUE (org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_team_members_org_id ON public.org_team_members(org_id);

ALTER TABLE public.org_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view org team members" ON public.org_team_members;
CREATE POLICY "Public can view org team members"
  ON public.org_team_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owner manages team members" ON public.org_team_members;
CREATE POLICY "Owner manages team members"
  ON public.org_team_members FOR ALL
  TO authenticated
  USING (auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com')
  WITH CHECK (auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com');


-- 2. Table: org_webhooks
CREATE TABLE IF NOT EXISTS public.org_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.users_org(id) ON DELETE CASCADE,
  discord_url TEXT,
  slack_url TEXT,
  events JSONB NOT NULL DEFAULT '{"applications": true, "reviews": true, "reports": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_webhooks UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_webhooks_org_id ON public.org_webhooks(org_id);

ALTER TABLE public.org_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages webhooks" ON public.org_webhooks;
CREATE POLICY "Owner manages webhooks"
  ON public.org_webhooks FOR ALL
  TO authenticated
  USING (auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com')
  WITH CHECK (auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com');


-- 3. Table: org_surveys
CREATE TABLE IF NOT EXISTS public.org_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.users_org(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Candidate Application Dossier',
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_surveys_org_id ON public.org_surveys(org_id);

ALTER TABLE public.org_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view org surveys" ON public.org_surveys;
CREATE POLICY "Public can view org surveys"
  ON public.org_surveys FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owner manages surveys" ON public.org_surveys;
CREATE POLICY "Owner manages surveys"
  ON public.org_surveys FOR ALL
  TO authenticated
  USING (auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com')
  WITH CHECK (auth.uid() = org_id OR auth.email() = 'euronovaofficial@gmail.com');
