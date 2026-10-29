"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createClientWithKey } from "@supabase/supabase-js";
import { autoModerateContent } from "@/lib/autoModerator";
import { calculateLevelFromXp } from "@/lib/gamification";
import {
  verifyMidSessionActiveStatus,
  muteUser,
  warnUser,
  logToQuarantine,
  type MuteDuration,
} from "@/lib/moderationShield";
import { getUserRole, type UserRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { ProjectForumPostSchema, UuidSchema } from "@/lib/schemas";

export type { MuteDuration, UserRole };

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClientWithKey(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface ForumMessageItem {
  id: string;
  project_id: string;
  user_id: string;
  author_name: string;
  author_role: "volunteer" | "coordinator" | "admin";
  author_user_role?: UserRole;
  author_level?: number;
  author_title?: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
  parent_id?: string | null;
}

export interface ForumPaginationMetadata {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface GetMessagesResponse {
  success: boolean;
  messages: ForumMessageItem[];
  error?: string;
  pagination?: ForumPaginationMetadata;
}

export interface PostMessageResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
  message?: ForumMessageItem;
}

export interface ProjectForumEligibility {
  isAuthenticated: boolean;
  userId?: string;
  role: "volunteer" | "coordinator" | "admin" | "guest";
  userRole?: UserRole;
  xp: number;
  level: number;
  trustScore?: number;
  isMuted?: boolean;
  canPost: boolean;
  canReply?: boolean;
  isProjectCoordinator?: boolean;
  reason?: string;
  errorCode?: string;
}

/**
 * Checks the user's eligibility to post in a project Q&A forum.
 * - Volunteers must have Level 2+ (100+ XP) and Trust Score >= 30 and not be muted.
 * - Coordinators and Admins always have permission.
 */
export async function getProjectForumEligibility(projectId: string): Promise<ProjectForumEligibility> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        isAuthenticated: false,
        role: "guest",
        userRole: "user",
        xp: 0,
        level: 1,
        canPost: false,
        canReply: false,
        isProjectCoordinator: false,
        reason: "Sign in to participate in the mission squad forum.",
      };
    }

    const userRole = await getUserRole(user.id, user.email);
    const isStaff = userRole === "admin" || userRole === "moderator" || userRole === "support";

    if (userRole === "admin" || userRole === "root" || user.email === "euronovaofficial@gmail.com") {
      return {
        isAuthenticated: true,
        userId: user.id,
        role: "admin",
        userRole: "admin",
        xp: 99999,
        level: 99,
        trustScore: 100,
        isMuted: false,
        canPost: true,
        canReply: true,
        isProjectCoordinator: true,
      };
    }

    // Check if user is the project coordinator
    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id")
      .eq("id", projectId)
      .maybeSingle();

    const isProjectCoordinator = Boolean(project && project.org_id === user.id);
    if (isProjectCoordinator) {
      return {
        isAuthenticated: true,
        userId: user.id,
        role: "coordinator",
        userRole,
        xp: 99999,
        level: 99,
        trustScore: 100,
        isMuted: false,
        canPost: true,
        canReply: true,
        isProjectCoordinator: true,
      };
    }

    // Check if user is an organization representative
    const { data: orgProfile } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (orgProfile) {
      return {
        isAuthenticated: true,
        userId: user.id,
        role: "coordinator",
        userRole,
        xp: 99999,
        level: 99,
        trustScore: 100,
        isMuted: false,
        canPost: true,
        canReply: isStaff || true,
        isProjectCoordinator: false,
      };
    }

    // Check volunteer XP, Level, Trust Score and Mute Status
    const { data: youthData } = await supabase
      .from("users_youth")
      .select("xp, trust_score, muted_until")
      .eq("id", user.id)
      .maybeSingle();

    const xp = youthData?.xp || 0;
    const trustScore = typeof youthData?.trust_score === "number" ? youthData.trust_score : 50;
    const isMuted = youthData?.muted_until ? new Date(youthData.muted_until).getTime() > Date.now() : false;
    const level = calculateLevelFromXp(xp);

    const meetsVolunteerGate = !isMuted && level >= 2 && xp >= 100 && trustScore >= 30;
    const canPost = isStaff || meetsVolunteerGate;
    // Reply Gating Rule: Only Level > 10 (11+), Staff, or Project Coordinator (and not muted/trust >= 30)
    const canReply = isStaff || isProjectCoordinator || (!isMuted && trustScore >= 30 && level > 10);

    let reason: string | undefined = undefined;
    let errorCode: string | undefined = undefined;

    if (!canPost) {
      if (isMuted) {
        reason = "You are temporarily restricted from posting because your account is muted.";
        errorCode = "USER_MUTED";
      } else if (level < 2 || xp < 100) {
        reason = "Reach Level 2 (100 XP) to participate in project Q&A to prevent spam.";
        errorCode = "LEVEL_INSUFFICIENT";
      } else if (trustScore < 30) {
        reason = `Trust Score 30+ required to participate (${trustScore}/100). Complete your profile dossier or verified missions to restore good standing.`;
        errorCode = "TRUST_SCORE_TOO_LOW";
      }
    }

    return {
      isAuthenticated: true,
      userId: user.id,
      role: "volunteer",
      userRole,
      xp,
      level,
      trustScore,
      isMuted,
      canPost,
      canReply,
      isProjectCoordinator: false,
      reason,
      errorCode,
    };
  } catch (err) {
    console.error("Error checking project forum eligibility:", err);
    return {
      isAuthenticated: false,
      role: "guest",
      userRole: "user",
      xp: 0,
      level: 1,
      canPost: false,
      canReply: false,
      reason: "Could not verify forum permissions.",
    };
  }
}

/**
 * Retrieves forum messages for a specific project with 50-item pagination,
 * enriched with each author's verified level and title.
 */
export async function getProjectMessages(
  projectId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<GetMessagesResponse> {
  try {
    if (!projectId || typeof projectId !== "string") {
      return { success: false, messages: [], error: "Valid Project ID is required." };
    }

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const supabase = await createClient();
    
    // Attempt selecting with parent_id; fallback if column has not been migrated yet
    let rawMessages: ForumMessageItem[] = [];
    let totalCount = 0;

    const { data, count, error } = await supabase
      .from("project_forum_messages")
      .select("id, project_id, user_id, author_name, author_role, avatar_url, content, created_at, parent_id", { count: "exact" })
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .range(offset, offset + safePageSize - 1);

    if (error) {
      if (error.code === "42703") {
        const fallbackRes = await supabase
          .from("project_forum_messages")
          .select("id, project_id, user_id, author_name, author_role, avatar_url, content, created_at", { count: "exact" })
          .eq("project_id", projectId)
          .order("created_at", { ascending: true })
          .range(offset, offset + safePageSize - 1);

        if (fallbackRes.error) {
          console.error("Error fetching forum messages fallback:", fallbackRes.error);
          return { success: false, messages: [], error: sanitizeErrorMessage(fallbackRes.error) };
        }
        rawMessages = (fallbackRes.data as ForumMessageItem[]) || [];
        totalCount = fallbackRes.count ?? rawMessages.length;
      } else {
        console.error("Error fetching forum messages:", error);
        return { success: false, messages: [], error: sanitizeErrorMessage(error) };
      }
    } else {
      rawMessages = (data as ForumMessageItem[]) || [];
      totalCount = count ?? rawMessages.length;
    }

    const totalPages = Math.ceil(totalCount / safePageSize) || 1;

    const userIds = Array.from(new Set(rawMessages.map((m) => m.user_id).filter(Boolean)));
    const xpMap = new Map<string, number>();
    const roleMap = new Map<string, UserRole>();

    if (userIds.length > 0) {
      const { data: youths } = await supabase
        .from("users_youth")
        .select("id, xp, role")
        .in("id", userIds);

      if (youths) {
        youths.forEach((y) => {
          xpMap.set(y.id, y.xp || 0);
          if (y.role === "root" || y.role === "admin") {
            roleMap.set(y.id, "admin");
          } else if (y.role && ["moderator", "support", "user"].includes(y.role)) {
            roleMap.set(y.id, y.role as UserRole);
          }
        });
      }
    }

    const enrichedMessages: ForumMessageItem[] = rawMessages.map((msg) => {
      const isCoordinator = msg.author_role === "coordinator";
      const isAdmin = msg.author_role === "admin";
      let level = 1;
      let title = "Verified Volunteer";

      const mappedRole = roleMap.get(msg.user_id) || (isAdmin ? "admin" : "user");

      if (mappedRole === "admin" || isAdmin) {
        level = 99;
        title = "EuroNova Admin";
      } else if (mappedRole === "moderator") {
        level = 80;
        title = "EuroNova Moderator";
      } else if (mappedRole === "support") {
        level = 50;
        title = "EuroNova Support";
      } else if (isCoordinator) {
        level = 99;
        title = "Organization Coordinator";
      } else {
        const xp = xpMap.get(msg.user_id) || 0;
        level = calculateLevelFromXp(xp);
        title = "Verified Volunteer";
      }

      return {
        ...msg,
        author_level: level,
        author_title: title,
        author_user_role: mappedRole,
      };
    });

    return {
      success: true,
      messages: enrichedMessages,
      pagination: {
        totalCount,
        page: safePage,
        pageSize: safePageSize,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    };
  } catch (err) {
    console.error("Unexpected error in getProjectMessages:", err);
    return {
      success: false,
      messages: [],
      error: sanitizeErrorMessage(err),
    };
  }
}

/**
 * Posts a new question or answer to the project community forum.
 * Shielded by the Hyper-Strict EuroNova Auto-Moderation Engine, Mute Time-out check, and Level 2 gating.
 */
export async function postProjectMessage(
  projectId: string,
  content: string,
  customAuthorName?: string,
  parentId?: string | null
): Promise<PostMessageResponse> {
  try {
    // 1. Zod double-layer schema validation
    const parsed = ProjectForumPostSchema.safeParse({
      projectId,
      content,
      customAuthorName,
      parentId,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid post parameters.";
      return { success: false, error: issue };
    }

    // 2. Strip dangerous HTML/scripts
    const trimmedContent = stripDangerousHtml(parsed.data.content, 3000);
    const sanitizedCustomAuthorName = parsed.data.customAuthorName
      ? stripDangerousHtml(parsed.data.customAuthorName, 80)
      : undefined;

    if (!trimmedContent) {
      return { success: false, error: "Message content cannot be empty after sanitization." };
    }

    // 3. AUTHENTICATION & MUTE CHECK
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be signed in to post in the mission squad forum.",
        errorCode: "UNAUTHORIZED",
      };
    }

    // Rate Limiting Gate (Sliding Window by User ID)
    const rateCheck = await checkRateLimit(user.id, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return {
        success: false,
        error: rateCheck.error || "Rate limit reached. Please wait before posting again.",
        errorCode: "RATE_LIMITED",
      };
    }

    // VERIFY MID-SESSION ACTIVE STATUS (Bans, Mutes, Suspensions)
    const statusCheck = await verifyMidSessionActiveStatus(user.id);
    if (!statusCheck.allowed) {
      return {
        success: false,
        error: statusCheck.error || "You are temporarily restricted from posting.",
        errorCode: statusCheck.errorCode || "ACCOUNT_RESTRICTED",
      };
    }

    // 4. FETCH PROJECT FOR CONTEXT AND PERMISSION RESOLUTION
    const { data: project } = await supabase
      .from("projects")
      .select("id, org_id, title")
      .eq("id", projectId)
      .maybeSingle();

    // 3. BACKEND HYPER-STRICT AUTO-MODERATION ENGINE CHECK (No emails, phones, or external links)
    const modCheck = autoModerateContent(trimmedContent, { isProjectForum: true });
    if (!modCheck.allowed) {
      // Auto-log incident into Quarantine Tray
      await logToQuarantine({
        targetUserId: user.id,
        targetName: sanitizedCustomAuthorName || user.email || "Flagged User",
        reason: "quarantine_automod",
        flaggedContent: `[Hyper-Strict Shield Blocked: ${modCheck.errorCode || "MODERATION_BLOCKED"}]: ${trimmedContent}`,
        contextTitle: project?.title || projectId,
        reportedByUserId: user.id,
        projectId,
      });

      return {
        success: false,
        error: modCheck.reason || "MODERATION_BLOCKED",
        errorCode: modCheck.errorCode || "MODERATION_BLOCKED",
      };
    }

    const userRole = await getUserRole(user.id, user.email);
    const isStaff = userRole === "admin" || userRole === "moderator" || userRole === "support";
    const isProjectCoordinator = Boolean(project && project.org_id === user.id);

    let authorRole: "volunteer" | "coordinator" | "admin" = "volunteer";
    let authorLevel = 1;
    let authorTitle = "Verified Volunteer";

    if (userRole === "admin") {
      authorRole = "admin";
      authorLevel = 99;
      authorTitle = "EuroNova Admin";
    } else if (userRole === "moderator") {
      authorRole = "volunteer";
      authorLevel = 80;
      authorTitle = "EuroNova Moderator";
    } else if (userRole === "support") {
      authorRole = "volunteer";
      authorLevel = 50;
      authorTitle = "EuroNova Support";
    } else if (isProjectCoordinator) {
      authorRole = "coordinator";
      authorLevel = 99;
      authorTitle = "Organization Coordinator";
    } else {
      // Check if user is an organization representative
      const { data: orgData } = await supabase
        .from("users_org")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (orgData) {
        authorRole = "coordinator";
        authorLevel = 99;
        authorTitle = "Organization Coordinator";
      } else {
        // Volunteer: Verify Level 2 gating (XP >= 100), Trust Score >= 30, and not muted
        const { data: youthData } = await supabase
          .from("users_youth")
          .select("xp, trust_score, muted_until")
          .eq("id", user.id)
          .maybeSingle();

        const xp = youthData?.xp || 0;
        const trustScore = typeof youthData?.trust_score === "number" ? youthData.trust_score : 50;
        const isMuted = youthData?.muted_until ? new Date(youthData.muted_until).getTime() > Date.now() : false;
        authorLevel = calculateLevelFromXp(xp);

        if (!isStaff) {
          if (isMuted) {
            return {
              success: false,
              error: "You are temporarily restricted from posting because your account is muted.",
              errorCode: "USER_MUTED",
            };
          }
          if (authorLevel < 2 || xp < 100) {
            return {
              success: false,
              error: "Reach Level 2 (100 XP) to participate in project Q&A to prevent spam.",
              errorCode: "LEVEL_INSUFFICIENT",
            };
          }
          if (trustScore < 30) {
            return {
              success: false,
              error: `Trust Score 30+ required to participate (${trustScore}/100). Complete your profile dossier or verified missions to restore good standing.`,
              errorCode: "TRUST_SCORE_TOO_LOW",
            };
          }
        }
      }
    }

    // STRICT REPLY GATING (Requirement 1):
    // Only Level > 10 (Level 11+), Staff ('admin' | 'moderator' | 'support'), or isProjectCoordinator can reply
    if (parentId) {
      const canReply = isStaff || isProjectCoordinator || authorLevel > 10;
      if (!canReply) {
        return {
          success: false,
          error: "Replying to questions is restricted to Level 11+ veterans, Staff, or project organizers.",
          errorCode: "REPLY_GATED",
        };
      }
    }

    // 4. RESOLVE USER PROFILE NAME AND AVATAR
    let resolvedName = sanitizedCustomAuthorName?.trim() || "";
    let avatarUrl: string | null = null;

    if (!resolvedName) {
      const { data: youthProfile } = await supabase
        .from("users_youth")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (youthProfile?.full_name?.trim()) {
        resolvedName = youthProfile.full_name.trim();
        avatarUrl = youthProfile.avatar_url || null;
      } else {
        const { data: orgProfile } = await supabase
          .from("users_org")
          .select("org_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (orgProfile?.org_name?.trim()) {
          resolvedName = orgProfile.org_name.trim();
          avatarUrl = orgProfile.avatar_url || null;
        }
      }
    }

    if (!resolvedName) {
      resolvedName = user.email?.split("@")[0] || "European Volunteer";
    }

    // 5. INSERT MESSAGE INTO DATABASE (Supporting nested parent_id)
    const insertPayload: Record<string, unknown> = {
      project_id: projectId,
      user_id: user.id,
      author_name: resolvedName,
      author_role: authorRole,
      avatar_url: avatarUrl,
      content: trimmedContent,
    };

    if (parentId) {
      insertPayload.parent_id = parentId;
    }

    let insertedMessage: ForumMessageItem | null = null;
    const { data: inserted, error: insertError } = await supabase
      .from("project_forum_messages")
      .insert(insertPayload)
      .select("id, project_id, user_id, author_name, author_role, avatar_url, content, created_at, parent_id")
      .single();

    if (insertError) {
      // If parent_id column does not exist yet, fallback to inserting without parent_id
      if (insertError.code === "42703" && parentId) {
        delete insertPayload.parent_id;
        const fallbackInsert = await supabase
          .from("project_forum_messages")
          .insert(insertPayload)
          .select("id, project_id, user_id, author_name, author_role, avatar_url, content, created_at")
          .single();

        if (fallbackInsert.error) {
          console.error("Failed to insert forum message fallback:", fallbackInsert.error);
          return { success: false, error: fallbackInsert.error.message };
        }
        insertedMessage = fallbackInsert.data as ForumMessageItem;
      } else {
        console.error("Failed to insert forum message:", insertError);
        return { success: false, error: insertError.message };
      }
    } else {
      insertedMessage = inserted as ForumMessageItem;
    }

    // Award XP and Trust Score boost for helpful forum participation (anti-farming protected by targetId)
    if (insertedMessage && insertedMessage.id) {
      try {
        const [{ awardUserXp }, { XP_CONFIG }] = await Promise.all([
          import("@/actions/gamification"),
          import("@/lib/gamification"),
        ]);
        await awardUserXp({
          amount: XP_CONFIG.FORUM_ANSWER.amount,
          reason: XP_CONFIG.FORUM_ANSWER.reason,
          actionType: XP_CONFIG.FORUM_ANSWER.actionType,
          targetId: `proj_forum_${insertedMessage.id}`,
          trustBoost: XP_CONFIG.FORUM_ANSWER.trustBoost,
        });
      } catch (xpErr) {
        console.error("Could not award XP for project forum post:", xpErr);
      }
    }

    revalidatePath(`/dashboard/projects/${projectId}`);

    const enrichedInserted: ForumMessageItem = {
      ...insertedMessage,
      author_level: authorLevel,
      author_title: authorTitle,
      author_user_role: userRole,
    };

    return {
      success: true,
      message: enrichedInserted,
    };
  } catch (err) {
    console.error("Unexpected error in postProjectMessage:", err);
    return {
      success: false,
      error: "An unexpected server error occurred while transmitting your message.",
    };
  }
}

export interface DeleteMessageResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Deletes a project forum message.
 * Strict Gating: Message author, Project Coordinator (NGO), or EuroNova Admin.
 * When deleted by coordinator/admin as suspicious, logged into Quarantine tray.
 */
export async function deleteProjectMessage(
  messageId: string,
  isSuspicious = false
): Promise<DeleteMessageResponse> {
  try {
    const validUuid = UuidSchema.safeParse(messageId);
    if (!validUuid.success) {
      return { success: false, error: "Valid message UUID is required." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be signed in to delete messages.",
        errorCode: "UNAUTHORIZED",
      };
    }

    // Fetch existing message to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("project_forum_messages")
      .select("id, user_id, project_id, author_name, content")
      .eq("id", messageId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Message not found or already deleted." };
    }

    // Fetch project to verify if user is the publishing NGO
    const [{ data: project }, userRole] = await Promise.all([
      supabase
        .from("projects")
        .select("id, org_id, title")
        .eq("id", existing.project_id)
        .maybeSingle(),
      getUserRole(user.id, user.email),
    ]);
    const isAuthor = user.id === existing.user_id;
    const isProjectCoordinator = Boolean(project && project.org_id === user.id);
    const isAdmin =
      userRole === "admin" ||
      userRole === "root" ||
      user.email === "euronovaofficial@gmail.com";
    const canModerate = isAdmin || userRole === "moderator";

    if (!isAuthor && !isProjectCoordinator && !canModerate) {
      return {
        success: false,
        error: userRole === "support"
          ? "Support staff cannot delete comments. Only Moderators and Admins have deletion authority."
          : "You are not authorized to delete this message.",
        errorCode: "FORBIDDEN",
      };
    }

    const db = getServiceRoleClient() || supabase;
    const { error: deleteError } = await db
      .from("project_forum_messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      console.error("Failed to delete project forum message:", deleteError);
      return { success: false, error: deleteError.message };
    }

    // If deleted by coordinator or admin and it's not their own message (or explicitly marked suspicious), log to Quarantine
    if ((isSuspicious || !isAuthor) && (isAdmin || isProjectCoordinator)) {
      await logToQuarantine({
        targetUserId: existing.user_id,
        targetName: existing.author_name,
        reason: "quarantine_coordinator_deleted",
        flaggedContent: existing.content,
        contextTitle: project?.title || existing.project_id,
        reportedByUserId: user.id,
        projectId: existing.project_id,
      });
    }

    revalidatePath(`/dashboard/projects/${existing.project_id}`);
    return { success: true };
  } catch (err) {
    console.error("Unexpected error in deleteProjectMessage:", err);
    return {
      success: false,
      error: "An unexpected error occurred while deleting the message.",
    };
  }
}

/**
 * Warns a user who posted a message in the project forum.
 * Strictly gated: Only the Project Coordinator or EuroNova Admin.
 */
export async function warnProjectForumUser(
  messageId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const [{ data: project }, userRole] = await Promise.all([
      supabase
        .from("projects")
        .select("id, org_id, title")
        .eq("id", projectId)
        .maybeSingle(),
      getUserRole(user.id, user.email),
    ]);
    const isCoordinator = Boolean(project && project.org_id === user.id);
    const canModerate = userRole === "admin" || userRole === "moderator";

    if (!canModerate && !isCoordinator) {
      return {
        success: false,
        error: userRole === "support"
          ? "Support staff cannot issue warnings. Only Moderators, Admins, or Project Coordinators have disciplinary authority."
          : "Only project coordinators, moderators, or EuroNova Admins can warn users.",
      };
    }

    const { data: message } = await supabase
      .from("project_forum_messages")
      .select("id, user_id, content")
      .eq("id", messageId)
      .maybeSingle();

    if (!message) {
      return { success: false, error: "Message not found." };
    }

    return await warnUser({
      targetUserId: message.user_id,
      contextTitle: project?.title || "Mission Q&A",
      warnedByUserId: user.id,
      projectId,
    });
  } catch (err) {
    console.error("warnProjectForumUser error:", err);
    return { success: false, error: "Failed to issue warning." };
  }
}

/**
 * Mutes a user who posted a message in the project forum (5m, 10m, 15m, 1h).
 * Strictly gated: Only the Project Coordinator or EuroNova Admin.
 */
export async function muteProjectForumUser(
  messageId: string,
  durationMinutes: MuteDuration,
  projectId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const [{ data: project }, userRole] = await Promise.all([
      supabase
        .from("projects")
        .select("id, org_id, title")
        .eq("id", projectId)
        .maybeSingle(),
      getUserRole(user.id, user.email),
    ]);
    const isCoordinator = Boolean(project && project.org_id === user.id);
    const canModerate = userRole === "admin" || userRole === "moderator";

    if (!canModerate && !isCoordinator) {
      return {
        success: false,
        error: userRole === "support"
          ? "Support staff cannot mute users. Only Moderators, Admins, or Project Coordinators have disciplinary authority."
          : "Only project coordinators, moderators, or EuroNova Admins can mute users.",
      };
    }

    const { data: message } = await supabase
      .from("project_forum_messages")
      .select("id, user_id, content")
      .eq("id", messageId)
      .maybeSingle();

    if (!message) {
      return { success: false, error: "Message not found." };
    }

    return await muteUser({
      targetUserId: message.user_id,
      durationMinutes,
      reason: reason || "Suspicious comment in project forum",
      contextTitle: project?.title || "Mission Q&A",
      mutedByUserId: user.id,
      projectId,
    });
  } catch (err) {
    console.error("muteProjectForumUser error:", err);
    return { success: false, error: "Failed to mute user." };
  }
}

export interface EditMessageResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
  message?: ForumMessageItem;
}

/**
 * Edits a project forum message.
 * Strictly gated: Only the message author can edit their own message.
 * Shielded by the EuroNova Auto-Moderation Engine.
 */
export async function editProjectMessage(
  messageId: string,
  newContent: string
): Promise<EditMessageResponse> {
  try {
    if (!messageId || typeof messageId !== "string") {
      return { success: false, error: "Valid message ID is required." };
    }

    if (!newContent || typeof newContent !== "string" || newContent.trim().length === 0) {
      return { success: false, error: "Message content cannot be empty." };
    }

    const trimmedContent = newContent.trim();

    // 1. BACKEND AUTO-MODERATION ENGINE CHECK (Zero Tolerance for spam/profanity)
    const modCheck = autoModerateContent(trimmedContent);
    if (!modCheck.allowed) {
      return {
        success: false,
        error: modCheck.reason || "MODERATION_BLOCKED",
        errorCode: modCheck.errorCode || "MODERATION_BLOCKED",
      };
    }

    // 2. AUTHENTICATION & AUTHORIZATION CHECK
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be signed in to edit messages.",
        errorCode: "UNAUTHORIZED",
      };
    }

    // 3. FETCH EXISTING MESSAGE
    const { data: existing, error: fetchError } = await supabase
      .from("project_forum_messages")
      .select("id, user_id, project_id, author_name, author_role, avatar_url, created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Message not found." };
    }

    // Only the author can edit their own message
    if (user.id !== existing.user_id) {
      return {
        success: false,
        error: "You can only edit your own messages.",
        errorCode: "FORBIDDEN",
      };
    }

    // 4. UPDATE MESSAGE CONTENT IN DATABASE
    const db = getServiceRoleClient() || supabase;
    const { data: updated, error: updateError } = await db
      .from("project_forum_messages")
      .update({ content: trimmedContent })
      .eq("id", messageId)
      .select("id, project_id, user_id, author_name, author_role, avatar_url, content, created_at")
      .single();

    if (updateError || !updated) {
      console.error("Failed to update project forum message:", updateError);
      return { success: false, error: updateError?.message || "Failed to update message." };
    }

    revalidatePath(`/dashboard/projects/${existing.project_id}`);

    // Resolve author level
    let authorLevel = 1;
    let authorTitle = "Verified Volunteer";
    if (updated.author_role === "admin") {
      authorLevel = 99;
      authorTitle = "EuroNova Admin";
    } else if (updated.author_role === "coordinator") {
      authorLevel = 99;
      authorTitle = "Organization Coordinator";
    } else {
      const { data: youthData } = await supabase
        .from("users_youth")
        .select("xp")
        .eq("id", user.id)
        .maybeSingle();
      const xp = youthData?.xp || 0;
      authorLevel = calculateLevelFromXp(xp);
    }

    const enrichedUpdated: ForumMessageItem = {
      ...(updated as ForumMessageItem),
      author_level: authorLevel,
      author_title: authorTitle,
    };

    return {
      success: true,
      message: enrichedUpdated,
    };
  } catch (err) {
    console.error("Unexpected error in editProjectMessage:", err);
    return {
      success: false,
      error: "An unexpected error occurred while editing the message.",
    };
  }
}
