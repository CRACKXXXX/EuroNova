-- Migration: Expand project types for pre-scraper preparation
-- Supported types: 'YE', 'TC', 'ESC', 'PBA', 'SV', 'SE', 'VET', 'CBY'

ALTER TABLE projects ALTER COLUMN project_type TYPE VARCHAR(20) USING project_type::text;

UPDATE projects SET project_type = 'YE' WHERE project_type = 'Youth Exchange';
UPDATE projects SET project_type = 'TC' WHERE project_type = 'Training';

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_type;
ALTER TABLE projects ADD CONSTRAINT chk_project_type CHECK (
  project_type IN ('YE', 'TC', 'ESC', 'PBA', 'SV', 'SE', 'VET', 'CBY')
);
