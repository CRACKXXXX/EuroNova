-- Migration 00030: Add Discord-like features to staff_chat_messages (edit, delete, replies)
DO $$ 
BEGIN
  -- 1. Add is_edited column if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'staff_chat_messages' AND column_name = 'is_edited'
  ) THEN
    ALTER TABLE public.staff_chat_messages ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- 2. Add reply_to_id self-referencing column if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'staff_chat_messages' AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE public.staff_chat_messages 
      ADD COLUMN reply_to_id UUID REFERENCES public.staff_chat_messages(id) ON DELETE SET NULL;
  END IF;

  -- 3. Add deleted_at column for soft deletes if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'staff_chat_messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.staff_chat_messages ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- 4. Create performance indexes for relational lookups
  CREATE INDEX IF NOT EXISTS idx_staff_chat_reply_to_id 
    ON public.staff_chat_messages(reply_to_id) 
    WHERE reply_to_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_staff_chat_deleted_at 
    ON public.staff_chat_messages(deleted_at) 
    WHERE deleted_at IS NOT NULL;

  -- 5. Harden RLS update policy so staff authors can edit their own messages
  DROP POLICY IF EXISTS "Staff admins and mods can update staff chat messages" ON public.staff_chat_messages;
  DROP POLICY IF EXISTS "Staff members can update staff chat messages" ON public.staff_chat_messages;

  CREATE POLICY "Staff members can update staff chat messages"
    ON public.staff_chat_messages FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = user_id OR
      auth.email() = 'euronovaofficial@gmail.com' OR
      EXISTS (
        SELECT 1 FROM public.users_youth 
        WHERE id = auth.uid() AND role IN ('root', 'admin', 'moderator')
      )
    );
END $$;

