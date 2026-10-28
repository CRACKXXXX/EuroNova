-- ============================================================
-- EuroNova Migration 00022: Update report target type constraint
-- Adds 'survey' to valid target_type options for project_reports
-- ============================================================

ALTER TABLE public.project_reports DROP CONSTRAINT IF EXISTS chk_report_target_type;
ALTER TABLE public.project_reports ADD CONSTRAINT chk_report_target_type CHECK (target_type IN ('user', 'comment', 'project', 'organization', 'survey'));
