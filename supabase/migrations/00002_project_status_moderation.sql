-- Migration: Add/Update project status for auto-moderation
-- Allowed values: 'published', 'pending_review', 'rejected'
-- Default value: 'published'

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    ALTER TABLE projects ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published';
  ELSE
    UPDATE projects SET status = 'published' WHERE status NOT IN ('published', 'pending_review', 'rejected');
    ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'published';
  END IF;
END $$;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_status;
ALTER TABLE projects ADD CONSTRAINT chk_project_status CHECK (status IN ('published', 'pending_review', 'rejected'));
