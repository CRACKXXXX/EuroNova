-- Migration: Allow nullable dest_country for scraped projects where destination is not yet specified
ALTER TABLE projects ALTER COLUMN dest_country DROP NOT NULL;
