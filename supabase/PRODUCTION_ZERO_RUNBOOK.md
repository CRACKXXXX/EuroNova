# ==============================================================================
# EURONOVA PRODUCTION ZERO: DATABASE RUNBOOK & OPERATIONAL PLAYBOOK
# ==============================================================================

This runbook documents the deployment sequence, disaster recovery activation, and security auditing procedures for the EuroNova Production Supabase database.

---

## 1. MIGRATION EXECUTION SEQUENCE

All migrations located in `supabase/migrations/` are idempotent and sequentially numbered.

### Option A: Automated Deployment via Supabase CLI (Recommended)
From the project root:
```bash
# 1. Link project to Supabase production instance
supabase link --project-ref <your-supabase-project-ref>

# 2. Dry-run diff check
supabase db diff

# 3. Apply all pending migrations sequentially
supabase db push
```

### Option B: Supabase Dashboard SQL Editor (Manual Deployment)
If deploying via the Supabase Web Console SQL Editor, execute migrations in exact numerical sequence:
1. `00001_initial_schema.sql` through `00026_user_notification_preferences.sql` (Base Schemas & Tables).
2. `00027_rls_hardening_and_anti_privilege_escalation.sql` (Security Policies & Anti-Spoofing).
3. `99999999_production_zero_indexes_and_rls.sql` (B-Tree/Composite Indexes & Master RLS Lockdown).

> **Idempotency Guarantee:** Re-running `99999999_production_zero_indexes_and_rls.sql` on an active database is completely non-destructive (`IF NOT EXISTS` syntax wrapped in table existence checks) and takes < 2 seconds.

---

## 2. ROW LEVEL SECURITY (RLS) AUDIT & CERTIFICATION

Every application table in the `public` schema MUST have Row Level Security enabled.

### Verification Query:
Execute this query in the Supabase SQL Editor to confirm 100% compliance across all 23 application tables:
```sql
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename ASC;
```

### Expected Output (23 Application Tables):
| Table Name | RLS Enabled |
| :--- | :---: |
| `admin_escalations` | `true` |
| `applications` | `true` |
| `global_forum_categories` | `true` |
| `global_forum_posts` | `true` |
| `global_forum_threads` | `true` |
| `ngo_survey_options` | `true` |
| `ngo_survey_votes` | `true` |
| `ngo_surveys` | `true` |
| `notification_preferences` | `true` |
| `notifications` | `true` |
| `org_reviews` | `true` |
| `org_surveys` | `true` |
| `org_team_members` | `true` |
| `org_webhooks` | `true` |
| `project_forum_messages` | `true` |
| `project_reports` | `true` |
| `projects` | `true` |
| `reviews` | `true` |
| `support_tickets` | `true` |
| `user_project_interactions` | `true` |
| `user_xp_logs` | `true` |
| `users_org` | `true` |
| `users_youth` | `true` |

> 🚨 **Critical Alert:** If any table outputs `rls_enabled = false`, immediately execute:
> `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`

---

## 3. POINT-IN-TIME RECOVERY (PITR) ACTIVATION CHECKLIST

Point-in-Time Recovery guarantees continuous Write-Ahead Log (WAL) archiving, allowing restoration to any millisecond within the retention window.

### Step-by-Step Activation:
1. Log into [Supabase Management Console](https://supabase.com/dashboard).
2. Select the **EuroNova Production** project.
3. Navigate to **Project Settings** (gear icon) -> **Database** -> **Backups**.
4. Locate the **Point-in-Time Recovery (PITR)** card:
   - Toggle **Enable PITR**.
   - Select Retention Window: **7 days** (Standard) or **30 days** (High Compliance).
5. Confirm WAL replication status indicates **Healthy / Continuous Archiving Active**.

### Disaster Recovery & Point Restoration Protocol:
If catastrophic data corruption occurs:
1. In the **Backups** tab, click **Restore to a point in time**.
2. Select the recovery timestamp: `YYYY-MM-DD HH:MM:SS UTC` (prior to the incident).
3. Choose destination:
   - **New Project Clone** (Recommended for forensic isolation and data extraction).
   - **In-place Rollback** (Requires immediate maintenance window).
4. Verify application connectivity via `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## 4. DATABASE ROLES & ACCESS CONTROL AUDIT

Verify that Supabase PostgreSQL roles enforce the Principle of Least Privilege:

```sql
SELECT 
  rolname, 
  rolcanlogin, 
  rolsuper, 
  rolcreaterole, 
  rolcreatedb
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'postgres', 'authenticator');
```

- `anon`: Unauthenticated browser traffic. Only allowed to read public projects and published forum threads. Cannot bypass RLS.
- `authenticated`: Logged-in Youth Volunteers and Organizations. Restricted strictly by user ID checks in RLS policies.
- `service_role`: Reserved exclusively for server-side API routes and background cron jobs (`/api/cron/*`). Bypasses RLS. **NEVER expose to client**.

---

## 5. INDEX HEALTH & TELEMETRY MONITORING

### A. Check Index Usage Statistics:
Confirm that newly created B-Tree and Composite indexes are actively accelerating queries:
```sql
SELECT 
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS number_of_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 25;
```

### B. Memory Cache Hit Ratio (Should be > 99% in Production):
```sql
SELECT 
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_percentage
FROM pg_statio_user_tables;
```

### C. Maintenance Vacuum & Analyze Sweep:
Run weekly or post-bulk migration to optimize PostgreSQL query planner statistics:
```sql
ANALYZE VERBOSE public.projects;
ANALYZE VERBOSE public.project_reports;
ANALYZE VERBOSE public.support_tickets;
ANALYZE VERBOSE public.admin_escalations;
ANALYZE VERBOSE public.global_forum_threads;
ANALYZE VERBOSE public.global_forum_posts;
ANALYZE VERBOSE public.notifications;
ANALYZE VERBOSE public.user_project_interactions;
```
