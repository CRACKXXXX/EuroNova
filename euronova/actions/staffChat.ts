"use server";

import { revalidatePath } from "next/cache";
import {
  verifyStaff,
  getServiceRoleClient,
} from "@/lib/staffAuth";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import type { UserRole } from "@/lib/roles";
import {
  canReadChannel,
  canWriteChannel,
  type StaffChatChannel,
  type StaffChatMessage,
  type StaffChatActionResult,
} from "@/lib/staffChatTypes";

export type { StaffChatChannel, StaffChatMessage, StaffChatActionResult };

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (err) {
    console.warn(`revalidatePath non-blocking fallback for ${path}:`, err);
  }
}

// In-memory resilient store for zero-downtime execution and rapid fallback
const inMemoryStaffMessages: StaffChatMessage[] = [
  {
    id: "seed-msg-1",
    channel: "general",
    userId: "system-root",
    authorName: "EuroNova Orbital Command",
    authorRole: "root",
    authorAvatar: null,
    content: "Welcome to the Staff Live Communication Hub. Coordinate with moderators and support specialists across dedicated channels.",
    isPinned: true,
    isEdited: false,
    replyToId: null,
    deletedAt: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "seed-msg-2",
    channel: "admin_command",
    userId: "system-root",
    authorName: "System Administration",
    authorRole: "admin",
    authorAvatar: null,
    content: "Critical system escalations and root-level security directives are archived here.",
    isPinned: true,
    isEdited: false,
    replyToId: null,
    deletedAt: null,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

/**
 * Retrieves staff messages for a given channel.
 * Strictly gated to users with verified staff clearance and channel read permission.
 */
export async function getStaffChatMessages(
  channel: StaffChatChannel = "general"
): Promise<StaffChatActionResult<StaffChatMessage[]>> {
  try {
    const { isAuthorized, user, role } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { success: false, error: "403 Unauthorized: Staff clearance required." };
    }

    if (!canReadChannel(channel, role)) {
      return { success: false, error: "403 Forbidden: You do not have clearance to read this channel." };
    }

    const adminDb = getServiceRoleClient();

    // Query messages from Supabase table
    const { data, error } = await adminDb
      .from("staff_chat_messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(150);

    if (error || !data || data.length === 0) {
      // Resilient fallback to memory store
      const filteredMemory = inMemoryStaffMessages
        .filter((m) => m.channel === channel)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Resolve in-memory replies
      const memoryMap = new Map<string, { id: string; authorName: string; content: string }>();
      inMemoryStaffMessages.forEach((m) => {
        memoryMap.set(m.id, {
          id: m.id,
          authorName: m.authorName,
          content: m.deletedAt ? "[This message was deleted]" : m.content,
        });
      });

      const resolvedMemory = filteredMemory.map((m) => ({
        ...m,
        replyTo: m.replyToId ? memoryMap.get(m.replyToId) || null : null,
      }));

      return { success: true, data: resolvedMemory };
    }

    // Map parent reply snippets
    const replyMap = new Map<string, { id: string; authorName: string; content: string }>();
    data.forEach((row) => {
      replyMap.set(row.id, {
        id: row.id,
        authorName: row.author_name || "Staff Member",
        content: row.deleted_at ? "[This message was deleted]" : row.content || "",
      });
    });

    const missingReplyIds = Array.from(
      new Set(
        data
          .map((r) => r.reply_to_id)
          .filter((id): id is string => Boolean(id) && !replyMap.has(id))
      )
    );

    if (missingReplyIds.length > 0) {
      try {
        const { data: missingParents } = await adminDb
          .from("staff_chat_messages")
          .select("id, author_name, content, deleted_at")
          .in("id", missingReplyIds);

        if (missingParents) {
          missingParents.forEach((p) => {
            replyMap.set(p.id, {
              id: p.id,
              authorName: p.author_name || "Staff Member",
              content: p.deleted_at ? "[This message was deleted]" : p.content || "",
            });
          });
        }
      } catch (err) {
        console.warn("Non-blocking lookup of missing reply parents:", err);
      }
    }

    const messages: StaffChatMessage[] = data.map((row) => ({
      id: row.id,
      channel: (row.channel || "general") as StaffChatChannel,
      userId: row.user_id,
      authorName: row.author_name || "Staff Member",
      authorRole: (row.author_role || "support") as UserRole,
      authorAvatar: row.author_avatar || null,
      content: row.content || "",
      isPinned: Boolean(row.is_pinned),
      isEdited: Boolean(row.is_edited),
      replyToId: row.reply_to_id || null,
      replyTo: row.reply_to_id ? replyMap.get(row.reply_to_id) || null : null,
      deletedAt: row.deleted_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { success: true, data: messages };
  } catch (err: unknown) {
    console.error("getStaffChatMessages exception:", err);
    const fallbackList = inMemoryStaffMessages.filter((m) => m.channel === channel);
    return { success: true, data: fallbackList };
  }
}

/**
 * Posts a new message to a specific staff channel.
 * Strictly gated by verifyStaff() and canWriteChannel(channel, role).
 */
export async function postStaffChatMessage(input: {
  channel: StaffChatChannel;
  content: string;
  replyToId?: string | null;
}): Promise<StaffChatActionResult<StaffChatMessage>> {
  try {
    const { isAuthorized, user, role } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { success: false, error: "403 Unauthorized: Staff clearance required." };
    }

    // Role-based channel posting restriction matrix
    if (!canWriteChannel(input.channel, role)) {
      return {
        success: false,
        error: "403 Forbidden: You do not have broadcasting clearance in this channel.",
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

    // Resolve replyTo snippet if replying to another message
    let replyToSnippet: { id: string; authorName: string; content: string } | null = null;
    if (input.replyToId) {
      const memParent = inMemoryStaffMessages.find((m) => m.id === input.replyToId);
      if (memParent) {
        replyToSnippet = {
          id: memParent.id,
          authorName: memParent.authorName,
          content: memParent.deletedAt ? "[This message was deleted]" : memParent.content,
        };
      } else {
        try {
          const { data: dbParent } = await adminDb
            .from("staff_chat_messages")
            .select("id, author_name, content, deleted_at")
            .eq("id", input.replyToId)
            .maybeSingle();

          if (dbParent) {
            replyToSnippet = {
              id: dbParent.id,
              authorName: dbParent.author_name || "Staff Member",
              content: dbParent.deleted_at ? "[This message was deleted]" : dbParent.content || "",
            };
          }
        } catch {
          // Non-blocking parent lookup
        }
      }
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
      isEdited: false,
      replyToId: input.replyToId || null,
      replyTo: replyToSnippet,
      deletedAt: null,
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
          is_edited: false,
          reply_to_id: input.replyToId || null,
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

    safeRevalidate("/dashboard/admin");
    safeRevalidate("/dashboard/moderator-panel");
    safeRevalidate("/dashboard/support-panel");

    return { success: true, data: newMessage };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to transmit message.";
    console.error("postStaffChatMessage exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Edits an existing staff chat message.
 * Users can strictly ONLY edit their OWN messages.
 */
export async function editStaffChatMessage(input: {
  messageId: string;
  content: string;
}): Promise<StaffChatActionResult<StaffChatMessage>> {
  try {
    const { isAuthorized, user } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { success: false, error: "403 Unauthorized: Staff clearance required." };
    }

    const rawContent = (input.content || "").trim();
    if (!rawContent) {
      return { success: false, error: "Message content cannot be empty." };
    }

    const cleanContent = stripDangerousHtml(rawContent, 4000);
    const adminDb = getServiceRoleClient();

    // Verify ownership: users can strictly ONLY edit their own messages
    let messageUserId: string | null = null;
    let isDeleted = false;

    const memMsg = inMemoryStaffMessages.find((m) => m.id === input.messageId);
    if (memMsg) {
      messageUserId = memMsg.userId;
      isDeleted = Boolean(memMsg.deletedAt);
    } else {
      const { data: dbMsg } = await adminDb
        .from("staff_chat_messages")
        .select("user_id, deleted_at")
        .eq("id", input.messageId)
        .maybeSingle();

      if (dbMsg) {
        messageUserId = dbMsg.user_id;
        isDeleted = Boolean(dbMsg.deleted_at);
      }
    }

    if (!messageUserId) {
      return { success: false, error: "Message not found." };
    }

    if (messageUserId !== user.id) {
      return { success: false, error: "403 Forbidden: You can only edit your own messages." };
    }

    if (isDeleted) {
      return { success: false, error: "Cannot edit a deleted message." };
    }

    const updatedAt = new Date().toISOString();

    // 1. Update in Database
    try {
      await adminDb
        .from("staff_chat_messages")
        .update({
          content: cleanContent,
          is_edited: true,
          updated_at: updatedAt,
        })
        .eq("id", input.messageId);
    } catch (dbErr) {
      console.warn("DB edit error, falling back to memory:", dbErr);
    }

    // 2. Update in-memory message
    if (memMsg) {
      memMsg.content = cleanContent;
      memMsg.isEdited = true;
      memMsg.updatedAt = updatedAt;
    }

    safeRevalidate("/dashboard/admin");
    safeRevalidate("/dashboard/moderator-panel");
    safeRevalidate("/dashboard/support-panel");

    return {
      success: true,
      data: memMsg || {
        id: input.messageId,
        channel: "general",
        userId: user.id,
        authorName: "Staff Member",
        authorRole: "support",
        content: cleanContent,
        isPinned: false,
        isEdited: true,
        replyToId: null,
        deletedAt: null,
        createdAt: updatedAt,
        updatedAt,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to edit message.";
    console.error("editStaffChatMessage exception:", errorMsg);
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

    safeRevalidate("/dashboard/admin");
    safeRevalidate("/dashboard/moderator-panel");
    safeRevalidate("/dashboard/support-panel");

    return { success: true, data: { isPinned: updatedPinnedState } };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to toggle message pin.";
    console.error("togglePinStaffChatMessage exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Soft-deletes a staff chat message.
 * Users can strictly ONLY delete their OWN messages (or executive root/admin).
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

    // Verify ownership: authors can delete their own, or root/admin can delete
    let canDelete = role === "root" || role === "admin";
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

    const deletedAt = new Date().toISOString();

    // Soft delete in database to preserve reply links and audit history
    try {
      await adminDb
        .from("staff_chat_messages")
        .update({
          deleted_at: deletedAt,
          updated_at: deletedAt,
        })
        .eq("id", messageId);
    } catch (dbErr) {
      console.warn("Database soft-delete error, falling back to memory:", dbErr);
    }

    // Soft delete in memory store
    const memMsg = inMemoryStaffMessages.find((m) => m.id === messageId);
    if (memMsg) {
      memMsg.deletedAt = deletedAt;
      memMsg.updatedAt = deletedAt;
    }

    safeRevalidate("/dashboard/admin");
    safeRevalidate("/dashboard/moderator-panel");
    safeRevalidate("/dashboard/support-panel");

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete message.";
    console.error("deleteStaffChatMessage exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
