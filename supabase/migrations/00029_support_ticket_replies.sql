-- ============================================================================
-- EuroNova Migration 00029: Two-Way Support Ticket Replies and Thread Chat
-- DESCRIPTION: Provisions public.support_ticket_replies table with RLS, indexes,
-- and backfills existing resolution actions as inaugural staff replies.
-- GUARANTEE: Idempotent execution for clean migrations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.support_ticket_replies IS 'Two-way message thread for support tickets.';
COMMENT ON COLUMN public.support_ticket_replies.sender_role IS 'Role of reply sender: user, support, moderator, admin, root';

-- Enable Row Level Security (Fail-Closed)
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id 
  ON public.support_ticket_replies(ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_sender_id 
  ON public.support_ticket_replies(sender_id);

-- Idempotent RLS Policies
DROP POLICY IF EXISTS "Users can view replies for own tickets or staff all" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Users or staff can insert ticket replies" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Admins can delete ticket replies" ON public.support_ticket_replies;

-- 1. SELECT: Users can view replies on tickets they own; staff can view all replies
CREATE POLICY "Users can view replies for own tickets or staff all"
  ON public.support_ticket_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_ticket_replies.ticket_id
        AND (
          st.user_id = auth.uid()
          OR auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
          OR EXISTS (
            SELECT 1 FROM public.users_youth uy
            WHERE uy.id = auth.uid() AND uy.role IN ('support', 'moderator', 'admin', 'root')
          )
        )
    )
  );

-- 2. INSERT: Users can insert replies on their own tickets; staff can insert on any ticket
CREATE POLICY "Users or staff can insert ticket replies"
  ON public.support_ticket_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_ticket_replies.ticket_id
        AND (
          (st.user_id = auth.uid() AND (sender_id IS NULL OR sender_id = auth.uid()))
          OR auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
          OR EXISTS (
            SELECT 1 FROM public.users_youth uy
            WHERE uy.id = auth.uid() AND uy.role IN ('support', 'moderator', 'admin', 'root')
          )
        )
    )
  );

-- 3. DELETE: Only admins or root can delete replies
CREATE POLICY "Admins can delete ticket replies"
  ON public.support_ticket_replies FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'euronovaofficial@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.users_youth uy
      WHERE uy.id = auth.uid() AND uy.role IN ('admin', 'root')
    )
  );

-- 4. Backfill existing resolution actions as staff replies for legacy tickets
INSERT INTO public.support_ticket_replies (ticket_id, sender_role, sender_name, message, created_at)
SELECT 
  id AS ticket_id,
  'support' AS sender_role,
  'EuroNova Support Specialist' AS sender_name,
  resolution_action AS message,
  COALESCE(resolved_at, updated_at, created_at) AS created_at
FROM public.support_tickets
WHERE resolution_action IS NOT NULL AND trim(resolution_action) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.support_ticket_replies str
    WHERE str.ticket_id = public.support_tickets.id
  );

