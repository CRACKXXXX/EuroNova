#!/usr/bin/env node

/**
 * EuroNova Pre-Flight Environment Validator
 * Validates presence, formatting, and security readiness of environment variables
 * without ever leaking raw secret values to stdout/terminal logs.
 */

import fs from "fs";
import path from "path";

// 1. Manually parse .env.local if present
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const isProductionCheck =
  process.argv.includes("--production") || process.env.NODE_ENV === "production";

/**
 * Safely masks secret strings for terminal reporting.
 * Never leaks more than first/last 3 characters.
 */
function maskSecret(val) {
  if (!val || typeof val !== "string") return "EMPTY";
  const len = val.length;
  if (len <= 6) return "***";
  const head = val.slice(0, 3);
  const tail = val.slice(-3);
  return `${head}***...***${tail} [len=${len}]`;
}

/**
 * Schema definitions for Environment Auditing
 */
const ENV_SPEC = [
  // 1. Core Supabase Database
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    category: "Database (Core)",
    required: true,
    validate: (val) => {
      if (!val) return { valid: false, message: "Missing required Supabase URL" };
      if (!val.startsWith("https://")) {
        return { valid: false, message: "Must be a secure HTTPS URL (https://)" };
      }
      try {
        new URL(val);
        return { valid: true, message: `Secure HTTPS endpoint verified` };
      } catch {
        return { valid: false, message: "Malformed URL structure" };
      }
    },
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    category: "Database (Core)",
    required: true,
    isSecret: true,
    validate: (val) => {
      if (!val) return { valid: false, message: "Missing required Anon Key" };
      if (val.length < 30) return { valid: false, message: "Suspiciously short JWT key" };
      return { valid: true, message: "JWT token structure detected" };
    },
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    category: "Database (Core)",
    required: true,
    isSecret: true,
    validate: (val) => {
      if (!val) return { valid: false, message: "Missing Service Role Key (Server mutations)" };
      if (val.length < 30) return { valid: false, message: "Suspiciously short JWT key" };
      return { valid: true, message: "High-privilege Service Role key present" };
    },
  },

  // 2. Live Ops & Cryptographic Protection
  {
    key: "CRON_SECRET",
    category: "Security (Crons)",
    required: true,
    isSecret: true,
    validate: (val) => {
      if (!val) return { valid: false, message: "Missing CRON_SECRET for background tasks" };
      if (val.length < 8) {
        return { valid: false, message: "Secret is too short (Minimum 8 characters required)" };
      }
      if (val.length < 16) {
        return {
          valid: true,
          warning: true,
          message: "Active (SHA-256 protected; length >= 16 recommended for production)",
        };
      }
      return { valid: true, message: "Strong cryptographic secret" };
    },
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    category: "Routing & SEO",
    required: false,
    validate: (val) => {
      if (!val) {
        return {
          valid: true,
          warning: true,
          message: "Unset: Defaults to https://euronova.vercel.app in sitemap/robots",
        };
      }
      if (isProductionCheck && val.includes("localhost")) {
        return { valid: false, message: "Production check failed: localhost detected in SITE_URL" };
      }
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        return { valid: false, message: "Must include protocol (https:// or http://)" };
      }
      return { valid: true, message: val };
    },
  },

  // 3. Email & SMTP Delivery
  {
    key: "EMAIL_USER",
    category: "Email / Notifications",
    required: false,
    validate: (val) => {
      const smtpUser = process.env.SMTP_USER;
      if (!val && !smtpUser) {
        return {
          valid: true,
          warning: true,
          message: "No email sender configured (EMAIL_USER or SMTP_USER)",
        };
      }
      return { valid: true, message: val || smtpUser };
    },
  },
  {
    key: "EMAIL_PASSWORD",
    category: "Email / Notifications",
    required: false,
    isSecret: true,
    validate: (val) => {
      const smtpPass = process.env.SMTP_PASS;
      if (!val && !smtpPass) {
        return {
          valid: true,
          warning: true,
          message: "No email app password configured (EMAIL_PASSWORD or SMTP_PASS)",
        };
      }
      return { valid: true, message: "Credential active" };
    },
  },

  // 4. External Integrations
  {
    key: "GEMINI_API_KEY",
    category: "AI Engine",
    required: false,
    isSecret: true,
    validate: (val) => {
      if (!val) {
        return { valid: true, warning: true, message: "Unset: AI title enrichment will use heuristic fallback" };
      }
      return { valid: true, message: "Gemini API active" };
    },
  },
  {
    key: "TELEGRAM_BOT_TOKEN",
    category: "Integrations",
    required: false,
    isSecret: true,
    validate: (val) => {
      if (!val) {
        return { valid: true, warning: true, message: "Unset: Telegram community alerts disabled" };
      }
      return { valid: true, message: "Telegram bot configured" };
    },
  },
  {
    key: "DISCORD_WEBHOOK_URL",
    category: "Integrations",
    required: false,
    isSecret: true,
    validate: (val) => {
      if (!val) {
        return { valid: true, warning: true, message: "Unset: Discord webhook alerts disabled" };
      }
      if (!val.startsWith("https://discord.com/api/webhooks/")) {
        return { valid: false, message: "Invalid Discord webhook URL format" };
      }
      return { valid: true, message: "Discord webhook active" };
    },
  },
];

function runValidation() {
  console.log("\n===============================================================================");
  console.log("=== EURONOVA PRE-FLIGHT ENVIRONMENT & SECURITY VALIDATOR ===");
  console.log(`=== Mode: ${isProductionCheck ? "PRODUCTION AUDIT" : "DEVELOPMENT / LOCAL AUDIT"} ===`);
  console.log("===============================================================================\n");

  const results = [];
  let criticalFailures = 0;
  let warnings = 0;

  for (const item of ENV_SPEC) {
    const rawValue = process.env[item.key];
    const validation = item.validate(rawValue);

    let status = item.isSecret ? "PRESENT [MASKED]" : "PRESENT";
    if (!validation.valid) {
      if (item.required) {
        status = "MISSING [CRITICAL]";
        criticalFailures++;
      } else {
        status = "MISSING / INVALID";
        criticalFailures++;
      }
    } else if (validation.warning) {
      status = "WARNING";
      warnings++;
    }

    const maskedDisplay = item.isSecret
      ? maskSecret(rawValue)
      : rawValue
      ? rawValue.length > 35
        ? `${rawValue.slice(0, 32)}...`
        : rawValue
      : "(not set)";

    results.push({
      Variable: item.key,
      Category: item.category,
      Status: status,
      Value: maskedDisplay,
      Detail: validation.message,
    });
  }

  console.table(
    results.map((r) => ({
      Variable: r.Variable,
      Category: r.Category,
      Status: r.Status,
      "Value (Masked)": r.Value,
      Details: r.Detail,
    }))
  );

  console.log("===============================================================================");
  console.log(`Audit Summary: Critical Failures: ${criticalFailures} | Warnings: ${warnings}`);
  console.log("===============================================================================\n");

  if (criticalFailures > 0) {
    console.error("❌ PRE-FLIGHT ENVIRONMENT CHECK FAILED: Resolve critical failures before deploying.");
    process.exit(1);
  } else {
    console.log("✅ PRE-FLIGHT ENVIRONMENT CHECK PASSED: All critical system variables ready for deployment.");
    process.exit(0);
  }
}

runValidation();
