# EuroNova — API Reference, Telemetry & Webhooks Manual

**Version:** 1.0.0 — Technical Reference & External Audit Document  
**OpenAPI 3.1 Specification:** [`openapi.yaml`](openapi.yaml)  
**Production Host:** `https://euronova.vercel.app`  
**Development Host:** `http://localhost:3000`  

---

## 1. Security & Authentication Model

All Route Handlers and background endpoints in EuroNova implement a multi-layered security framework:

### 1.1 Constant-Time Cryptographic Verification (`CRON_SECRET`)
To prevent Timing Side-Channel Attacks, the `Authorization: Bearer <CRON_SECRET>` header is evaluated via:
1. **SHA-256 pre-hashing** of both tokens (the incoming token and `process.env.CRON_SECRET`), guaranteeing identical 32-byte buffers.
2. Bitwise comparison utilizing Node.js `crypto.timingSafeEqual`.
3. Ensures execution time is strictly identical regardless of character match length or invalid prefixes.

### 1.2 Root Admin Fallback Session
If a manual maintenance request is initiated from an authenticated browser session without a Bearer header, the authorization guard (`lib/cronAuth.ts`) inspects the Supabase Auth session in cookies. If the caller holds the `root` role (or matches the master administrative email), the request is legitimately authorized.

### 1.3 In-Memory Concurrency Lock (*Overlap Lock*)
Resource-intensive pipelines such as the Auto-Scraper enforce an in-memory lock flag (`isScrapeRunning`) with a 60-second automatic safety release (`SCRAPE_LOCK_TIMEOUT_MS`). If a concurrent invocation arrives while a cycle is active, it is immediately discarded with **HTTP 429 Too Many Requests**, preventing CPU and memory exhaustion across serverless runtimes.

---

## 2. Detailed Endpoints Catalog

---

### `GET /api/health`
**Purpose:** Real-time, un-cached telemetry assessing infrastructure vitality and measuring round-trip database latency with Supabase PostgreSQL.

* **Authentication:** Public (No token required).
* **Cache Headers:** `Cache-Control: no-store, no-cache, must-revalidate`.

#### Internal Diagnostics:
1. Executes concurrent, lightweight SQL queries to primary tables (`projects` and `org_surveys`).
2. Calculates precision latency via `performance.now()`.
3. Returns `db_connected: true` and `status: "healthy"` with **HTTP 200 OK** whenever database connectivity is operational.
4. Reports migration state in `schema_ready` (confirming all recent migrations are applied).

#### Example `curl` (Local):
```bash
curl -X GET http://localhost:3000/api/health \
  -H "Accept: application/json"
```

#### Example `curl` (Production):
```bash
curl -X GET https://euronova.vercel.app/api/health \
  -H "Accept: application/json"
```

#### Successful Response (`200 OK`):
```json
{
  "status": "healthy",
  "db_connected": true,
  "schema_ready": true,
  "latency_ms": 118.42,
  "timestamp": "2026-11-02T01:45:00.000Z"
}
```

---

### `POST /api/telemetry/error`
**Purpose:** Ingests unhandled runtime exceptions and error reports intercepted by React 19 client Error Boundaries.

* **Authentication:** Public (Rate-limited, strictly bounded payload).
* **Payload Limit:** **10 KB (10,240 bytes)**. Requests exceeding this return **HTTP 413 Payload Too Large**.
* **Rate Limiting:** Sliding-window by client IP. Excess requests return **HTTP 429 Too Many Requests**.

#### Privacy & Security Defenses:
1. **Server-Side PII Scrubbing:** All messages, error names, and stack traces pass through `scrubPII` before storage or alerting:
   - Email addresses (`[REDACTED_EMAIL]`).
   - JWT tokens and API keys (`[REDACTED_TOKEN]`).
   - Passwords and database connection URIs.
2. **IP Anonymization:** Origin IP addresses are masked (e.g., `192.168.1.***`).
3. **Optional Discord Alerts:** If `DISCORD_WEBHOOK_URL` is set, dispatches an enriched security notification.

#### Example `curl` (Local):
```bash
curl -X POST http://localhost:3000/api/telemetry/error \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TypeError",
    "message": "Cannot read properties of undefined (reading '\''map'\'')",
    "route": "/en/community",
    "digest": "2847193751",
    "timestamp": "2026-11-02T01:45:00.000Z"
  }'
```

#### Example `curl` (Production):
```bash
curl -X POST https://euronova.vercel.app/api/telemetry/error \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ChunkLoadError",
    "message": "Loading chunk failed",
    "route": "/en/projects"
  }'
```

#### Successful Response (`200 OK`):
```json
{
  "success": true
}
```

---

### `GET /api/scraper/official`
**Purpose:** Autonomous ingestion and curation engine for European youth opportunities (SALTO-Youth, European Youth Portal ESC, Proactive Projects, and Youth Exchange aggregators).

* **Authentication:** `Authorization: Bearer <CRON_SECRET>` or active `root`/`admin` session.
* **Max Execution Time:** 60 seconds (`maxDuration: 60`).
* **Concurrency Guard:** Rejects with **HTTP 429** if a scraper execution is currently running.

#### Example `curl` (Local):
```bash
curl -X GET http://localhost:3000/api/scraper/official \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Example `curl` (Production):
```bash
curl -X GET https://euronova.vercel.app/api/scraper/official \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "source": "multisource_aggregator",
  "inserted": 8,
  "duplicates_skipped": 14,
  "duration_ms": 14250,
  "inserted_projects": [
    {
      "id": "e4b2d180-77a2-4a0b-9679-b1d567890123",
      "title": "Green Solidarity in Rural Communities",
      "status": "published",
      "duration_days": 180
    }
  ]
}
```

---

### `GET /api/cron/scrape`
**Purpose:** Background cron orchestrator scheduled in Vercel (`0 2 * * *` — Daily at 02:00 AM UTC).

* **Authentication:** `Authorization: Bearer <CRON_SECRET>`.
* **Mechanism:** Safely delegates in-process to `/api/scraper/official` without duplicating extraction logic.

#### Example `curl` (Production):
```bash
curl -X GET https://euronova.vercel.app/api/cron/scrape \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "cron_triggered_at": "2026-11-02T02:00:00.000Z",
  "source": "multisource_aggregator",
  "inserted": 8,
  "duplicates_skipped": 14
}
```

---

### `GET /api/cron/archive`
**Purpose:** Automated archival cron with a 60-day safety buffer (`0 3 * * *` — Daily at 03:00 AM UTC).

* **Authentication:** `Authorization: Bearer <CRON_SECRET>`.
* **Failsafe Rules:** Only transitions projects with `status = 'published'` whose `end_date` expired **more than 60 days ago**, preventing premature removal of projects with extended application windows. Runs in batches of 100 to avoid table locks.

#### Example `curl` (Production):
```bash
curl -X GET https://euronova.vercel.app/api/cron/archive \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "message": "Archival process complete. Archived 5 projects older than 60 days past end date.",
  "cutoff_date": "2026-09-03",
  "archived_count": 5,
  "archived_ids": ["c1a2b3d4-0000-4000-8000-000000000001"],
  "timestamp": "2026-11-02T03:00:00.000Z"
}
```

---

### `GET` / `POST /api/cron/purge-logs`
**Purpose:** 48-hour retention cleanup of resolved support tickets and moderation logs (`0 4 * * *` — Daily at 04:00 AM UTC).

* **Authentication:** `Authorization: Bearer <CRON_SECRET>`.
* **GDPR Principle:** Data Minimization (Art. 5.1.c). Purges resolved moderation reports, support tickets, and escalations resolved over 48 hours ago.

#### Example `curl` (Production):
```bash
curl -X POST https://euronova.vercel.app/api/cron/purge-logs \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "timestamp": "2026-11-02T04:00:00.000Z",
  "cutoffDate": "2026-10-31T04:00:00.000Z",
  "purged": {
    "reportsCount": 3,
    "ticketsCount": 7,
    "escalationsCount": 2
  },
  "errors": {
    "reports": null,
    "tickets": null,
    "escalations": null
  }
}
```

---

### `GET` / `POST /api/cron/inactivity-purge`
**Purpose:** Permanent purge of user accounts inactive for > 2 years (`0 5 * * *` — Daily at 05:00 AM UTC).

* **Authentication:** `Authorization: Bearer <CRON_SECRET>`.
* **GDPR Principle:** Storage Limitation (Art. 5.1.e).
* **Art. 17 Preservation:** To preserve community forum threads and relational referential integrity without retaining personal data, inactive accounts are anonymized to a system Ghost User (`"Deleted User"`), permanently deleting auth credentials, profile information, and private dossiers.

#### Example `curl` (Production):
```bash
curl -X POST https://euronova.vercel.app/api/cron/inactivity-purge \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Successful Response (`200 OK`):
```json
{
  "success": true,
  "timestamp": "2026-11-02T05:00:00.000Z",
  "retentionRule": "2 Years Data Decay (GDPR Art. 5.1.e)",
  "cutoffDate": "2024-11-02T05:00:00.000Z",
  "totalInactiveDetected": 2,
  "purgedCount": 2,
  "purgedUsers": [
    {
      "id": "u1a2b3c4-0000-4000-8000-000000000001",
      "maskedEmail": "jo***a@gmail.com",
      "lastActivity": "2024-05-10T12:00:00.000Z"
    }
  ],
  "errors": []
}
```

---

## 3. Failsafe Webhook & SMTP Architecture (Non-Blocking Timeouts)

To ensure external service disruptions (e.g., Discord downtime, network congestion, or slow Google SMTP servers) **never block user interactions** or cause 60-second timeouts on Vercel, all external dispatches enforce a strict **5-second timeout limit**:

### 3.1 Outgoing Webhooks (Discord / Slack)
```typescript
// Implementation in lib/externalAlerts.ts
const res = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(5000), // Mandatory abort after 5000ms
  redirect: "error",                 // Prevents unsecure redirects (Anti-SSRF)
});
```

### 3.2 Transactional Email Delivery (SMTP / Nodemailer)
```typescript
// Promise race with 5000ms timeout in lib/externalAlerts.ts
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error("SMTP timeout after 5000ms")), 5000)
);

const sendPromise = transporter.sendMail({ ...mailOptions });

// If SMTP takes > 5 seconds, timeoutPromise wins and the error is cleanly caught
await Promise.race([sendPromise, timeoutPromise]);
```

### 3.3 Anti-SSRF Protection on Webhooks
All user- or staff-configured webhook URLs are validated via `validateSafeHttpsUrl`:
- Rejects non-`https://` protocols.
- Blocks local and private IP ranges (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Blocks cloud metadata service endpoints (`169.254.169.254`).
