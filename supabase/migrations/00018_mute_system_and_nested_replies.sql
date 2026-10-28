-- ============================================================
-- EuroNova Migration 00018: Mute/Timeout System, Nested Replies & Quarantine Tray
-- ============================================================

-- 1. Add muted_until timestamp to users_youth and users_org
ALTER TABLE public.users_youth 
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.users_org 
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.users_youth.muted_until IS 'Timestamp until which the user is temporarily muted from posting.';
COMMENT ON COLUMN public.users_org.muted_until IS 'Timestamp until which the organization is temporarily muted from posting.';

-- 2. Add parent_id to project_forum_messages for 1-level deep nested replies
ALTER TABLE public.project_forum_messages 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.project_forum_messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_forum_messages_parent_id ON public.project_forum_messages(parent_id);

COMMENT ON COLUMN public.project_forum_messages.parent_id IS 'Parent message ID for nested 1-level replies.';

-- 3. Upgrade project_reports target_type constraint to allow 'quarantine' and 'comment'
ALTER TABLE public.project_reports DROP CONSTRAINT IF EXISTS chk_report_target_type;
ALTER TABLE public.project_reports ADD CONSTRAINT chk_report_target_type 
  CHECK (target_type IN ('project', 'organization', 'user', 'quarantine', 'comment'));
