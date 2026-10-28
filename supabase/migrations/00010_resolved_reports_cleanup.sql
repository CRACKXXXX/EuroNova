-- ============================================================
-- EuroNova Migration 00010: Resolved Reports Auto-Cleanup (pg_cron)
-- Adds `resolved_at` timestamp & schedules daily cleanup for 72h+ resolved reports
-- ============================================================

-- 1. Add resolved_at column to project_reports table
ALTER TABLE project_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 2. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Idempotently schedule daily cron job at midnight (UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete_old_resolved_reports') THEN
    PERFORM cron.unschedule('delete_old_resolved_reports');
  END IF;
END $$;

SELECT cron.schedule(
  'delete_old_resolved_reports',
  '0 0 * * *',
  $$ DELETE FROM project_reports WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '3 days'; $$
);
