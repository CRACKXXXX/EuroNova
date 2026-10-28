-- Migration: 00024_fix_forum_category_uuid.sql
-- Fix Forum Thread Category UUID vs Text constraint crash

-- 1. Ensure all categories (including 'workshops' and 'ngo-coordination') exist in global_forum_categories
INSERT INTO public.global_forum_categories (slug, name, description, icon, display_order)
VALUES 
  (
    'workshops',
    'Workshops & Energizers',
    'Share team-building activities, icebreakers, and energizers for Erasmus+ projects.',
    'Zap',
    6
  ),
  (
    'ngo-coordination',
    'NGO & Project Coordination',
    'Coordinators & organizers space for partner search, project co-creation, and European best practices.',
    'Building2',
    1
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- 2. Drop the foreign key constraint that blocks text categories or causes 42804 incompatible type error
ALTER TABLE public.global_forum_threads 
  DROP CONSTRAINT IF EXISTS global_forum_threads_category_id_fkey;

-- 3. Alter global_forum_threads.category_id to TEXT so it seamlessly accepts both UUIDs and slug strings without 22P02 crashes
ALTER TABLE public.global_forum_threads 
  ALTER COLUMN category_id TYPE text;

-- 4. Re-ensure the index on category_id is active for high performance lookups
DROP INDEX IF EXISTS idx_global_forum_threads_category;
CREATE INDEX IF NOT EXISTS idx_global_forum_threads_category 
  ON public.global_forum_threads(category_id);
