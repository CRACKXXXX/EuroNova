-- ============================================================================
-- MIGRATION: 00021_create_support_tickets_table.sql
-- DESCRIPTION: Provision public.support_tickets table with RLS and initial indexes.
-- GUARANTEE: Idempotent execution for clean initial provisioning.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT
);

-- Comments for documentation integrity
COMMENT ON TABLE public.support_tickets IS 'Direct user support inquiries, technical tickets, and staff resolution records.';
COMMENT ON COLUMN public.support_tickets.status IS 'Status of the ticket: open, pending, in_progress, resolved.';

-- Enable Row Level Security (Fail-Closed)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Base Performance Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at_desc ON public.support_tickets(created_at DESC);

-- Base RLS Policies (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'Users can view own tickets or staff all'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'Users can insert own tickets'
  ) THEN
    CREATE POLICY "Users can insert own tickets"
      ON public.support_tickets FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = user_id
      );
  END IF;
END $$;

