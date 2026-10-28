-- Migration: 00016_project_forums.sql
-- Create table for project-specific discussion and Q&A forums

CREATE TABLE IF NOT EXISTS project_forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'European Volunteer',
  author_role TEXT NOT NULL DEFAULT 'volunteer' CHECK (author_role IN ('volunteer', 'coordinator', 'admin')),
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_forum_messages_project_id ON project_forum_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_forum_messages_created_at ON project_forum_messages(created_at ASC);

-- Enable Row Level Security
ALTER TABLE project_forum_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone (authenticated or anon) can read forum messages
DROP POLICY IF EXISTS "Public read forum messages" ON project_forum_messages;
CREATE POLICY "Public read forum messages"
  ON project_forum_messages
  FOR SELECT
  USING (true);

-- Policy 2: Authenticated users can insert their own messages
DROP POLICY IF EXISTS "Authenticated users can insert forum messages" ON project_forum_messages;
CREATE POLICY "Authenticated users can insert forum messages"
  ON project_forum_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can delete their own messages, or project coordinator can delete
DROP POLICY IF EXISTS "Users or project coordinators can delete forum messages" ON project_forum_messages;
CREATE POLICY "Users or project coordinators can delete forum messages"
  ON project_forum_messages
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_forum_messages.project_id AND projects.org_id = auth.uid()
    )
  );

COMMENT ON TABLE project_forum_messages IS 'Project-specific community Q&A and forum messages.';
