-- Migration: 00017_global_community.sql
-- Global Community Hub: Categorized forums, threads, posts, and seeded topics

-- 1. Global Forum Categories Table
CREATE TABLE IF NOT EXISTS public.global_forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'MessageSquare',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Global Forum Threads Table
CREATE TABLE IF NOT EXISTS public.global_forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.global_forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'European Volunteer',
  author_role TEXT NOT NULL DEFAULT 'volunteer' CHECK (author_role IN ('volunteer', 'coordinator', 'admin')),
  author_avatar TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  views INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Global Forum Posts Table (Replies)
CREATE TABLE IF NOT EXISTS public.global_forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.global_forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'European Volunteer',
  author_role TEXT NOT NULL DEFAULT 'volunteer' CHECK (author_role IN ('volunteer', 'coordinator', 'admin')),
  author_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_global_forum_categories_order ON public.global_forum_categories(display_order ASC);
CREATE INDEX IF NOT EXISTS idx_global_forum_threads_category ON public.global_forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_global_forum_threads_user ON public.global_forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_global_forum_threads_activity ON public.global_forum_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_forum_posts_thread ON public.global_forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_global_forum_posts_created ON public.global_forum_posts(created_at ASC);

-- 5. Row Level Security Setup
ALTER TABLE public.global_forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_forum_posts ENABLE ROW LEVEL SECURITY;

-- Categories RLS: Read by everyone
DROP POLICY IF EXISTS "Public read global categories" ON public.global_forum_categories;
CREATE POLICY "Public read global categories"
  ON public.global_forum_categories
  FOR SELECT
  USING (true);

-- Threads RLS: Public read, Authenticated insert/update/delete
DROP POLICY IF EXISTS "Public read global threads" ON public.global_forum_threads;
CREATE POLICY "Public read global threads"
  ON public.global_forum_threads
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users insert global threads" ON public.global_forum_threads;
CREATE POLICY "Authenticated users insert global threads"
  ON public.global_forum_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors can update their own threads" ON public.global_forum_threads;
CREATE POLICY "Authors can update their own threads"
  ON public.global_forum_threads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors or admins can delete threads" ON public.global_forum_threads;
CREATE POLICY "Authors or admins can delete threads"
  ON public.global_forum_threads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Posts RLS: Public read, Authenticated insert/delete
DROP POLICY IF EXISTS "Public read global posts" ON public.global_forum_posts;
CREATE POLICY "Public read global posts"
  ON public.global_forum_posts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users insert global posts" ON public.global_forum_posts;
CREATE POLICY "Authenticated users insert global posts"
  ON public.global_forum_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors can delete their own posts" ON public.global_forum_posts;
CREATE POLICY "Authors can delete their own posts"
  ON public.global_forum_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Seed Categories
INSERT INTO public.global_forum_categories (slug, name, description, icon, display_order)
VALUES
  (
    'ngo-discussions',
    'NGO Discussions',
    'Coordinators & organizers space for partner search, project co-creation, and European best practices.',
    'Building2',
    1
  ),
  (
    'travel-companions',
    'Find Travel Companions',
    'Connect with fellow participants, coordinate train/flight routes, and plan your journey together.',
    'Compass',
    2
  ),
  (
    'erasmus-advice',
    'Erasmus+ Advice & Prep',
    'Tips on packing, Infopacks, Youthpass, ESC insurance, travel reimbursements, and cultural prep.',
    'Lightbulb',
    3
  ),
  (
    'project-opportunities',
    'Project Opportunities',
    'Discover upcoming youth exchanges, training courses, and European Solidarity Corps volunteer vacancies.',
    'Sparkles',
    4
  ),
  (
    'general-chat',
    'Cosmic Lounge',
    'Open discussion, cultural exchanges, post-mobility memories, and informal networking across Europe.',
    'MessageSquare',
    5
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;
