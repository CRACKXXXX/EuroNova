-- ============================================================
-- EuroNova Migration 00015: 360º Moderation & Global Reporting
-- Upgrades project_reports to support Projects, Organizations, and Users
-- ============================================================

-- 1. Make project_id nullable so reports can target other entities
ALTER TABLE public.project_reports ALTER COLUMN project_id DROP NOT NULL;

-- 2. Add target_type column with default 'project'
ALTER TABLE public.project_reports 
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'project';

-- 3. Add target entity foreign keys
ALTER TABLE public.project_reports 
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.users_org(id) ON DELETE CASCADE;

ALTER TABLE public.project_reports 
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Add target_name snapshot for robust display
ALTER TABLE public.project_reports 
  ADD COLUMN IF NOT EXISTS target_name TEXT;

-- 5. Add check constraint to ensure target_type is valid
ALTER TABLE public.project_reports DROP CONSTRAINT IF EXISTS chk_report_target_type;
ALTER TABLE public.project_reports ADD CONSTRAINT chk_report_target_type 
  CHECK (target_type IN ('project', 'organization', 'user'));

-- 6. Add indices for high performance lookups
CREATE INDEX IF NOT EXISTS idx_project_reports_target_type ON public.project_reports(target_type);
CREATE INDEX IF NOT EXISTS idx_project_reports_org_id ON public.project_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_target_user_id ON public.project_reports(target_user_id);
