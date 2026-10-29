-- ============================================================
-- EuroNova Migration 00028: Soft-Delete for Organization Survey Templates
-- Adds is_archived column to prevent orphan dossier submissions
-- ============================================================

ALTER TABLE public.org_surveys 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_org_surveys_org_archived 
ON public.org_surveys (org_id, is_archived);

