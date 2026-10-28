-- ============================================================================
-- MIGRATION: 00023_staff_hierarchy_and_escalations.sql
-- DESCRIPTION: 4-Tier Staff Hierarchy (root, admin, moderator, support) & Escalations Protocol
-- ============================================================================

-- 1. Update users_youth role check constraint to include 'root'
ALTER TABLE public.users_youth DROP CONSTRAINT IF EXISTS users_youth_role_check;
ALTER TABLE public.users_youth ADD CONSTRAINT users_youth_role_check 
  CHECK (role IN ('user', 'support', 'moderator', 'admin', 'root'));

-- Update euronovaofficial@gmail.com to 'root'
UPDATE public.users_youth 
SET role = 'root' 
WHERE email = 'euronovaofficial@gmail.com' OR id IN (
  SELECT id FROM auth.users WHERE email = 'euronovaofficial@gmail.com'
);

-- 2. Update project_reports status check constraint to include 'escalated'
ALTER TABLE public.project_reports DROP CONSTRAINT IF EXISTS project_reports_status_check;
ALTER TABLE public.project_reports ADD CONSTRAINT project_reports_status_check 
  CHECK (status IN ('pending', 'reviewed', 'resolved', 'escalated'));

-- 3. Create admin_escalations table for formal staff-to-admin escalation protocol
CREATE TABLE IF NOT EXISTS public.admin_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  escalated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  escalated_by_role TEXT NOT NULL DEFAULT 'moderator',
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT,
  reason TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_escalations_status ON public.admin_escalations(status);
CREATE INDEX IF NOT EXISTS idx_admin_escalations_created_at ON public.admin_escalations(created_at DESC);
