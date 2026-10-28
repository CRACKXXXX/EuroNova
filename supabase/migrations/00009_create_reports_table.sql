-- ============================================================
-- EuroNova Migration 00009: Real Moderation System
-- Creates `project_reports` table & adds optional role column
-- ============================================================

-- 1. Ensure `role` column exists on `users_youth` for granular RBAC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users_youth' AND column_name = 'role'
  ) THEN
    ALTER TABLE users_youth ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- 2. Create `project_reports` table
CREATE TABLE IF NOT EXISTS project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for schema documentation
COMMENT ON TABLE project_reports IS 'Transmissions and user reports flagging suspicious or non-compliant mobility projects.';
COMMENT ON COLUMN project_reports.reason IS 'Reason category (e.g., scam, unauthorized fee, inactive, broken link, other).';
COMMENT ON COLUMN project_reports.status IS 'Moderation triage status: pending, reviewed, or resolved.';

-- 3. High-performance lookup indices
CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_status ON project_reports(status);
CREATE INDEX IF NOT EXISTS idx_project_reports_created_at ON project_reports(created_at DESC);

-- 4. Row Level Security (RLS)
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous) to insert reports safely
DROP POLICY IF EXISTS "Allow public and authenticated to insert reports" ON project_reports;
CREATE POLICY "Allow public and authenticated to insert reports"
  ON project_reports
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to view only their own submitted reports
DROP POLICY IF EXISTS "Users can view own reports" ON project_reports;
CREATE POLICY "Users can view own reports"
  ON project_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Service role bypasses RLS automatically. For direct admin client queries:
DROP POLICY IF EXISTS "Admin full access to reports" ON project_reports;
CREATE POLICY "Admin full access to reports"
  ON project_reports
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM users_youth WHERE id = auth.uid() AND role = 'admin'
    )
  );
