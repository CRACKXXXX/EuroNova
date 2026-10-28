-- Migration: 00025_resolution_actions_and_purge_timestamps.sql
-- Add explicit resolution_action, updated_at and resolved_at for reports and tickets

-- 1. project_reports
ALTER TABLE public.project_reports
  ADD COLUMN IF NOT EXISTS resolution_action TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.project_reports
SET resolution_action = 'Resolved by Administrator'
WHERE status = 'resolved' AND resolution_action IS NULL;

-- 2. support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_action TEXT;

UPDATE public.support_tickets
SET resolved_at = created_at, resolution_action = 'Resolved by Support Specialist'
WHERE status = 'resolved' AND resolved_at IS NULL;

-- 3. admin_escalations
ALTER TABLE public.admin_escalations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolution_action TEXT;

-- 4. Indexes for fast cron purge lookups
CREATE INDEX IF NOT EXISTS idx_project_reports_status_updated 
  ON public.project_reports(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_updated 
  ON public.support_tickets(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_admin_escalations_status_updated 
  ON public.admin_escalations(status, updated_at);
