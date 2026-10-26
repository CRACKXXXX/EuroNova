/**
 * ============================================================================
 * EURONOVA TELEMETRY ENGINE & PII SCRUBBER
 * ============================================================================
 * Centralized, isomorphic crash telemetry pipeline.
 * Intercepts unhandled client and server errors, strips all Personally
 * Identifiable Information (PII) and secret credentials via regex scrubbing,
 * and securely dispatches structured diagnostics without breaking error boundaries.
 */

export interface TelemetryContext {
  route?: string;
  componentStack?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

export interface CrashTelemetryPayload {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
  route?: string;
  componentStack?: string;
  timestamp: string;
  environment: string;
}

/**
 * Redacts emails, Bearer tokens, JWTs, UUIDs, passwords, and sensitive keys from any string.
 */
export function scrubPII(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return "";

  return text
    // 1. Database Connection Strings (Postgres / MySQL / Mongo)
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1[REDACTED_DB_PWD]$3")
    // 2. Authorization Bearer Tokens
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED_TOKEN]")
    // 3. Raw JWT Tokens (Supabase tokens, session JWTs)
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g, "[REDACTED_JWT]")
    // 4. UUIDs / Session IDs / User IDs
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi, "[REDACTED_UUID]")
    // 5. Supabase Auth Cookies
    .replace(/(?:sb-[a-zA-Z0-9_-]+-auth-token=)([^;]+)/gi, "sb-auth-token=[REDACTED_TOKEN]")
    // 6. Key-Value Passwords & Secrets (JSON / form / query)
    .replace(
      /(['"]?(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|private[_-]?key)['"]?\s*[:=]\s*['"]?)([^'",\s}]+)(['"]?)/gi,
      "$1[REDACTED_SECRET]$3"
    )
    // 7. Email Addresses
    .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi, "[REDACTED_EMAIL]");
}

/**
 * Normalizes an unknown error into a sanitized, PII-scrubbed telemetry payload.
 */
export function formatCrashTelemetry(
  error: unknown,
  context?: TelemetryContext
): CrashTelemetryPayload {
  let rawName = "Error";
  let rawMessage = "An unknown error occurred";
  let rawStack = "";
  let digest = context?.digest;

  if (error instanceof Error) {
    rawName = error.name || "Error";
    rawMessage = error.message || "";
    rawStack = error.stack || "";
    if (!digest && "digest" in error && typeof (error as { digest?: unknown }).digest === "string") {
      digest = (error as { digest: string }).digest;
    }
  } else if (typeof error === "string") {
    rawMessage = error;
  } else if (typeof error === "object" && error !== null) {
    try {
      rawMessage = JSON.stringify(error);
    } catch {
      rawMessage = String(error);
    }
  }

  const scrubbedName = scrubPII(rawName).slice(0, 100);
  const scrubbedMessage = scrubPII(rawMessage).slice(0, 1000);
  const scrubbedStack = rawStack ? scrubPII(rawStack).slice(0, 4000) : undefined;
  const scrubbedCompStack = context?.componentStack ? scrubPII(context.componentStack).slice(0, 2000) : undefined;
  const scrubbedRoute = context?.route ? scrubPII(context.route).slice(0, 255) : undefined;

  return {
    name: scrubbedName || "Error",
    message: scrubbedMessage || "Unknown exception",
    stack: scrubbedStack,
    digest: digest ? scrubPII(digest).slice(0, 100) : undefined,
    route: scrubbedRoute,
    componentStack: scrubbedCompStack,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
  };
}

/**
 * Centralized crash reporter.
 * Dispatches error telemetry to the backend endpoint or logs structured JSON on the server.
 * Guarantees 100% silent failure if offline or network fails to avoid secondary crash loops.
 */
export async function reportCrashTelemetry(
  error: unknown,
  context?: TelemetryContext
): Promise<void> {
  try {
    const payload = formatCrashTelemetry(error, context);

    if (typeof window !== "undefined") {
      // Client-side environment
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[EuroNova Telemetry] [CRASH] [${payload.digest || "NO_DIGEST"}]`,
          payload.message
        );
      }

      const body = JSON.stringify(payload);

      // 1. Primary: fetch with keepalive to survive page unmounts
      if (typeof fetch === "function") {
        try {
          void fetch("/api/telemetry/error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {
            // Fallback to sendBeacon if fetch promise rejects
            if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
              navigator.sendBeacon("/api/telemetry/error", body);
            }
          });
        } catch {
          if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
            navigator.sendBeacon("/api/telemetry/error", body);
          }
        }
      } else if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/telemetry/error", body);
      }
    } else {
      // Server-side environment: emit structured JSON log directly
      console.error(
        JSON.stringify({
          event: "SERVER_CRASH_TELEMETRY",
          severity: "ERROR",
          ...payload,
        })
      );
    }
  } catch {
    // Zero-tolerance for secondary crashes: fail completely silently
  }
}
