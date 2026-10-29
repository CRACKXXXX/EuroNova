"use server";

import { revalidatePath } from "next/cache";
import {
  verifyStaff,
  getServiceRoleClient,
} from "@/lib/staffAuth";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import type { UserRole } from "@/lib/roles";

export type StaffChatChannel =
  | "general-staff"
  | "moderation-ops"
  | "support-tickets"
  | "admin-command";

export const STAFF_CHANNELS: { id: StaffChatChannel; name: string; description: string }[] = [
  {
    id: "general-staff",
    name: "#general-staff",
    description: "General staff sync, alerts, and team communications.",
  },
  {
    id: "moderation-ops",
    name: "#moderation-ops",
    description: "Active report triage, warnings, mutes, and moderation incidents.",
  },
  {
    id: "support-tickets",
    name: "#support-tickets",
    description: "Volunteer inquiries, support coordination, and ticket reviews.",
  },
  {
    id: "admin-command",
    name: "#admin-command",
    description: "Root & Admin command directives, system updates, and emergency locks.",
  },
];

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

// In-memory resilient store for zero-downtime execution and rapid fallback
const inMemoryStaffMessages: StaffChatMessage[] = [
  {
    id: "seed-msg-1",
    channel: "general-staff",
    userId: "system-root",
    authorName: "EuroNova Orbital Command",
    authorRole: "root",
    authorAvatar: null,
    content: "Welcome to the Staff Live Communication Hub. Coordinate with moderators and support specialists across dedicated channels.",
    isPinned: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "seed-msg-2",
    channel: "admin-command",
    userId: "system-root",
    authorName: "System Administration",
    authorRole: "admin",
    authorAvatar: null,
    content: "Critical system escalations and root-level security directives are archived here.",
    isPinned: true,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

/**
 * Retrieves staff messages for a given channel.
 * Strictly gated to users with verified staff clearance (root, admin, moderator, support).
 */
export async function getStaffChatMessages(
  channel: StaffChatChannel = "general-staff"
): Promise<StaffChatActionResult<StaffChatMessage[]>> {
  try {
    const { isAuthorized, user } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { success: false, error: "403 Unauthorized: Staff clearance required." };
    }

    const adminDb = getServiceRoleClient();

    // Query messages from Supabase table
    const { data, error } = await adminDb
      .from("staff_chat_messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error || !data || data.length === 0) {
      // Resilient fallback to memory store
      const filteredMemory = inMemoryStaffMessages
        .filter((m) => m.channel === channel)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return { success: true, data: filteredMemory };
    }

    const messages: StaffChatMessage[] = data.map((row) => ({
      id: row.id,
      channel: (row.channel || "general-staff") as StaffChatChannel,
      userId: row.user_id,
      authorName: row.author_name || "Staff Member",
      authorRole: (row.author_role || "support") as UserRole,
      authorAvatar: row.author_avatar || null,
      content: row.content || "",
      isPinned: Boolean(row.is_pinned),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { success: true, data: messages };
  } catch (err: unknown) {
    console.error("getStaffChatMessages exception:", err);
    // Graceful fallback to memory store
    const fallbackList = inMemoryStaffMessages.filter((m) => m.channel === channel);
    return { success: true, data: fallbackList };
  }
}

/**
 * Posts a new message to a specific staff channel.
 * Strictly gated by verifyStaff(); #admin-command requires root or admin authority.
 */
export async function postStaffChatMessage(input: {
  channel: StaffChatChannel;
  content: string;
}): Promise<StaffChatActionResult<StaffChatMessage>> {
  try {
    const { isAuthorized, user, role } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { success: false, error: "403 Unauthorized: Staff clearance required." };
    }

    // Role-based channel posting restriction
    if (input.channel === "admin-command" && role !== "root" && role !== "admin") {
      return {
        success: false,
        error: "403 Forbidden: Only Root Administrators and Admins can broadcast in #admin-command.",
      };
    }

    const rawContent = (input.content || "").trim();
    if (!rawContent) {
      return { success: false, error: "Message content cannot be empty." };
    }

    const cleanContent = stripDangerousHtml(rawContent, 4000);

    // Resolve author name and avatar
    const adminDb = getServiceRoleClient();
    let authorName = "Staff Specialist";
    let authorAvatar: string | null = null;

    try {
      const { data: youth } = await adminDb
        .from("users_youth")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (youth?.full_name) {
        authorName = youth.full_name;
        authorAvatar = youth.avatar_url || null;
      } else if (user.user_metadata?.full_name) {
        authorName = user.user_metadata.full_name;
      } else if (user.email) {
        authorName = user.email.split("@")[0] || "Staff Member";
      }
    } catch {
      // Non-blocking metadata resolution
    }

    const newMessage: StaffChatMessage = {
      id: `staff-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channel: input.channel,
      userId: user.id,
      authorName,
      authorRole: role,
      authorAvatar,
      content: cleanContent,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Insert into database table
    try {
      const { data: dbData, error: dbError } = await adminDb
        .from("staff_chat_messages")
        .insert({
          channel: input.channel,
          user_id: user.id,
          author_name: authorName,
          author_role: role,
          author_avatar: authorAvatar,
          content: cleanContent,
          is_pinned: false,
        })
        .select("*")
        .single();

      if (!dbError && dbData) {
        newMessage.id = dbData.id;
        newMessage.createdAt = dbData.created_at;
      }
    } catch (insertErr) {
      console.warn("DB insert error, persisting to memory store:", insertErr);
    }

    // 2. Persist to memory store
    inMemoryStaffMessages.push(newMessage);
    if (inMemoryStaffMessages.length > 300) {
      inMemoryStaffMessages.shift();
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/moderator-panel");
    revalidatePath("/dashboard/support-panel");

    return { success: true, data: newMessage };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to transmit message.";
    console.error("postStaffChatMessage exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Toggles the pinned status of a message.
 * Gated to root, admin, and moderator roles.
 */
export async function togglePinStaffChatMessage(
  messageId: string
): Promise<StaffChatActionResult<{ isPinned: boolean }>> {
  try {
    const { isAuthorized, user, role } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { success: false, error: "403 Unauthorized: Staff clearance required." };
    }

    if (role === "support") {
      return { success: false, error: "Permission Denied: Support staff cannot pin messages." };
    }

    const adminDb = getServiceRoleClient();
    let updatedPinnedState = false;

    // Check database message
    try {
      const { data: existing } = await adminDb
        .from("staff_chat_messages")
        .select("is_pinned")
        .eq("id", messageId)
        .maybeSingle();

      if (existing) {
        updatedPinnedState = !existing.is_pinned;
        await adminDb
          .from("staff_chat_messages")
          .update({ is_pinned: updatedPinnedState, updated_at: new Date().toISOString() })
          .eq("id", messageId);
      }
    } catch (dbErr) {
      console.warn("Database pin update fallback to memory:", dbErr);
    }

    // Update in-memory message
    const memMsg = inMemoryStaffMessages.find((m) => m.id === messageId);
    if (memMsg) {
      memMsg.isPinned = !memMsg.isPinned;
      updatedPinnedState = memMsg.isPinned;
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/moderator-panel");
    revalidatePath("/dashboard/support-panel");

    return { success: true, data: { isPinned: updatedPinnedState } };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to toggle message pin.";
    console.error("togglePinStaffChatMessage exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Deletes a staff chat message.
 * Gated to message author or root/admin/moderator.
 */
export async function deleteStaffChatMessage(
  messageId: string
): Promise<StaffChatActionResult> {
  try {
    const { isAuthorized, user, role } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { success: false, error: "403 Unauthorized: Staff clearance required." };
    }

    const adminDb = getServiceRoleClient();

    // Verify ownership or management role
    let canDelete = role === "root" || role === "admin" || role === "moderator";
    if (!canDelete) {
      const memMsg = inMemoryStaffMessages.find((m) => m.id === messageId);
      if (memMsg && memMsg.userId === user.id) {
        canDelete = true;
      } else {
        const { data: dbMsg } = await adminDb
          .from("staff_chat_messages")
          .select("user_id")
          .eq("id", messageId)
          .maybeSingle();

        if (dbMsg && dbMsg.user_id === user.id) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) {
      return { success: false, error: "403 Forbidden: You can only delete your own messages." };
    }

    try {
      await adminDb.from("staff_chat_messages").delete().eq("id", messageId);
    } catch (dbErr) {
      console.warn("Database delete error, falling back to memory:", dbErr);
    }

    const memIndex = inMemoryStaffMessages.findIndex((m) => m.id === messageId);
    if (memIndex !== -1) {
      inMemoryStaffMessages.splice(memIndex, 1);
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/moderator-panel");
    revalidatePath("/dashboard/support-panel");

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete message.";
    console.error("deleteStaffChatMessage exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

