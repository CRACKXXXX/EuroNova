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
  platform?: "discord" | "slack";
}

/**
 * Checks whether an IP address belongs to private/internal/cloud metadata subnets:
 * - 127.0.0.0/8 (Loopback RFC 1122)
 * - 0.0.0.0/8 (Unspecified / default route)
 * - 10.0.0.0/8 (Private Network RFC 1918)
 * - 100.64.0.0/10 (Shared Address Space / CGNAT RFC 6598)
 * - 169.254.0.0/16 (Link-Local / AWS/GCP/Azure Cloud Metadata RFC 3927)
 * - 172.16.0.0/12 (Private Network RFC 1918)
 * - 192.0.0.0/24 (IETF Protocol Assignments)
 * - 192.0.2.0/24 (TEST-NET-1 RFC 5737)
 * - 192.88.99.0/24 (6to4 Relay Anycast RFC 3068)
 * - 192.168.0.0/16 (Private Network RFC 1918)
 * - 198.18.0.0/15 (Benchmarking RFC 2544)
 * - 198.51.100.0/24 (TEST-NET-2 RFC 5737)
 * - 203.0.113.0/24 (TEST-NET-3 RFC 5737)
 * - 224.0.0.0/4 (Multicast RFC 5771)
 * - 240.0.0.0/4 (Reserved / Future Use RFC 1112, broadcast)
 * - IPv6: ::1, ::, ::ffff:0:0/96, fc00::/7, fe80::/10, ff00::/8, 100::/64
 */
function isPrivateOrReservedIp(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase().trim();
  const cleanHost = lowerHost.replace(/^\[|\]$/g, ""); // Strip IPv6 brackets if present

  // 1. Exact or suffix matches for loopback and cloud metadata hostnames
  if (
    cleanHost === "localhost" ||
    cleanHost.endsWith(".localhost") ||
    cleanHost === "0.0.0.0" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "::1" ||
    cleanHost === "::" ||
    cleanHost === "metadata.google.internal" ||
    cleanHost.endsWith(".google.internal") ||
    cleanHost === "instance-data" ||
    cleanHost === "metadata" ||
    cleanHost.endsWith(".internal") ||
    cleanHost.endsWith(".local") ||
    cleanHost.endsWith(".onion")
  ) {
    return true;
  }

  // 2. IPv4 pattern matching and subnet boundary checks
  const ipv4Match = cleanHost.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    const [o1, o2, o3, o4] = octets;

    // Reject invalid octets beyond 255
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return true;

    // 0.0.0.0/8 (Current network / default route)
    if (o1 === 0) return true;

    // 10.0.0.0/8 (Private RFC 1918: 10.0.0.0 - 10.255.255.255)
    if (o1 === 10) return true;

    // 100.64.0.0/10 (Carrier-Grade NAT RFC 6598: 100.64.0.0 - 100.127.255.255)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;

    // 127.0.0.0/8 (Loopback RFC 1122: 127.0.0.0 - 127.255.255.255)
    if (o1 === 127) return true;

    // 169.254.0.0/16 (Link-Local & Cloud Metadata AWS/GCP/Azure RFC 3927)
    if (o1 === 169 && o2 === 254) return true;

    // 172.16.0.0/12 (Private RFC 1918: 172.16.0.0 - 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (o1 === 192 && o2 === 0 && o3 === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1 RFC 5737)
    if (o1 === 192 && o2 === 0 && o3 === 2) return true;

    // 192.88.99.0/24 (6to4 Relay Anycast RFC 3068)
    if (o1 === 192 && o2 === 88 && o3 === 99) return true;

    // 192.168.0.0/16 (Private RFC 1918: 192.168.0.0 - 192.168.255.255)
    if (o1 === 192 && o2 === 168) return true;

    // 198.18.0.0/15 (Benchmarking RFC 2544: 198.18.0.0 - 198.19.255.255)
    if (o1 === 198 && (o2 === 18 || o2 === 19)) return true;

    // 198.51.100.0/24 (TEST-NET-2 RFC 5737)
    if (o1 === 198 && o2 === 51 && o3 === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3 RFC 5737)
    if (o1 === 203 && o2 === 0 && o3 === 113) return true;

    // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
    if (o1 >= 224 && o1 <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future Use / Limited Broadcast 255.255.255.255)
    if (o1 >= 240) return true;
  }

  // 3. IPv6 checks
  // Loopback / Unspecified (::1, ::, or all-zero prefixed :1)
  if (cleanHost === "::1" || cleanHost === "::" || cleanHost.endsWith(":1")) {
    if (/^0*(:0*)*:1$/.test(cleanHost) || cleanHost === "::1") return true;
  }

  // IPv4-mapped or translated IPv6 (e.g., ::ffff:0:0/96, 64:ff9b::/96)
  if (cleanHost.includes("ffff:") || cleanHost.startsWith("64:ff9b:")) {
    return true;
  }

  // Unique Local Address (fc00::/7 -> fc00.. to fdff..)
  if (cleanHost.startsWith("fc") || cleanHost.startsWith("fd")) {
    return true;
  }

  // Link-Local (fe80::/10 -> fe80.. to febf..)
  if (/^fe[89ab]/i.test(cleanHost)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (cleanHost.startsWith("ff")) {
    return true;
  }

  // Discard prefix (100::/64)
  if (cleanHost.startsWith("100:")) {
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
    lower.startsWith("file:") ||
    lower.startsWith("blob:")
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

  // 2. Reject embedded user credentials (https://user:pass@host)
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      error: "URLs with embedded credentials (user:pass@) are strictly prohibited.",
    };
  }

  // 3. Anti-SSRF check: Reject loopback, private networks, cloud metadata, and link-local endpoints
  if (isPrivateOrReservedIp(parsed.hostname)) {
    return {
      isValid: false,
      error: "Access to private, loopback, or cloud metadata endpoints is strictly blocked.",
    };
  }

  // 4. Platform-specific validation gates
  const effectivePlatform = options?.platform || (options?.allowDiscordWebhookOnly ? "discord" : undefined);

  if (effectivePlatform === "discord") {
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
  } else if (effectivePlatform === "slack") {
    const validSlackHosts = ["hooks.slack.com"];
    if (!validSlackHosts.includes(parsed.hostname.toLowerCase())) {
      return {
        isValid: false,
        error: "Slack Webhook URL must originate from hooks.slack.com.",
      };
    }
    if (!parsed.pathname.startsWith("/services/")) {
      return {
        isValid: false,
        error: "Invalid Slack Webhook endpoint path. Expected /services/...",
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
