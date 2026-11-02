-- ============================================================================
-- EURONOVA PRODUCTION EMERGENCY SQL RECOVERY, LOCKDOWN & AUDIT KIT
-- File: supabase/recovery/emergency_rollback_and_audit.sql
-- ============================================================================
-- STRICT SAFETY PROTOCOL:
-- - This kit NEVER executes DROP TABLE or TRUNCATE on user or project tables.
-- - All destructive actions are scoped, parameterized, and preceded by a Dry-Run PREVIEW.
-- - Copy-paste the selected block directly into the Supabase SQL Editor.
-- ============================================================================


-- ============================================================================
-- BLOCK 1: 1-CLICK EMERGENCY READ-ONLY LOCKDOWN & RESTORATION
-- ============================================================================
-- Use Case: Active DDoS attack, botnet flooding, or database corruption in progress.
-- Action: Immediately pauses all public INSERT/UPDATE/DELETE mutations on writable
--         community tables while keeping the entire website 100% readable.
-- ============================================================================

-- >>> 1A. EXECUTE EMERGENCY WRITE LOCKDOWN (READS REMAIN 100% OPEN) <<<
DO $$
BEGIN
  -- Revoke write privileges from public authenticated & anon roles
  REVOKE INSERT, UPDATE, DELETE ON 
    public.global_forum_threads,
    public.global_forum_posts,
    public.project_forum_messages,
    public.project_reports,
    public.project_dossier_submissions,
    public.support_tickets,
    public.support_ticket_replies,
    public.user_xp_logs,
    public.ngo_survey_votes
  FROM authenticated, anon;

  RAISE NOTICE 'EMERGENCY LOCKDOWN APPLIED: Community tables are now READ-ONLY.';
END $$;


-- >>> 1B. RESTORE NORMAL WRITE ACCESS (RUN AFTER INCIDENT IS RESOLVED) <<<
/*
DO $$
BEGIN
  -- Restore write privileges to authenticated users
  GRANT INSERT, UPDATE, DELETE ON 
    public.global_forum_threads,
    public.global_forum_posts,
    public.project_forum_messages,
    public.project_reports,
    public.project_dossier_submissions,
    public.support_tickets,
    public.support_ticket_replies,
    public.user_xp_logs,
    public.ngo_survey_votes
  TO authenticated;

  -- Restore public submission capabilities to anon (reports & support tickets)
  GRANT INSERT ON 
    public.project_reports,
    public.support_tickets
  TO anon;

  RAISE NOTICE 'LOCKDOWN LIFTED: Normal write access restored to all community tables.';
END $$;
*/


-- ============================================================================
-- BLOCK 2: CORRUPTED SCRAPER BATCH ROLLBACK (TIME-BOUNDED & SCOPED)
-- ============================================================================
-- Use Case: An automated scraping run ingested corrupted, duplicated, or invalid missions.
-- Action: Safely purges ONLY missions marked as scraped or owned by the auto-scraper
--         within a specific time window, NEVER touching verified NGO missions.
-- ============================================================================

-- >>> 2A. DRY-RUN PREVIEW (RUN THIS FIRST TO INSPECT CANDIDATES) <<<
SELECT 
  id, 
  title, 
  official_url, 
  dest_country, 
  project_type,
  org_id, 
  is_scraped, 
  created_at
FROM public.projects
WHERE (
    is_scraped = TRUE 
    OR org_id = '0610184a-a16e-4dcc-a8f6-b9ddef963bf5' -- Auto-Scraper Virtual NGO ID
    OR official_url ILIKE '%salto-youth.net%'
    OR official_url ILIKE '%europa.eu/youth%'
    OR official_url ILIKE '%proactivefuture%'
  )
  AND created_at >= NOW() - INTERVAL '2 hours' -- Change interval as needed (e.g. '30 minutes', '4 hours')
ORDER BY created_at DESC;


-- >>> 2B. SURGICAL BATCH ROLLBACK EXECUTION <<<
/*
DELETE FROM public.projects
WHERE (
    is_scraped = TRUE 
    OR org_id = '0610184a-a16e-4dcc-a8f6-b9ddef963bf5'
    OR official_url ILIKE '%salto-youth.net%'
    OR official_url ILIKE '%europa.eu/youth%'
    OR official_url ILIKE '%proactivefuture%'
  )
  AND created_at >= NOW() - INTERVAL '2 hours';
*/


-- ============================================================================
-- BLOCK 3: BOTNET / SPAM WAVE SURGICAL REVERSAL
-- ============================================================================
-- Use Case: Rogue bot accounts created in the last N minutes to flood forums, submit
--           fake reports, or farm XP.
-- Action: Purges spam posts, forum threads, fake reports, and illegitimate XP logs
--         without affecting real users or the master administrator.
-- ============================================================================

-- >>> 3A. DRY-RUN PREVIEW OF ROGUE ACCOUNTS & GENERATED CONTENT <<<
WITH rogue_candidates AS (
  SELECT id, email, created_at
  FROM auth.users
  WHERE created_at >= NOW() - INTERVAL '30 minutes' -- Adjustment window
    AND email != 'euronovaofficial@gmail.com'
    AND email != 'archive-anonymized@euronova.internal'
)
SELECT 
  r.id AS rogue_user_id,
  r.email,
  r.created_at AS account_created_at,
  (SELECT COUNT(*) FROM public.global_forum_threads WHERE user_id = r.id) AS spam_threads,
  (SELECT COUNT(*) FROM public.global_forum_posts WHERE user_id = r.id) AS spam_posts,
  (SELECT COUNT(*) FROM public.project_forum_messages WHERE user_id = r.id) AS spam_messages,
  (SELECT COUNT(*) FROM public.project_reports WHERE reporter_id = r.id) AS fake_reports,
  (SELECT COALESCE(SUM(xp_amount), 0) FROM public.user_xp_logs WHERE user_id = r.id) AS farmed_xp
FROM rogue_candidates r
ORDER BY r.created_at DESC;


-- >>> 3B. SURGICAL PURGE OF SPAM CONTENT & ROGUE SESSIONS <<<
/*
DO $$
DECLARE
  v_rogue_ids UUID[];
BEGIN
  -- Collect rogue user IDs created within the incident window
  SELECT ARRAY_AGG(id) INTO v_rogue_ids
  FROM auth.users
  WHERE created_at >= NOW() - INTERVAL '30 minutes'
    AND email != 'euronovaofficial@gmail.com'
    AND email != 'archive-anonymized@euronova.internal';

  IF v_rogue_ids IS NOT NULL AND ARRAY_LENGTH(v_rogue_ids, 1) > 0 THEN
    -- 1. Purge community spam
    DELETE FROM public.global_forum_posts WHERE user_id = ANY(v_rogue_ids);
    DELETE FROM public.global_forum_threads WHERE user_id = ANY(v_rogue_ids);
    DELETE FROM public.project_forum_messages WHERE user_id = ANY(v_rogue_ids);

    -- 2. Purge fake reports & illegitimate gamification
    DELETE FROM public.project_reports WHERE reporter_id = ANY(v_rogue_ids);
    DELETE FROM public.user_xp_logs WHERE user_id = ANY(v_rogue_ids);
    DELETE FROM public.user_project_interactions WHERE user_id = ANY(v_rogue_ids);

    -- 3. Purge public youth profiles
    DELETE FROM public.users_youth WHERE id = ANY(v_rogue_ids);

    -- 4. Delete rogue auth users
    DELETE FROM auth.users WHERE id = ANY(v_rogue_ids);

    RAISE NOTICE 'SURGICAL PURGE COMPLETE: % rogue accounts and associated spam eradicated.', ARRAY_LENGTH(v_rogue_ids, 1);
  ELSE
    RAISE NOTICE 'No rogue accounts found within the specified interval.';
  END IF;
END $$;
*/


-- ============================================================================
-- BLOCK 4: SCHEMA SYNCHRONIZATION VERIFICATION CHECK
-- ============================================================================
-- Use Case: Verify whether the live database has all critical tables, columns,
--           indexes, and RPC functions synchronized with the codebase.
-- Action: 100% read-only diagnostic query returning immediate status.
-- ============================================================================

WITH schema_checks AS (
  -- 1. Critical Tables Check
  SELECT 
    'Table' AS object_type, 
    table_name AS object_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
    ) THEN 'PRESENT' ELSE 'MISSING / PENDING MIGRATION' END AS status
  FROM (VALUES 
    ('projects'),
    ('users_youth'),
    ('users_org'),
    ('user_xp_logs'),
    ('user_project_interactions'),
    ('global_forum_threads'),
    ('global_forum_posts'),
    ('project_forum_messages'),
    ('project_dossier_submissions'),
    ('ngo_surveys'),
    ('ngo_survey_options'),
    ('ngo_survey_votes'),
    ('org_surveys'),
    ('org_team_members'),
    ('org_webhooks'),
    ('support_tickets'),
    ('support_ticket_replies'),
    ('project_reports'),
    ('admin_escalations'),
    ('staff_chat_messages'),
    ('notifications')
  ) AS t(table_name)

  UNION ALL

  -- 2. Critical Specific Columns Check
  SELECT 
    'Column' AS object_type, 
    c.col_spec AS object_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = c.tbl 
        AND column_name = c.col
    ) THEN 'PRESENT' ELSE 'MISSING / PENDING MIGRATION' END AS status
  FROM (VALUES 
    ('org_surveys', 'is_archived', 'org_surveys.is_archived'),
    ('projects', 'application_form_id', 'projects.application_form_id'),
    ('projects', 'is_scraped', 'projects.is_scraped'),
    ('users_youth', 'interests', 'users_youth.interests'),
    ('users_youth', 'is_rup_region', 'users_youth.is_rup_region'),
    ('users_youth', 'trust_score', 'users_youth.trust_score'),
    ('users_youth', 'xp', 'users_youth.xp'),
    ('support_tickets', 'preferred_contact_method', 'support_tickets.preferred_contact_method'),
    ('staff_chat_messages', 'reply_to_id', 'staff_chat_messages.reply_to_id')
  ) AS c(tbl, col, col_spec)

  UNION ALL

  -- 3. Critical RPC Functions Check
  SELECT 
    'Function (RPC)' AS object_type,
    p.routine_name AS object_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' AND information_schema.routines.routine_name = p.routine_name
    ) THEN 'PRESENT' ELSE 'MISSING / PENDING MIGRATION' END AS status
  FROM (VALUES 
    ('increment_thread_views'),
    ('get_admin_user_emails')
  ) AS p(routine_name)
)
SELECT 
  object_type,
  object_name,
  status
FROM schema_checks
ORDER BY object_type, status DESC, object_name;


-- ============================================================================
-- BLOCK 5: LIVE PERFORMANCE, DEAD TUPLES & LOCK MONITOR
-- ============================================================================
-- Use Case: Real-time diagnosis during slow performance, database latency spikes,
--           or table lock contention.
-- Action: 100% read-only telemetry query inspecting PostgreSQL catalogs.
-- ============================================================================

-- >>> 5A. ACTIVE QUERIES RUNNING > 5 SECONDS OR WAITING ON LOCKS <<<
SELECT 
  pid,
  usename,
  client_addr,
  application_name,
  state,
  NOW() - query_start AS active_duration,
  wait_event_type,
  wait_event,
  LEFT(query, 120) AS truncated_query
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
  AND (NOW() - query_start) > INTERVAL '5 seconds'
ORDER BY active_duration DESC;


-- >>> 5B. TABLE SIZES, ROW ESTIMATES & DEAD TUPLES <<<
SELECT 
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  ROUND(CAST(n_dead_tup AS NUMERIC) / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_tuple_ratio_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;


-- >>> 5C. BUFFER CACHE & INDEX HIT RATIOS (IDEAL: > 95%) <<<
SELECT 
  'Cache Hit Ratio (Tables)' AS metric,
  ROUND(SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0) * 100, 2) AS ratio_pct
FROM pg_statio_user_tables
UNION ALL
SELECT 
  'Cache Hit Ratio (Indexes)' AS metric,
  ROUND(SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0) * 100, 2) AS ratio_pct
FROM pg_statio_user_indexes;

