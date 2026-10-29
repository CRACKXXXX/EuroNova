/**
 * ============================================================================
 * EURONOVA DETERMINISTIC SLIDING-WINDOW RATE LIMITER & OOM DEFENSE
 * ============================================================================
 * In-memory sliding window rate limiter protecting high-frequency endpoints
 * and Server Actions against brute-force, DDoS, spam injection, and memory
 * exhaustion (OOM) attacks under massive IP spoofing.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  AUTH: { maxRequests: 10, windowSeconds: 60 },
  MUTATION: { maxRequests: 5, windowSeconds: 60 },
  PROJECT_CREATION: { maxRequests: 3, windowSeconds: 60 },
  REPORT: { maxRequests: 5, windowSeconds: 60 },
  TICKET: { maxRequests: 3, windowSeconds: 60 },
  PUBLIC_API: { maxRequests: 30, windowSeconds: 60 },
  TELEMETRY: { maxRequests: 30, windowSeconds: 60 },
  DOSSIER_SUBMISSION: { maxRequests: 5, windowSeconds: 60 },
} as const;

export const MAX_TRACKED_KEYS = 10000;
const EVICTION_BATCH_SIZE = 1000;

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();
let lastPurgeTime = Date.now();

/**
 * Returns current count of tracked keys in memory (useful for metrics and testing).
 */
export function getRateLimiterStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Clears the in-memory store (useful for test isolates).
 */
export function resetRateLimiterStore(): void {
  rateLimitStore.clear();
  lastPurgeTime = Date.now();
}

/**
 * Purges records whose timestamps have completely fallen outside the retention window
 * to prevent memory accumulation in long-running Node processes.
 */
export function purgeExpiredRecords(force: boolean = false): void {
  const now = Date.now();
  if (!force && now - lastPurgeTime < 60000) return; // Run periodic purge at most once a minute

  lastPurgeTime = now;
  for (const [key, record] of rateLimitStore.entries()) {
    // Keep only timestamps within the last 5 minutes (300,000 ms)
    const validTimestamps = record.timestamps.filter((ts) => now - ts < 300000);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  }
}

/**
 * Enforces hard ceiling on the rateLimitStore size to prevent Out-Of-Memory (OOM)
 * crashes during mass IP spoofing floods (50,000+ random addresses).
 */
function enforceStoreCapacity(): void {
  if (rateLimitStore.size < MAX_TRACKED_KEYS) return;

  // 1. First pass: Purge expired records immediately
  purgeExpiredRecords(true);

  // 2. Second pass: If still at or over capacity, evict oldest entries (FIFO via Map keys iterator)
  if (rateLimitStore.size >= MAX_TRACKED_KEYS) {
    let evicted = 0;
    for (const key of rateLimitStore.keys()) {
      rateLimitStore.delete(key);
      evicted++;
      if (evicted >= EVICTION_BATCH_SIZE || rateLimitStore.size < MAX_TRACKED_KEYS - 500) {
        break;
      }
    }
  }
}

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/**
 * Validates whether a candidate IP string adheres strictly to standard IPv4 or IPv6 formats.
 */
export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string" || ip.length > 45) return false;
  // Fast IPv4 check
  if (IPV4_REGEX.test(ip)) return true;
  // Robust IPv6 check: hex characters and colons, at least 2 colons, max 7 colons, no triple colons
  if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
  if (ip.includes(":::")) return false;
  const colons = (ip.match(/:/g) || []).length;
  if (colons < 2 || colons > 7) return false;
  const parts = ip.split(":");
  return parts.every((p) => p.length <= 4);
}

/**
 * Normalizes a raw IP string by stripping whitespace, ports, and validating formatting.
 */
function normalizeAndValidateIp(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let first = raw.split(",")[0].trim().slice(0, 50);

  // If bracketed IPv6 with port: [2001:db8::1]:8080 -> 2001:db8::1
  if (first.startsWith("[")) {
    const match = first.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?$/);
    if (match && isValidIp(match[1])) {
      return match[1];
    }
    return null;
  }

  // If IPv4 with port: 192.168.1.1:8080 -> 192.168.1.1 (only strip if exactly 1 colon)
  const colonCount = (first.match(/:/g) || []).length;
  if (colonCount === 1) {
    first = first.replace(/:\d+$/, "").trim();
  }

  if (isValidIp(first)) {
    return first;
  }
  return null;
}

/**
 * Safely extracts client IP address from request headers, strictly rejecting
 * injected, oversized, or malformed strings with a fallback to "127.0.0.1".
 */
export async function getClientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();

    // 1. Check X-Forwarded-For
    const forwarded = h.get("x-forwarded-for");
    const validForwarded = normalizeAndValidateIp(forwarded);
    if (validForwarded) return validForwarded;

    // 2. Check X-Real-IP
    const realIp = h.get("x-real-ip");
    const validReal = normalizeAndValidateIp(realIp);
    if (validReal) return validReal;

    // 3. Check CF-Connecting-IP (Cloudflare)
    const cfIp = h.get("cf-connecting-ip");
    const validCf = normalizeAndValidateIp(cfIp);
    if (validCf) return validCf;

    return "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

/**
 * Sanitizes the rate limit identifier to prevent memory bloating from oversized strings.
 */
function sanitizeIdentifier(identifier: string): string {
  if (typeof identifier !== "string") return "unknown";
  const trimmed = identifier.trim().slice(0, 128);
  return trimmed.length > 0 ? trimmed : "unknown";
}

/**
 * Validates request frequency against the specified sliding-window threshold.
 * Returns { success: true } or { success: false, error: ... } with retry advice.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.MUTATION
): Promise<{
  success: boolean;
  error?: string;
  remaining?: number;
  retryAfter?: number;
}> {
  return checkRateLimitSync(identifier, config);
}

/**
 * Synchronous variant of checkRateLimit for contexts where headers/promises are already resolved.
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.MUTATION
): {
  success: boolean;
  error?: string;
  remaining?: number;
  retryAfter?: number;
} {
  const safeIdentifier = sanitizeIdentifier(identifier);
  purgeExpiredRecords();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  const record = rateLimitStore.get(safeIdentifier) || { timestamps: [] };

  // Filter out timestamps outside the active sliding window
  const activeTimestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (activeTimestamps.length >= config.maxRequests) {
    const oldestInWindow = activeTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));

    return {
      success: false,
      error: `Too many requests. Rate limit exceeded. Please wait ${retryAfterSeconds}s before trying again.`,
      remaining: 0,
      retryAfter: retryAfterSeconds,
    };
  }

  // Enforce memory capacity before inserting new or updated keys
  if (!rateLimitStore.has(safeIdentifier)) {
    enforceStoreCapacity();
  }

  // Record this request timestamp
  activeTimestamps.push(now);
  record.timestamps = activeTimestamps;
  rateLimitStore.set(safeIdentifier, record);

  return {
    success: true,
    remaining: config.maxRequests - activeTimestamps.length,
  };
}
