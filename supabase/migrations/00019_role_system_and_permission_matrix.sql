-- ============================================================================
-- MIGRATION: 00019_role_system_and_permission_matrix.sql
-- DESCRIPTION: Phase 3 Role System ('admin', 'moderator', 'support', 'user')
-- ============================================================================

-- 1. Ensure users_youth has role column with default 'user'
ALTER TABLE IF EXISTS public.users_youth 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. Drop existing constraint if any and re-add 4-tier role constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_youth_role_check'
  ) THEN
    ALTER TABLE public.users_youth DROP CONSTRAINT users_youth_role_check;
  END IF;

  ALTER TABLE public.users_youth 
  ADD CONSTRAINT users_youth_role_check 
  CHECK (role IN ('admin', 'moderator', 'support', 'user'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Ensure master admin email euronovaofficial@gmail.com is set to 'admin'
UPDATE public.users_youth 
SET role = 'admin' 
WHERE email = 'euronovaofficial@gmail.com' OR id IN (
  SELECT id FROM auth.users WHERE email = 'euronovaofficial@gmail.com'
);

-- 4. Create index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_users_youth_role 
ON public.users_youth(role);
