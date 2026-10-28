-- ============================================================
-- Migration 00013: Anti-Farming XP Logs Table & Security Policies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_xp_action UNIQUE (user_id, action_type, target_id)
);

COMMENT ON TABLE public.user_xp_logs IS 'Auditoría estricta de recompensas de XP para evitar farming y abuso.';
COMMENT ON COLUMN public.user_xp_logs.action_type IS 'Tipo de acción (apply_mission, profile_completion, daily_passive, ngo_review).';
COMMENT ON COLUMN public.user_xp_logs.target_id IS 'Identificador único del objetivo (project_id, slug, o slot diario YYYY-MM-DD_slot_X).';

-- Índices para consultas de auditoría y límites diarios
CREATE INDEX IF NOT EXISTS idx_user_xp_logs_user_action 
  ON public.user_xp_logs (user_id, action_type);

CREATE INDEX IF NOT EXISTS idx_user_xp_logs_created_at 
  ON public.user_xp_logs (user_id, created_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.user_xp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own XP logs" ON public.user_xp_logs;
CREATE POLICY "Users can view their own XP logs"
  ON public.user_xp_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own XP logs" ON public.user_xp_logs;
CREATE POLICY "Users can insert their own XP logs"
  ON public.user_xp_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
