import type { UserRole } from "./rolesTypes";

export type StaffChatChannel =
  | "general"
  | "support_tickets"
  | "support_reports"
  | "moderator_tickets"
  | "moderator_reports"
  | "admin_command"
  | "announcements_global"
  | "announcements_mod"
  | "announcements_support"
  | "announcements_mod_to_support"
  // Legacy aliases for backward compatibility
  | "general-staff"
  | "moderation-ops"
  | "support-tickets"
  | "admin-command";

export interface StaffChannelConfig {
  id: StaffChatChannel;
  name: string;
  description: string;
  category: "operations" | "moderation" | "support" | "command" | "broadcast";
}

export const STAFF_CHANNELS: StaffChannelConfig[] = [
  {
    id: "general",
    name: "#general",
    description: "General staff sync, team alerts, and open coordination.",
    category: "operations",
  },
  {
    id: "support_tickets",
    name: "#support-tickets",
    description: "Volunteer inquiries, support coordination, and ticket reviews.",
    category: "support",
  },
  {
    id: "support_reports",
    name: "#support-reports",
    description: "Support team report triage and escalated ticket concerns.",
    category: "support",
  },
  {
    id: "moderator_tickets",
    name: "#moderator-tickets",
    description: "Moderator ticket investigations and dispute reviews.",
    category: "moderation",
  },
  {
    id: "moderator_reports",
    name: "#moderator-reports",
    description: "Active report triage, warnings, mutes, and moderation incidents.",
    category: "moderation",
  },
  {
    id: "admin_command",
    name: "#admin-command",
    description: "Root & Admin command directives, security locks, and infra alerts.",
    category: "command",
  },
  {
    id: "announcements_global",
    name: "#announcements-global",
    description: "Global operational directives from Executive Staff (All read, Admin write).",
    category: "broadcast",
  },
  {
    id: "announcements_mod",
    name: "#announcements-mod",
    description: "Moderation policy updates and rule amendments (Mod/Admin read, Admin write).",
    category: "broadcast",
  },
  {
    id: "announcements_support",
    name: "#announcements-support",
    description: "Support policy updates and workflow guidelines (Support/Admin read, Admin write).",
    category: "broadcast",
  },
  {
    id: "announcements_mod_to_support",
    name: "#announcements-mod-to-support",
    description: "Moderator coordination directives to Support specialists (Mod/Admin write, All read).",
    category: "broadcast",
  },
];

/**
 * Validates if a user role has READ access to a specific staff chat channel.
 */
export function canReadChannel(channel: StaffChatChannel, role: UserRole): boolean {
  if (role === "root" || role === "admin") return true;

  switch (channel) {
    case "general":
    case "general-staff":
    case "support_tickets":
    case "support-tickets":
    case "support_reports":
    case "announcements_global":
    case "announcements_mod_to_support":
      return role === "support" || role === "moderator";

    case "moderator_tickets":
    case "moderator_reports":
    case "moderation-ops":
    case "announcements_mod":
      return role === "moderator";

    case "announcements_support":
      return role === "support";

    case "admin_command":
    case "admin-command":
    default:
      return false;
  }
}

/**
 * Validates if a user role has WRITE access to a specific staff chat channel.
 */
export function canWriteChannel(channel: StaffChatChannel, role: UserRole): boolean {
  if (role === "root" || role === "admin") return true;

  switch (channel) {
    case "general":
    case "general-staff":
    case "support_tickets":
    case "support-tickets":
    case "support_reports":
      return role === "support" || role === "moderator";

    case "moderator_tickets":
    case "moderator_reports":
    case "moderation-ops":
    case "announcements_mod_to_support":
      return role === "moderator";

    case "announcements_global":
    case "announcements_mod":
    case "announcements_support":
    case "admin_command":
    case "admin-command":
    default:
      return false;
  }
}

export interface StaffChatMessage {
  id: string;
  channel: StaffChatChannel;
  userId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar?: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffChatActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
