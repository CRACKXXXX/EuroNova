import type { UserRole } from "./roles";

/**
 * Mask an email address by obfuscating the local part.
 * Example: "john.doe@example.com" -> "j***e@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "—";
  const trimmed = email.trim();
  const parts = trimmed.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  if (local.length <= 1) return `*@${domain}`;
  if (local.length === 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Mask a phone number by obfuscating digits.
 * Example: "+34 612 345 678" -> "+34 ••• ••• •••"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== "string") return "—";
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "***";
  // Keep country prefix if formatted (e.g. +34) and mask the rest
  if (trimmed.startsWith("+")) {
    const parts = trimmed.split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ••• ••• •••`;
    }
  }
  return `${trimmed.slice(0, 3)} ••• ••• •••`;
}

/**
 * Obfuscate a technical/physical ID or UUID string.
 * Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" -> "a1b2...7890"
 */
export function maskId(id: string | null | undefined): string {
  if (!id || typeof id !== "string") return "—";
  const trimmed = id.trim();
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export interface RolePrivacyResolution {
  email: string;
  phone: string;
  name: string;
  id: string;
  isPhoneMasked: boolean;
  isEmailMasked: boolean;
  isIdMasked: boolean;
  isRestrictedForRole: boolean;
}

/**
 * Asymmetric Data Privacy Resolver for Support vs Moderator roles.
 *
 * Rules:
 * - Default (showSensitive === false): ALL sensitive fields masked for everyone.
 * - When showSensitive === true:
 *   - 'support' role: ONLY Name and Email can be revealed. Phone, physical IDs,
 *     and detailed addresses remain strictly masked with '***' or '••••••'.
 *   - 'moderator' (or 'admin'/'root') roles: Permitted to see ALL sensitive data
 *     (Phone, Email, Full Name, Technical IDs) for investigations.
 */
export function resolveUserPrivacy(params: {
  currentUserRole?: UserRole | string;
  showSensitive: boolean;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  id?: string | null;
}): RolePrivacyResolution {
  const { currentUserRole, showSensitive, email, phone, name, id } = params;
  const role = (currentUserRole || "").toLowerCase();

  const isSupport = role === "support";
  const isHighPrivilege = role === "moderator" || role === "admin" || role === "root";

  // CASE 1: Sensitive data is toggled OFF (Default privacy state)
  if (!showSensitive) {
    return {
      email: email ? maskEmail(email) : "—",
      phone: phone ? maskPhone(phone) : "—",
      name: name ? name : "—",
      id: id ? maskId(id) : "—",
      isPhoneMasked: true,
      isEmailMasked: true,
      isIdMasked: true,
      isRestrictedForRole: false,
    };
  }

  // CASE 2: Sensitive data is toggled ON, but user has 'support' role
  // STRICT RULE: Support users NEVER see phone numbers or physical IDs.
  if (isSupport) {
    return {
      email: email ? email.trim() : "—",
      phone: phone ? "***-***-****" : "—", // Permanently masked for support
      name: name ? name.trim() : "—",
      id: id ? maskId(id) : "—", // Technical ID remains masked
      isPhoneMasked: true,
      isEmailMasked: false, // Revealed
      isIdMasked: true,
      isRestrictedForRole: Boolean(phone && phone.trim()),
    };
  }

  // CASE 3: Sensitive data is toggled ON, and user has 'moderator', 'admin', or 'root' role
  // STANDARD PRIVILEGED ACCESS: Reveals full contact information
  if (isHighPrivilege) {
    return {
      email: email ? email.trim() : "—",
      phone: phone ? phone.trim() : "—",
      name: name ? name.trim() : "—",
      id: id ? id.trim() : "—",
      isPhoneMasked: false,
      isEmailMasked: false,
      isIdMasked: false,
      isRestrictedForRole: false,
    };
  }

  // Fallback: If unknown role, default to strictest masking
  return {
    email: email ? maskEmail(email) : "—",
    phone: phone ? "***-***-****" : "—",
    name: name ? name : "—",
    id: id ? maskId(id) : "—",
    isPhoneMasked: true,
    isEmailMasked: true,
    isIdMasked: true,
    isRestrictedForRole: true,
  };
}

