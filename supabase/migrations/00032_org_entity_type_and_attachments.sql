-- Migration 00032: Add entity_type to users_org and attachments to support_tickets & project_reports
-- Also configure support_attachments storage bucket with strict RLS (No public access)

-- 1. Add entity_type to users_org
ALTER TABLE public.users_org
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'ngo';

COMMENT ON COLUMN public.users_org.entity_type IS 'Entity categorization: ngo, informal_group, public_body.';

-- 2. Add attachments jsonb column to support_tickets and project_reports
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.support_tickets.attachments IS 'Array of photo attachment metadata (name, url, size, type).';

ALTER TABLE public.project_reports
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_reports.attachments IS 'Array of photo attachment metadata (name, url, size, type).';

-- 3. Storage bucket: support_attachments (Private, 5MB limit, JPG/PNG/WEBP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support_attachments',
  'support_attachments',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 4. Storage Row Level Security (RLS)
-- Strictly blocks public/anon access: only authenticated users can upload and view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload support attachments'
  ) THEN
    CREATE POLICY "Authenticated users can upload support attachments"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'support_attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can view support attachments'
  ) THEN
    CREATE POLICY "Authenticated users can view support attachments"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'support_attachments');
  END IF;
END $$;

