-- ==============================================================================
-- EuroNova Migration 00033: User Configurable Notification Language Preference
-- ==============================================================================
-- Adds `notification_language` preference to `users_youth`, `users_org`, and `notification_preferences`.
-- Supports full localization across the 7 official EuroNova languages:
-- 'en', 'es', 'de', 'fr', 'it', 'pt', 'ru'
-- ==============================================================================

-- 1. Add notification_language to users_youth
ALTER TABLE public.users_youth
  ADD COLUMN IF NOT EXISTS notification_language TEXT NOT NULL DEFAULT 'en'
  CHECK (notification_language IN ('en', 'es', 'de', 'fr', 'it', 'pt', 'ru'));

COMMENT ON COLUMN public.users_youth.notification_language IS 
  'Preferred language for automated emails, push dispatches, and Discord alerts (en, es, de, fr, it, pt, ru).';

-- 2. Add notification_language to users_org
ALTER TABLE public.users_org
  ADD COLUMN IF NOT EXISTS notification_language TEXT NOT NULL DEFAULT 'en'
  CHECK (notification_language IN ('en', 'es', 'de', 'fr', 'it', 'pt', 'ru'));

COMMENT ON COLUMN public.users_org.notification_language IS 
  'Preferred language for automated emails, push dispatches, and Discord alerts (en, es, de, fr, it, pt, ru).';

-- 3. Add notification_language to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notification_language TEXT NOT NULL DEFAULT 'en'
  CHECK (notification_language IN ('en', 'es', 'de', 'fr', 'it', 'pt', 'ru'));

COMMENT ON COLUMN public.notification_preferences.notification_language IS 
  'Cached user notification language preference for the dispatch trigger engine.';

-- 4. Secure RPC function to update user notification language preference with strict RLS
CREATE OR REPLACE FUNCTION public.set_user_notification_language(p_language TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to update notification language.';
  END IF;

  IF p_language NOT IN ('en', 'es', 'de', 'fr', 'it', 'pt', 'ru') THEN
    RAISE EXCEPTION 'Invalid language code. Supported: en, es, de, fr, it, pt, ru.';
  END IF;

  -- Update notification_preferences
  INSERT INTO public.notification_preferences (user_id, notification_language, updated_at)
  VALUES (v_user_id, p_language, now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    notification_language = EXCLUDED.notification_language,
    updated_at = now();

  -- Sync with users_youth if youth user
  UPDATE public.users_youth
  SET notification_language = p_language
  WHERE id = v_user_id;

  -- Sync with users_org if org user
  UPDATE public.users_org
  SET notification_language = p_language
  WHERE id = v_user_id;
END;
$$;

