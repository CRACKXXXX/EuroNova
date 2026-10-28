-- ============================================================
-- Migration 00011: Add XP and Trust Score to users_youth
-- ============================================================

ALTER TABLE public.users_youth 
ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.users_youth.xp IS 'Experience Points (XP) accumulated through missions and activities. Level = floor(xp / 100) + 1.';
COMMENT ON COLUMN public.users_youth.trust_score IS 'Trust and reputation score out of 100 (Default: 50).';
