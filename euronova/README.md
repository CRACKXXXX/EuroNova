# 🌌 EuroNova — Cosmic Platform for European Volunteering and Youth Opportunities

![Next.js 15](https://img.shields.io/badge/Next.js-15.0%2B-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E?style=for-the-badge&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict_v5-3178C6?style=for-the-badge&logo=typescript)
![i18n](https://img.shields.io/badge/i18n-7_Locales_(100%25)-purple?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Vercel-Production_Edge-000000?style=for-the-badge&logo=vercel)

EuroNova is a high-performance, modern web platform engineered to connect young individuals with European volunteering opportunities, Erasmus+ projects, European Solidarity Corps (ESC) missions, and international youth exchanges. Built upon the **"Cosmic Dark Mode"** visual design system, a hardened server-first architecture powered by Supabase, and comprehensive multilingual support across 7 European languages.

---

## 🚀 Key Features

* 🎨 **Cosmic Dark Mode Design System:** Futuristic visual palette based on Tailwind CSS v4 (`void-deep`, `void-surface`, `plasma-cyan`, `hyper-violet`, `nova-flare`, `rup-emerald`) with fluid 60fps animations via Framer Motion and accessible Radix UI / Shadcn primitives.
* 🌐 **Comprehensive Internationalization (7 Languages):** 100% parity across 2,138 synchronized keys in Spanish (`es`), English (`en`), German (`de`), French (`fr`), Italian (`it`), Russian (`ru`), and Portuguese (`pt`).
* 🔒 **Hardened Multi-Layer Security:**
  - Strict HTTP security headers (Content-Security-Policy, HSTS preloaded, X-Frame-Options DENY, X-Content-Type-Options nosniff).
  - Persistent, synchronized sessions via `httpOnly` cookies using `@supabase/ssr`.
  - Constant-time cryptographic verification (`crypto.timingSafeEqual`) on background cron endpoints (`/api/cron/*`).
* 🗄️ **Supabase Database with RLS:** 32 idempotent SQL migrations with Row Level Security (RLS) policies preventing privilege escalation, full relational integrity, and atomic GDPR Art. 17 (*Right to be Forgotten*) execution.
* 🔄 **Automated Google Drive DB Backups (Safe Rotation):** Daily automated pipeline on GitHub Actions (`.github/workflows/db-backup.yml`) executing at 04:00 AM UTC via `pg_dump` and gzip compression, rotating backups safely only after verifying a 100% successful remote upload.
* 📊 **Real-Time Telemetry & Error Boundaries:** Zero-cache `/api/health` diagnostic endpoint measuring database round-trip latency in milliseconds, plus client-side Error Boundaries capturing exceptions without leaking sensitive stack traces.

---

## 📂 Repository Structure

```text
EuroNova/
├── .github/
│   └── workflows/
│       ├── ci.yml                           # Automated Quality Gatekeeper on push/PR
│       └── db-backup.yml                    # Daily Google Drive backup with Safe Rotation
├── docs/
│   ├── ARCHITECTURE_AND_DEPLOYMENT.md       # Visual architecture, Mermaid diagrams & dependency locks
│   ├── API_REFERENCE.md                     # Human-readable API, Route Handlers & background webhooks
│   ├── openapi.yaml                         # Machine-readable OpenAPI 3.1 specification
│   ├── ADMIN_AND_TRUST_MANUAL.md            # Auto-Scraper internals & True Trust Protocol mathematics
│   ├── GDPR_SECURITY_AND_RECOVERY.md        # GDPR Art. 17 audit, Disaster Recovery & CI/CD guides
│   └── BACKUP_SETUP.md                      # Service Account & Google Drive setup tutorial
├── supabase/
│   ├── migrations/                          # 32 idempotent SQL migration scripts & RLS policies
│   └── recovery/
│       └── emergency_rollback_and_audit.sql # 5-block emergency containment SQL recovery kit
├── vercel.json                              # Cron schedules & Edge Function execution calibrations
├── euronova/                                # Main Next.js application root
│   ├── actions/                             # Server Actions (Atomic backend mutations)
│   ├── app/                                 # Next.js 15 App Router ([locale], legal, dashboard, etc.)
│   ├── components/                          # React components (CosmicTooltip, Modals, Maps)
│   ├── i18n/                                # Locale configurations & next-intl routing
│   ├── lib/                                 # Shared utilities (Supabase clients, auth, GDPR engine)
│   ├── messages/                            # i18n translation dictionaries (en, es, de, fr, it, ru, pt)
│   ├── scripts/                             # Pre-flight audit, lint, and security validation scripts
│   ├── .env.example                         # Sanitized environment variable template
│   └── package.json                         # Dependencies and build lifecycle scripts
└── README.md                                # Master project documentation
```

---

## ⚡ Quick Start (Local Development)

### 1. Clone the Repository & Install Dependencies
```bash
git clone https://github.com/CRACKXXXX/EuroNova.git
cd EuroNova/euronova
npm ci
```

### 2. Configure Environment Variables
```bash
cp .env.example .env.local
```
Fill in the required credentials in `.env.local` and execute the pre-flight validator:
```bash
node scripts/validate-env.mjs
```

### 3. Apply Supabase Migrations
Execute the SQL scripts in `supabase/migrations/` sequentially inside your Supabase **SQL Editor** (or via `npx supabase db push`).

### 4. Start Development Server
```bash
npm run dev
```
The application will be live at [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Pre-Commit Quality Gates

To ensure zero regressions and production-grade stability, execute the 7 blocking quality gates:

```bash
# 1. Environment & credentials audit
node scripts/validate-env.mjs

# 2. Strict i18n parity check (100% coverage across 7 locales)
node scripts/validate-i18n.mjs --strict

# 3. Static text & toast scanner in components
node scripts/scan-hardcoded.mjs

# 4. App Router internationalization route scanner
node scripts/scan-routes.mjs

# 5. Strict TypeScript type check
npx tsc --noEmit

# 6. ESLint validation with zero allowed warnings
npx eslint app components lib actions --max-warnings=0

# 7. Production build compilation
npm run build
```

---

## 📚 Master Documentation Index

Comprehensive documentation is provided for developers, European Union compliance auditors, and system administrators:

1. 📐 **[Visual Architecture, Vercel Deployment & Dependency Locks](docs/ARCHITECTURE_AND_DEPLOYMENT.md)**  
   *Mermaid architecture diagrams, request lifecycles, Zero-to-Hero deployment guide, and dependency locks.*
2. 🔌 **[OpenAPI 3.1 Swagger Specification](docs/openapi.yaml)**  
   *Machine-readable specification covering all EuroNova Route Handlers with Bearer authentication schemes.*
3. 📖 **[API & Webhooks Reference Manual](docs/API_REFERENCE.md)**  
   *Human-readable guide with cURL examples, HTTP status codes, rate limits, and timing-safe cron verification.*
4. 🛡️ **[Administrator Manual: Auto-Scraper & True Trust Protocol](docs/ADMIN_AND_TRUST_MANUAL.md)**  
   *Scraper engine internals, 3-layer deduplication, True Trust mathematical economy (0-100 scale), and 50-tier leveling.*
5. ⚖️ **[GDPR Compliance, Disaster Recovery & CI/CD Guide](docs/GDPR_SECURITY_AND_RECOVERY.md)**  
   *GDPR Art. 17 ("Right to be Forgotten") audit, 2-year storage decay (Art. 5.1.e), Google Drive restore protocol, and CI/CD guardian scripts.*
6. 💾 **[Google Drive Backup Setup Guide](docs/BACKUP_SETUP.md)**  
   *Step-by-step tutorial for Google Cloud Console, Service Account creation, and Safe Rotation in GitHub Actions.*
7. 🆘 **[Emergency SQL Containment & Rollback Kit](supabase/recovery/emergency_rollback_and_audit.sql)**  
   *5-block emergency SQL script for 1-click read-only lockdown, scraper batch rollbacks, and botnet mitigation.*

---
**EuroNova Engineering Team** — *Built for European Youth Mobility & Solidarity.*
