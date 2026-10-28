-- Migration: Allow 'archived' status in projects table for Auto-Archiver Cron Job
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_status;
ALTER TABLE projects ADD CONSTRAINT chk_project_status CHECK (status IN ('published', 'pending_review', 'rejected', 'archived'));
