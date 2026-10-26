/**
 * ============================================================================
 * EURONOVA SECURITY SANITIZER & ANTI-SSRF SHIELD
 * ============================================================================
 * Enforces strict HTTPS protocol, strips dangerous executable HTML, and
 * neutralizes SSRF vectors (blocking RFC 1918/3927 private & loopback IPs).
 */

export interface SafeUrlResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
}

export interface SafeUrlOptions {
  allowDiscordWebhookOnly?: boolean;
}

/**
 * Checks whether an IP address belongs to private/internal/cloud metadata subnets:
 * - 127.0.0.0/8 (Loopback)
 * - 10.0.0.0/8 (Private Network)
 * - 172.16.0.0/12 (Private Network)
 * - 192.168.0.0/16 (Private Network)
 * - 169.254.0.0/16 (Link-Local / AWS/GCP/Azure Cloud Metadata)
 * - 0.0.0.0 (Unspecified)
 */
function isPrivateOrReservedIp(hostname: string): boolean {
  // Check exact hostname aliases
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === "localhost" ||
    lowerHost === "127.0.0.1" ||
    lowerHost === "0.0.0.0" ||
    lowerHost === "::1" ||
    lowerHost === "metadata.google.internal" ||
    lowerHost === "instance-data"
  ) {
    return true;
  }

  // IPv4 pattern matching
  const ipv4Match = lowerHost.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    const [o1, o2] = octets;

    // 127.0.0.0/8
    if (o1 === 127) return true;
    // 0.0.0.0/8
    if (o1 === 0) return true;
    // 10.0.0.0/8
    if (o1 === 10) return true;
    // 172.16.0.0/12 (172.16.0.0 to 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.168.0.0/16
    if (o1 === 192 && o2 === 168) return true;
    // 169.254.0.0/16 (Cloud Metadata & Link-Local)
    if (o1 === 169 && o2 === 254) return true;
  }

  // IPv6 check for private or link-local
  if (lowerHost.startsWith("fe80:") || lowerHost.startsWith("fc00:") || lowerHost.startsWith("fd00:")) {
    return true;
  }

  return false;
}

/**
 * Validates that a user-provided URL uses strict HTTPS and does not point to internal resources.
 */
export function validateSafeHttpsUrl(
  rawUrl: string | null | undefined,
  options?: SafeUrlOptions
): SafeUrlResult {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { isValid: false, error: "URL cannot be empty." };
  }

  const trimmed = rawUrl.trim();

  // Explicitly reject dangerous pseudo-protocols before parsing
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return { isValid: false, error: "Dangerous or unsupported URL protocol detected." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: "Invalid URL structure." };
  }

  // 1. Enforce strict HTTPS protocol
  if (parsed.protocol !== "https:") {
    return { isValid: false, error: "Only secure HTTPS URLs are permitted (https://)." };
  }

  // 2. Anti-SSRF check: Reject loopback, private networks, and metadata endpoints
  if (isPrivateOrReservedIp(parsed.hostname)) {
    return {
      isValid: false,
      error: "Access to private, loopback, or cloud metadata endpoints is strictly blocked.",
    };
  }

  // 3. Optional: Discord Webhook strict domain gate
  if (options?.allowDiscordWebhookOnly) {
    const validDiscordHosts = ["discord.com", "discordapp.com", "www.discord.com"];
    if (!validDiscordHosts.includes(parsed.hostname.toLowerCase())) {
      return {
        isValid: false,
        error: "Discord Webhook URL must originate from discord.com or discordapp.com.",
      };
    }
    if (!parsed.pathname.startsWith("/api/webhooks/")) {
      return {
        isValid: false,
        error: "Invalid Discord Webhook endpoint path. Expected /api/webhooks/...",
      };
    }
  }

  return {
    isValid: true,
    sanitizedUrl: parsed.toString(),
  };
}

/**
 * Strips PostgreSQL null bytes (\u0000) and excessive Zalgo combining marks (/[\u0300-\u036f]{3,}/g)
 * while safely preserving legitimate international characters and standard emojis.
 */
export function sanitizeUnicode(rawText: string | null | undefined): string {
  if (!rawText || typeof rawText !== "string") return "";
  return rawText
    .replace(/\u0000/g, "")
    .replace(/[\u0300-\u036f]{3,}/g, "");
}

/**
 * Strips executable HTML, script tags, iframes, object/embed tags, event attributes,
 * null bytes (\u0000), and excessive combining diacritical marks (Zalgo text).
 * Enforces an optional hard maximum length limit to prevent storage exhaustion attacks.
 */
export function stripDangerousHtml(rawText: string | null | undefined, maxLength: number = 5000): string {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  let cleaned = rawText;

  // 1. Remove PostgreSQL-crashing null bytes
  cleaned = cleaned.replace(/\u0000/g, "");

  // 2. Neutralize excessive combining diacritical marks (Zalgo text: 3 or more stacked marks)
  // while preserving legitimate international characters (e.g. é, ñ, ü, č, ő) and standard emojis
  cleaned = cleaned.replace(/[\u0300-\u036f]{3,}/g, "");

  // 3. Remove complete script, iframe, object, embed, style tags with their inner contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 4. Strip any remaining opening/closing HTML tags
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, "");

  // 5. Remove inline javascript: expressions
  cleaned = cleaned.replace(/javascript\s*:/gi, "");

  // 6. Clean dangerous DOM event handlers (e.g., onload=, onerror=, onclick=)
  cleaned = cleaned.replace(/\bon\w+\s*=/gi, "");

  // 7. Trim and enforce maximum length
  cleaned = cleaned.trim();
  if (maxLength > 0 && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Convenience helper to sanitize and bound text inputs in a single call.
 */
export function sanitizeTextInput(text: string | null | undefined, maxLength: number = 5000): string {
  return stripDangerousHtml(text, maxLength);
}
