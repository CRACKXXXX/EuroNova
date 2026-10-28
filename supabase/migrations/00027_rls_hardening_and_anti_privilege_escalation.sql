-- ============================================================================
-- MIGRATION: 00027_rls_hardening_and_anti_privilege_escalation.sql
-- DESCRIPTION: Phase D1: Supabase RLS Hardening, Column-Level Privilege Escalation Protection & Forum Anti-Spoofing
-- ============================================================================

-- Ensure muted_until exists on users_youth and users_org for moderation enforcement
ALTER TABLE public.users_youth ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users_org ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 1. HARDEN RLS ON admin_escalations
-- ----------------------------------------------------------------------------
ALTER TABLE public.admin_escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can select escalations" ON public.admin_escalations;
DROP POLICY IF EXISTS "Staff can insert escalations" ON public.admin_escalations;
DROP POLICY IF EXISTS "Admins can update escalations" ON public.admin_escalations;
DROP POLICY IF EXISTS "Admins can delete escalations" ON public.admin_escalations;
DROP POLICY IF EXISTS "Allow public and authenticated to insert escalations" ON public.admin_escalations;

-- SELECT: Only staff (moderator, admin, root) or master email
CREATE POLICY "Staff can select escalations"
  ON public.admin_escalations FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth 
      WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'root')
    )
  );

-- INSERT: Only staff (moderator, admin, root) or master email
CREATE POLICY "Staff can insert escalations"
  ON public.admin_escalations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth 
      WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'root')
    )
  );

-- UPDATE: Only admins / root
CREATE POLICY "Admins can update escalations"
  ON public.admin_escalations FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth 
      WHERE id = auth.uid() AND role IN ('admin', 'root')
    )
  );

-- DELETE: Only admins / root
CREATE POLICY "Admins can delete escalations"
  ON public.admin_escalations FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth 
      WHERE id = auth.uid() AND role IN ('admin', 'root')
    )
  );

-- ----------------------------------------------------------------------------
-- 2. HARDEN RLS ON support_tickets
-- ----------------------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets or staff all" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Public can view support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Public can insert support tickets" ON public.support_tickets;

-- SELECT: User views own tickets; Staff (support, moderator, admin, root) views all
CREATE POLICY "Users can view own tickets or staff all"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth
      WHERE id = auth.uid() AND role IN ('support', 'moderator', 'admin', 'root')
    )
  );

-- INSERT: Authenticated users can insert their own tickets
CREATE POLICY "Users can insert own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- UPDATE: Staff can update status, resolution_action, resolved_at
CREATE POLICY "Staff can update support tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth
      WHERE id = auth.uid() AND role IN ('support', 'moderator', 'admin', 'root')
    )
  );

-- DELETE: Only admins / root can delete tickets
CREATE POLICY "Admins can delete support tickets"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth
      WHERE id = auth.uid() AND role IN ('admin', 'root')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. HARDEN RLS ON user_xp_logs
-- ----------------------------------------------------------------------------
-- Revoke authenticated user direct insert on user_xp_logs.
-- Mutations to user_xp_logs MUST strictly pass through backend service_role.
DROP POLICY IF EXISTS "Users can insert their own XP logs" ON public.user_xp_logs;

-- Ensure SELECT policy allows users to view only their own logs
DROP POLICY IF EXISTS "Users can view their own XP logs" ON public.user_xp_logs;
CREATE POLICY "Users can view their own XP logs"
  ON public.user_xp_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth WHERE id = auth.uid() AND role IN ('admin', 'root')
    )
  );

-- ----------------------------------------------------------------------------
-- 4. ANTI-MASS ASSIGNMENT: COLUMN PROTECTION TRIGGER ON users_youth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protect_users_youth_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Detect caller execution role
  caller_role := auth.role();

  -- If execution is from client/authenticated session
  IF caller_role = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      -- Force default security parameters on insert from authenticated users
      NEW.role := 'user';
      NEW.xp := 0;
      IF NEW.trust_score IS NULL OR NEW.trust_score > 50 THEN
        NEW.trust_score := 50;
      END IF;
      NEW.muted_until := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Block any modification of sensitive columns
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying role is strictly forbidden.';
      END IF;

      IF NEW.xp IS DISTINCT FROM OLD.xp THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying XP directly is strictly forbidden.';
      END IF;

      IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying trust_score directly is strictly forbidden.';
      END IF;

      IF NEW.muted_until IS DISTINCT FROM OLD.muted_until THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying muted_until directly is strictly forbidden.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_users_youth_columns ON public.users_youth;
CREATE TRIGGER trg_protect_users_youth_columns
  BEFORE INSERT OR UPDATE ON public.users_youth
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_users_youth_columns();

-- ----------------------------------------------------------------------------
-- 5. ANTI-MASS ASSIGNMENT: COLUMN PROTECTION TRIGGER ON users_org
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protect_users_org_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  caller_role := auth.role();

  IF caller_role = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      -- Newly self-registered organizations must NOT be pre-verified
      NEW.is_verified := FALSE;
      NEW.verified := FALSE;
      NEW.verification_status := 'pending';
      NEW.muted_until := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying is_verified is strictly forbidden.';
      END IF;

      IF NEW.verified IS DISTINCT FROM OLD.verified THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying verified is strictly forbidden.';
      END IF;

      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying verification_status is strictly forbidden.';
      END IF;

      IF NEW.muted_until IS DISTINCT FROM OLD.muted_until THEN
        RAISE EXCEPTION 'Privilege escalation detected: Modifying muted_until is strictly forbidden.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_users_org_columns ON public.users_org;
CREATE TRIGGER trg_protect_users_org_columns
  BEFORE INSERT OR UPDATE ON public.users_org
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_users_org_columns();

-- ----------------------------------------------------------------------------
-- 6. FORUM ANTI-ROLE SPOOFING TRIGGERS
-- ----------------------------------------------------------------------------

-- 6.1 Function to resolve verified author role for community forums
CREATE OR REPLACE FUNCTION public.fn_resolve_verified_forum_role(p_user_id UUID, p_project_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_youth_role TEXT;
  v_is_org BOOLEAN;
  v_is_project_coord BOOLEAN;
BEGIN
  -- 1. Check if user is staff / admin in users_youth
  SELECT role INTO v_youth_role FROM public.users_youth WHERE id = p_user_id;
  IF v_youth_role IN ('admin', 'root') THEN
    RETURN 'admin';
  END IF;

  -- 2. If project forum, check if user is the organization owner or coordinator of the project
  IF p_project_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.projects WHERE id = p_project_id AND org_id = p_user_id
    ) INTO v_is_project_coord;

    IF v_is_project_coord THEN
      RETURN 'coordinator';
    END IF;
  END IF;

  -- 3. Check if user is an organization
  SELECT EXISTS (
    SELECT 1 FROM public.users_org WHERE id = p_user_id
  ) INTO v_is_org;

  IF v_is_org THEN
    RETURN 'coordinator';
  END IF;

  -- 4. Default verified role
  RETURN 'volunteer';
END;
$$;

-- 6.2 Trigger on project_forum_messages
CREATE OR REPLACE FUNCTION public.fn_enforce_project_forum_author_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.author_role := public.fn_resolve_verified_forum_role(NEW.user_id, NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_forum_author_role ON public.project_forum_messages;
CREATE TRIGGER trg_enforce_project_forum_author_role
  BEFORE INSERT OR UPDATE ON public.project_forum_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_project_forum_author_role();

-- 6.3 Trigger on global_forum_threads
CREATE OR REPLACE FUNCTION public.fn_enforce_global_thread_author_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_staff BOOLEAN;
BEGIN
  IF auth.role() = 'authenticated' THEN
    -- Enforce genuine author_role
    NEW.author_role := public.fn_resolve_verified_forum_role(NEW.user_id, NULL);

    -- Check if attempting to pin or lock thread without staff privileges
    IF TG_OP = 'UPDATE' THEN
      IF (NEW.is_pinned IS DISTINCT FROM OLD.is_pinned) OR (NEW.is_locked IS DISTINCT FROM OLD.is_locked) THEN
        SELECT EXISTS (
          SELECT 1 FROM public.users_youth 
          WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'root')
        ) INTO is_staff;

        IF NOT is_staff AND auth.jwt() ->> 'email' != 'euronovaofficial@gmail.com' THEN
          RAISE EXCEPTION 'Privilege escalation detected: Only moderators and admins can pin or lock threads.';
        END IF;
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      IF NEW.is_pinned OR NEW.is_locked THEN
        SELECT EXISTS (
          SELECT 1 FROM public.users_youth 
          WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'root')
        ) INTO is_staff;

        IF NOT is_staff AND auth.jwt() ->> 'email' != 'euronovaofficial@gmail.com' THEN
          NEW.is_pinned := FALSE;
          NEW.is_locked := FALSE;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_global_thread_author_role ON public.global_forum_threads;
CREATE TRIGGER trg_enforce_global_thread_author_role
  BEFORE INSERT OR UPDATE ON public.global_forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_global_thread_author_role();

-- 6.4 Trigger on global_forum_posts
CREATE OR REPLACE FUNCTION public.fn_enforce_global_post_author_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.author_role := public.fn_resolve_verified_forum_role(NEW.user_id, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_global_post_author_role ON public.global_forum_posts;
CREATE TRIGGER trg_enforce_global_post_author_role
  BEFORE INSERT OR UPDATE ON public.global_forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_global_post_author_role();

-- ----------------------------------------------------------------------------
-- 7. REINFORCE PROJECTS RLS WITH ADMIN BYPASS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
CREATE POLICY "Admins can update all projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = org_id
    OR auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth WHERE id = auth.uid() AND role IN ('admin', 'root')
    )
  );

DROP POLICY IF EXISTS "Admins can delete all projects" ON public.projects;
CREATE POLICY "Admins can delete all projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    auth.uid() = org_id
    OR auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth WHERE id = auth.uid() AND role IN ('admin', 'root')
    )
  );
