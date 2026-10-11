-- Migration: Allow nullable org_id for automated scraper projects
-- Sets default min_age and max_age for scraped projects

ALTER TABLE projects ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN min_age SET DEFAULT 18;
ALTER TABLE projects ALTER COLUMN max_age SET DEFAULT 30;
