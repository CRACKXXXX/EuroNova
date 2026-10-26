/**
 * ============================================================================
 * EURONOVA DETERMINISTIC SLIDING-WINDOW RATE LIMITER
 * ============================================================================
 * In-memory sliding window rate limiter protecting high-frequency endpoints
 * and Server Actions against brute-force, DDoS, and spam injection.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  AUTH: { maxRequests: 5, windowSeconds: 60 },
  MUTATION: { maxRequests: 5, windowSeconds: 60 },
  PROJECT_CREATION: { maxRequests: 3, windowSeconds: 60 },
  REPORT: { maxRequests: 5, windowSeconds: 60 },
  TICKET: { maxRequests: 3, windowSeconds: 60 },
  PUBLIC_API: { maxRequests: 30, windowSeconds: 60 },
  TELEMETRY: { maxRequests: 30, windowSeconds: 60 },
} as const;

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();
let lastPurgeTime = Date.now();

/**
 * Purges records whose timestamps have completely fallen outside the retention window
 * to prevent memory accumulation in long-running Node processes.
 */
function purgeExpiredRecords(): void {
  const now = Date.now();
  if (now - lastPurgeTime < 60000) return; // Run purge at most once a minute

  lastPurgeTime = now;
  for (const [key, record] of rateLimitStore.entries()) {
    // Keep only timestamps within the last 5 minutes
    const validTimestamps = record.timestamps.filter((ts) => now - ts < 300000);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  }
}

/**
 * Safely extracts client IP address from request headers.
 */
export async function getClientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const firstIp = forwarded.split(",")[0].trim();
      if (firstIp) return firstIp;
    }
    const realIp = h.get("x-real-ip");
    if (realIp && realIp.trim()) {
      return realIp.trim();
    }
    return "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
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
  purgeExpiredRecords();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  const record = rateLimitStore.get(identifier) || { timestamps: [] };

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

  // Record this request timestamp
  activeTimestamps.push(now);
  record.timestamps = activeTimestamps;
  rateLimitStore.set(identifier, record);

  return {
    success: true,
    remaining: config.maxRequests - activeTimestamps.length,
  };
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
  purgeExpiredRecords();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  const record = rateLimitStore.get(identifier) || { timestamps: [] };
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

  activeTimestamps.push(now);
  record.timestamps = activeTimestamps;
  rateLimitStore.set(identifier, record);

  return {
    success: true,
    remaining: config.maxRequests - activeTimestamps.length,
  };
}
