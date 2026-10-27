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
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { GLOBAL_CATEGORIES } from "@/lib/globalForum";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { GlobalThreadSchema, GlobalPostSchema } from "@/lib/schemas";

export type { MuteDuration, UserRole };

export interface ThreadsPaginationMetadata {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface GlobalCategoryItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  display_order: number;
  thread_count?: number;
}

export interface GlobalThreadItem {
  id: string;
  category_id: string;
  user_id: string;
  author_name: string;
  author_role: "volunteer" | "coordinator" | "admin";
  author_user_role?: UserRole;
  author_avatar: string | null;
  title: string;
  content: string;
  views: number;
  reply_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  last_activity_at: string;
  created_at: string;
}

export interface GlobalPostItem {
  id: string;
  thread_id: string;
  user_id: string;
  author_name: string;
  author_role: "volunteer" | "coordinator" | "admin";
  author_user_role?: UserRole;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

export interface UserEligibilityResponse {
  isAuthenticated: boolean;
  userId?: string;
  role: "volunteer" | "coordinator" | "admin" | "guest";
  userRole?: UserRole;
  xp: number;
  level: number;
  canPost: boolean;
  xpNeeded: number;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  errorCode?: string;
  data?: T;
}

/**
 * Checks if the current user has Level 5+ or is an NGO/Admin.
 */
export async function getUserForumEligibility(): Promise<UserEligibilityResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        isAuthenticated: false,
        role: "guest",
        xp: 0,
        level: 1,
        canPost: false,
        xpNeeded: 1000,
      };
    }

    const userRole = await getUserRole(user.id, user.email);
    const isStaff = userRole === "admin" || userRole === "moderator" || userRole === "support";

    if (userRole === "admin") {
      return {
        isAuthenticated: true,
        userId: user.id,
        role: "admin",
        userRole: "admin",
        xp: 99999,
        level: 99,
        canPost: true,
        xpNeeded: 0,
      };
    }

    // Check if user is an NGO organization
    const { data: orgData } = await supabase
      .from("users_org")
      .select("id, org_name")
      .eq("id", user.id)
      .maybeSingle();

    if (orgData) {
      return {
        isAuthenticated: true,
        userId: user.id,
        role: "coordinator",
        userRole,
        xp: 2500,
        level: 10,
        canPost: true,
        xpNeeded: 0,
      };
    }

    // Check youth volunteer profile and XP
    const { data: youthData } = await supabase
      .from("users_youth")
      .select("xp")
      .eq("id", user.id)
      .maybeSingle();

    const xp = typeof youthData?.xp === "number" ? youthData.xp : 0;
    const level = calculateLevelFromXp(xp);
    const canPost = isStaff || xp >= 1000;
    const xpNeeded = isStaff ? 0 : Math.max(0, 1000 - xp);

    return {
      isAuthenticated: true,
      userId: user.id,
      role: "volunteer",
      userRole,
      xp,
      level,
      canPost,
      xpNeeded,
    };
  } catch (error) {
    console.error("getUserForumEligibility error:", error);
    return {
      isAuthenticated: false,
      role: "guest",
      xp: 0,
      level: 1,
      canPost: false,
      xpNeeded: 1000,
    };
  }
}

/**
 * Fetch all categories with computed thread counts
 */
export async function getGlobalCategories(): Promise<ActionResult<GlobalCategoryItem[]>> {
  try {
    const supabase = await createClient();
    const { data: categories, error } = await supabase
      .from("global_forum_categories")
      .select("id, slug, name, description, icon, display_order")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return { success: false, error: error.message };
    }

    // Count threads per category efficiently using HEAD requests (zero body transfer, zero memory leak)
    const enrichedCategories: GlobalCategoryItem[] = await Promise.all(
      (categories || []).map(async (cat) => {
        const { count } = await supabase
          .from("global_forum_threads")
          .select("*", { count: "exact", head: true })
          .or(`category_id.eq.${cat.id},category_id.eq.${cat.slug}`);

        return {
          ...cat,
          thread_count: count ?? 0,
        };
      })
    );

    return { success: true, data: enrichedCategories };
  } catch (error) {
    console.error("getGlobalCategories error:", error);
    return { success: false, error: "Failed to retrieve forum categories." };
  }
}

/**
 * Fetch threads for a specific category with strictly 50-item pagination
 */
export async function getCategoryThreads(
  categorySlugOrId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResult<GlobalThreadItem[]> & { pagination?: ThreadsPaginationMetadata }> {
  try {
    if (!categorySlugOrId) {
      return { success: false, error: "Category identifier is required." };
    }

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const supabase = await createClient();

    // Check if passed string is a UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categorySlugOrId
    );

    let categoryId = categorySlugOrId;
    let categorySlug = categorySlugOrId;

    if (!isUuid) {
      const { data: category } = await supabase
        .from("global_forum_categories")
        .select("id, slug")
        .or(`slug.eq.${categorySlugOrId},slug.eq.${categorySlugOrId.replace("coordination", "discussions")},slug.eq.${categorySlugOrId.replace("discussions", "coordination")}`)
        .maybeSingle();

      if (category) {
        categoryId = category.id;
        categorySlug = category.slug;
      }
    } else {
      const { data: category } = await supabase
        .from("global_forum_categories")
        .select("id, slug")
        .eq("id", categorySlugOrId)
        .maybeSingle();

      if (category) {
        categorySlug = category.slug;
      }
    }

    let query = supabase
      .from("global_forum_threads")
      .select(
        "id, category_id, user_id, author_name, author_role, author_avatar, title, content, views, reply_count, is_pinned, is_locked, last_activity_at, created_at",
        { count: "exact" }
      );

    if (categoryId && categorySlug && categoryId !== categorySlug) {
      query = query.or(`category_id.eq.${categoryId},category_id.eq.${categorySlug}`);
    } else {
      query = query.eq("category_id", categoryId);
    }

    const { data: threads, count, error: threadsError } = await query
      .order("is_pinned", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .range(offset, offset + safePageSize - 1);

    if (threadsError) {
      console.error("Error fetching category threads:", threadsError);
      return { success: false, error: sanitizeErrorMessage(threadsError) };
    }

    const totalCount = count ?? (threads?.length || 0);
    const totalPages = Math.ceil(totalCount / safePageSize) || 1;

    return {
      success: true,
      data: (threads as GlobalThreadItem[]) || [],
      pagination: {
        totalCount,
        page: safePage,
        pageSize: safePageSize,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    };
  } catch (error) {
    console.error("getCategoryThreads error:", error);
    return { success: false, error: sanitizeErrorMessage(error) };
  }
}

/**
 * Fetch thread details along with all its posts/replies.
 * Increments view count safely.
 */
export async function getThreadDetails(
  threadId: string
): Promise<ActionResult<{ thread: GlobalThreadItem; posts: GlobalPostItem[] }>> {
  try {
    if (!threadId) {
      return { success: false, error: "Thread ID is required." };
    }

    const supabase = await createClient();

    // Fetch thread
    const { data: thread, error: threadError } = await supabase
      .from("global_forum_threads")
      .select(
        "id, category_id, user_id, author_name, author_role, author_avatar, title, content, views, reply_count, is_pinned, is_locked, last_activity_at, created_at"
      )
      .eq("id", threadId)
      .maybeSingle();

    if (threadError || !thread) {
      return { success: false, error: "Thread not found or was removed." };
    }

    // Increment views asynchronously
    void supabase
      .from("global_forum_threads")
      .update({ views: (thread.views || 0) + 1 })
      .eq("id", threadId);

    // Fetch posts
    const { data: posts, error: postsError } = await supabase
      .from("global_forum_posts")
      .select(
        "id, thread_id, user_id, author_name, author_role, author_avatar, content, created_at"
      )
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      return { success: false, error: postsError.message };
    }

    // Enrich author_user_role for thread and posts
    const allUserIds = Array.from(
      new Set([thread.user_id, ...((posts as GlobalPostItem[]) || []).map((p) => p.user_id)].filter(Boolean))
    );
    const roleMap = new Map<string, UserRole>();

    if (allUserIds.length > 0) {
      const { data: youths } = await supabase
        .from("users_youth")
        .select("id, role")
        .in("id", allUserIds);

      if (youths) {
        youths.forEach((y) => {
          if (y.role === "root" || y.role === "admin") {
            roleMap.set(y.id, "admin");
          } else if (y.role && ["moderator", "support", "user"].includes(y.role)) {
            roleMap.set(y.id, y.role as UserRole);
          }
        });
      }
    }

    const enrichedThread: GlobalThreadItem = {
      ...thread,
      author_user_role: roleMap.get(thread.user_id) || (thread.author_role === "admin" ? "admin" : "user"),
    };

    const enrichedPosts: GlobalPostItem[] = ((posts as GlobalPostItem[]) || []).map((p) => ({
      ...p,
      author_user_role: roleMap.get(p.user_id) || (p.author_role === "admin" ? "admin" : "user"),
    }));

    return {
      success: true,
      data: {
        thread: enrichedThread,
        posts: enrichedPosts,
      },
    };
  } catch (error) {
    console.error("getThreadDetails error:", error);
    return { success: false, error: "Failed to retrieve thread details." };
  }
}

/**
 * Create a new global forum thread.
 * Strict Gating: Requires Level 5+ (XP >= 1000) or NGO/Admin.
 * Auto-Moderation: Blocks toxic words, spam links, or excessive symbols.
 */
export async function createGlobalThreadAction(
  categoryId: string,
  title: string,
  content: string
): Promise<ActionResult<GlobalThreadItem>> {
  try {
    // 1. Zod double-layer schema validation
    const parsed = GlobalThreadSchema.safeParse({ categoryId, title, content });
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid thread parameters.";
      return { success: false, error: issue };
    }

    // 2. Strip dangerous HTML/scripts
    const cleanTitle = stripDangerousHtml(parsed.data.title, 150);
    const cleanContent = stripDangerousHtml(parsed.data.content, 8000);

    if (cleanTitle.length < 5) {
      return { success: false, error: "Thread title must be at least 5 characters long after sanitization." };
    }

    // 3. CHECK ELIGIBILITY & USER AUTHENTICATION
    const eligibility = await getUserForumEligibility();
    if (!eligibility.isAuthenticated || !eligibility.userId) {
      return {
        success: false,
        errorCode: "UNAUTHORIZED",
        error: "You must be signed in to create a thread.",
      };
    }

    // Rate Limiting Gate (Sliding Window by User ID)
    const rateCheck = await checkRateLimit(eligibility.userId, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return {
        success: false,
        error: rateCheck.error || "Rate limit exceeded. Please wait before creating another thread.",
        errorCode: "RATE_LIMITED",
      };
    }

    // VERIFY MID-SESSION ACTIVE STATUS (Bans, Mutes, Suspensions)
    const statusCheck = await verifyMidSessionActiveStatus(eligibility.userId);
    if (!statusCheck.allowed) {
      return {
        success: false,
        errorCode: statusCheck.errorCode || "ACCOUNT_RESTRICTED",
        error: statusCheck.error || "You are temporarily restricted from posting.",
      };
    }

    if (!eligibility.canPost) {
      return {
        success: false,
        errorCode: "LEVEL_5_REQUIRED",
        error: `Reach Level 5 (1,000 XP) to create threads. You currently have ${eligibility.xp} XP (${eligibility.xpNeeded} XP needed).`,
      };
    }

    // 4. AUTO-MODERATION ENGINE CHECK
    const titleCheck = autoModerateContent(cleanTitle);
    if (!titleCheck.allowed) {
      await logToQuarantine({
        targetUserId: eligibility.userId,
        reason: "quarantine_automod",
        flaggedContent: `[Topic Title Blocked: ${titleCheck.errorCode}]: ${cleanTitle}`,
        contextTitle: "Community Hub Topic Creation",
        reportedByUserId: eligibility.userId,
      });

      return {
        success: false,
        errorCode: "MODERATION_BLOCKED",
        error: `Title rejected: ${titleCheck.reason || "Violates community guidelines."}`,
      };
    }

    const contentCheck = autoModerateContent(cleanContent);
    if (!contentCheck.allowed) {
      await logToQuarantine({
        targetUserId: eligibility.userId,
        reason: "quarantine_automod",
        flaggedContent: `[Topic Content Blocked: ${contentCheck.errorCode}]: ${cleanContent}`,
        contextTitle: cleanTitle,
        reportedByUserId: eligibility.userId,
      });

      return {
        success: false,
        errorCode: "MODERATION_BLOCKED",
        error: `Content rejected: ${contentCheck.reason || "Violates community guidelines."}`,
      };
    }

    const supabase = await createClient();

    // 3. RESOLVE AUTHOR METADATA
    let authorName = "European Volunteer";
    let authorAvatar: string | null = null;
    const authorRole: "volunteer" | "coordinator" | "admin" =
      eligibility.role === "admin"
        ? "admin"
        : eligibility.role === "coordinator"
        ? "coordinator"
        : "volunteer";

    if (eligibility.role === "admin") {
      authorName = "EuroNova Commander";
    } else if (eligibility.role === "coordinator") {
      const { data: orgProfile } = await supabase
        .from("users_org")
        .select("org_name, avatar_url")
        .eq("id", eligibility.userId)
        .maybeSingle();

      if (orgProfile?.org_name) {
        authorName = orgProfile.org_name;
        authorAvatar = orgProfile.avatar_url || null;
      }
    } else {
      const { data: youthProfile } = await supabase
        .from("users_youth")
        .select("full_name, avatar_url")
        .eq("id", eligibility.userId)
        .maybeSingle();

      if (youthProfile?.full_name?.trim()) {
        authorName = youthProfile.full_name.trim();
        authorAvatar = youthProfile.avatar_url || null;
      }
    }

    // 3.5. RESOLVE TARGET CATEGORY (UUID vs Slug handling)
    let resolvedCategoryId = categoryId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);

    if (isUuid) {
      const { data: cat } = await supabase
        .from("global_forum_categories")
        .select("id, slug")
        .eq("id", categoryId)
        .maybeSingle();

      if (cat) {
        resolvedCategoryId = cat.id;
      }
    } else {
      // Look up category by slug
      let { data: cat } = await supabase
        .from("global_forum_categories")
        .select("id, slug")
        .or(`slug.eq.${categoryId},slug.eq.${categoryId.replace("coordination", "discussions")},slug.eq.${categoryId.replace("discussions", "coordination")}`)
        .maybeSingle();

      if (!cat) {
        // Auto-seed category if defined in static GLOBAL_CATEGORIES
        const foundDef = GLOBAL_CATEGORIES.find(
          (c) => c.id === categoryId || c.id === categoryId.replace("discussions", "coordination")
        );
        if (foundDef) {
          const { data: insertedCat } = await supabase
            .from("global_forum_categories")
            .insert({
              slug: foundDef.id,
              name: foundDef.title,
              description: foundDef.description,
              icon: foundDef.icon,
              display_order: 6,
            })
            .select("id, slug")
            .single();

          if (insertedCat) {
            cat = insertedCat;
          }
        }
      }

      if (cat) {
        resolvedCategoryId = cat.id;
      }
    }

    // 4. INSERT THREAD
    const { data: newThread, error: insertError } = await supabase
      .from("global_forum_threads")
      .insert({
        category_id: resolvedCategoryId,
        user_id: eligibility.userId,
        author_name: authorName,
        author_role: authorRole,
        author_avatar: authorAvatar,
        title: cleanTitle,
        content: cleanContent,
        views: 0,
        reply_count: 0,
        is_pinned: false,
        is_locked: false,
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert thread error:", insertError);
      return { success: false, error: insertError.message };
    }

    revalidatePath("/community");

    return {
      success: true,
      data: newThread as GlobalThreadItem,
    };
  } catch (error) {
    console.error("createGlobalThreadAction error:", error);
    return { success: false, error: "An unexpected error occurred while publishing thread." };
  }
}

/**
 * Post a reply to an existing global forum thread.
 * Strict Gating: Requires Level 5+ (XP >= 1000) or NGO/Admin.
 * Auto-Moderation: Blocks toxic words, spam links, or excessive symbols.
 */
export async function replyGlobalThreadAction(
  threadId: string,
  content: string
): Promise<ActionResult<GlobalPostItem>> {
  try {
    // 1. Zod double-layer schema validation
    const parsed = GlobalPostSchema.safeParse({ threadId, content });
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid reply parameters.";
      return { success: false, error: issue };
    }

    // 2. Strip dangerous HTML/scripts
    const cleanContent = stripDangerousHtml(parsed.data.content, 5000);
    if (!cleanContent) {
      return { success: false, error: "Reply content cannot be empty after sanitization." };
    }

    // 3. CHECK ELIGIBILITY & USER AUTHENTICATION
    const eligibility = await getUserForumEligibility();
    if (!eligibility.isAuthenticated || !eligibility.userId) {
      return {
        success: false,
        errorCode: "UNAUTHORIZED",
        error: "You must be signed in to reply.",
      };
    }

    // Rate Limiting Gate (Sliding Window by User ID)
    const rateCheck = await checkRateLimit(eligibility.userId, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return {
        success: false,
        error: rateCheck.error || "Rate limit exceeded. Please wait before posting another reply.",
        errorCode: "RATE_LIMITED",
      };
    }

    // VERIFY MID-SESSION ACTIVE STATUS (Bans, Mutes, Suspensions)
    const statusCheck = await verifyMidSessionActiveStatus(eligibility.userId);
    if (!statusCheck.allowed) {
      return {
        success: false,
        errorCode: statusCheck.errorCode || "ACCOUNT_RESTRICTED",
        error: statusCheck.error || "You are temporarily restricted from posting.",
      };
    }

    if (!eligibility.canPost) {
      return {
        success: false,
        errorCode: "LEVEL_5_REQUIRED",
        error: `Reach Level 5 (1,000 XP) to reply to discussions. You currently have ${eligibility.xp} XP.`,
      };
    }

    // 4. AUTO-MODERATION ENGINE CHECK
    const contentCheck = autoModerateContent(cleanContent);
    if (!contentCheck.allowed) {
      await logToQuarantine({
        targetUserId: eligibility.userId,
        reason: "quarantine_automod",
        flaggedContent: `[Community Reply Blocked: ${contentCheck.errorCode}]: ${cleanContent}`,
        contextTitle: `Discussion Thread ${threadId}`,
        reportedByUserId: eligibility.userId,
      });

      return {
        success: false,
        errorCode: "MODERATION_BLOCKED",
        error: contentCheck.reason || "Content rejected by auto-moderation.",
      };
    }

    const supabase = await createClient();

    // 3. CHECK IF THREAD IS LOCKED
    const { data: thread } = await supabase
      .from("global_forum_threads")
      .select("id, is_locked, reply_count")
      .eq("id", threadId)
      .maybeSingle();

    if (!thread) {
      return { success: false, error: "Thread not found." };
    }

    if (thread.is_locked) {
      return { success: false, error: "This discussion thread has been locked by moderators." };
    }

    // 4. RESOLVE AUTHOR METADATA
    let authorName = "European Volunteer";
    let authorAvatar: string | null = null;
    const authorRole: "volunteer" | "coordinator" | "admin" =
      eligibility.role === "admin"
        ? "admin"
        : eligibility.role === "coordinator"
        ? "coordinator"
        : "volunteer";

    if (eligibility.role === "admin") {
      authorName = "EuroNova Commander";
    } else if (eligibility.role === "coordinator") {
      const { data: orgProfile } = await supabase
        .from("users_org")
        .select("org_name, avatar_url")
        .eq("id", eligibility.userId)
        .maybeSingle();

      if (orgProfile?.org_name) {
        authorName = orgProfile.org_name;
        authorAvatar = orgProfile.avatar_url || null;
      }
    } else {
      const { data: youthProfile } = await supabase
        .from("users_youth")
        .select("full_name, avatar_url")
        .eq("id", eligibility.userId)
        .maybeSingle();

      if (youthProfile?.full_name?.trim()) {
        authorName = youthProfile.full_name.trim();
        authorAvatar = youthProfile.avatar_url || null;
      }
    }

    // 5. INSERT POST & UPDATE THREAD
    const { data: newPost, error: insertError } = await supabase
      .from("global_forum_posts")
      .insert({
        thread_id: threadId,
        user_id: eligibility.userId,
        author_name: authorName,
        author_role: authorRole,
        author_avatar: authorAvatar,
        content: cleanContent,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert post error:", insertError);
      return { success: false, error: insertError.message };
    }

    // Update parent thread reply_count and last_activity_at
    await supabase
      .from("global_forum_threads")
      .update({
        reply_count: (thread.reply_count || 0) + 1,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    // Award XP and Trust Score boost for answering community threads (anti-farming protected by targetId)
    if (newPost && (newPost as GlobalPostItem).id) {
      try {
        const [{ awardUserXp }, { XP_CONFIG }] = await Promise.all([
          import("@/actions/gamification"),
          import("@/lib/gamification"),
        ]);
        await awardUserXp({
          amount: XP_CONFIG.FORUM_ANSWER.amount,
          reason: XP_CONFIG.FORUM_ANSWER.reason,
          actionType: XP_CONFIG.FORUM_ANSWER.actionType,
          targetId: `global_reply_${(newPost as GlobalPostItem).id}`,
          trustBoost: XP_CONFIG.FORUM_ANSWER.trustBoost,
        });
      } catch (xpErr) {
        console.error("Could not award XP for global thread reply:", xpErr);
      }
    }

    revalidatePath("/community");

    return {
      success: true,
      data: newPost as GlobalPostItem,
    };
  } catch (error) {
    console.error("replyGlobalThreadAction error:", error);
    return { success: false, error: "An unexpected error occurred while posting your reply." };
  }
}

/**
 * Service role client for privileged updates & admin deletes
 */
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClientWithKey(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Edit an existing global forum thread.
 * Strict Gating: Only the author can edit their own thread.
 * Auto-Moderation: Validates new content and new title.
 */
export async function editGlobalThreadAction(
  threadId: string,
  newContent: string,
  newTitle?: string
): Promise<ActionResult<GlobalThreadItem>> {
  try {
    if (!threadId || !newContent?.trim()) {
      return { success: false, error: "Thread ID and content are required." };
    }

    const cleanContent = newContent.trim();
    const cleanTitle = newTitle?.trim();

    // 1. Auto-Moderation Check on Content
    const contentCheck = autoModerateContent(cleanContent);
    if (!contentCheck.allowed) {
      return {
        success: false,
        errorCode: "MODERATION_BLOCKED",
        error: contentCheck.reason || "Content violates community moderation rules.",
      };
    }

    // Auto-Moderation Check on Title (if provided)
    if (cleanTitle) {
      if (cleanTitle.length < 5) {
        return { success: false, error: "Title must be at least 5 characters long." };
      }
      const titleCheck = autoModerateContent(cleanTitle);
      if (!titleCheck.allowed) {
        return {
          success: false,
          errorCode: "MODERATION_BLOCKED",
          error: titleCheck.reason || "Title violates community moderation rules.",
        };
      }
    }

    // 2. Auth & Ownership Verification
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        errorCode: "UNAUTHORIZED",
        error: "You must be signed in to edit discussions.",
      };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("global_forum_threads")
      .select("id, user_id, title, content")
      .eq("id", threadId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Discussion topic not found." };
    }

    if (existing.user_id !== user.id) {
      return {
        success: false,
        errorCode: "FORBIDDEN",
        error: "You can only edit your own discussion topics.",
      };
    }

    // 3. Update Thread
    const updatePayload: Record<string, unknown> = {
      content: cleanContent,
    };
    if (cleanTitle) {
      updatePayload.title = cleanTitle;
    }

    const db = getServiceRoleClient() || supabase;
    const { data: updated, error: updateError } = await db
      .from("global_forum_threads")
      .update(updatePayload)
      .eq("id", threadId)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("Failed to update global thread:", updateError);
      return { success: false, error: updateError?.message || "Failed to update discussion." };
    }

    revalidatePath("/community");

    return {
      success: true,
      data: updated as GlobalThreadItem,
    };
  } catch (error) {
    console.error("editGlobalThreadAction error:", error);
    return { success: false, error: "An unexpected error occurred while editing the discussion." };
  }
}

/**
 * Delete a global forum thread.
 * Strict Gating: Only the author or an admin can delete.
 */
export async function deleteGlobalThreadAction(
  threadId: string
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    if (!threadId) {
      return { success: false, error: "Thread ID is required." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        errorCode: "UNAUTHORIZED",
        error: "You must be signed in to delete discussions.",
      };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("global_forum_threads")
      .select("id, user_id")
      .eq("id", threadId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Discussion topic not found." };
    }

    const userRole = await getUserRole(user.id, user.email);
    const isAdmin =
      userRole === "admin" ||
      userRole === "root" ||
      user.email === "euronovaofficial@gmail.com";
    const isAuthor = existing.user_id === user.id;

    if (!isAdmin && !isAuthor) {
      return {
        success: false,
        errorCode: "FORBIDDEN",
        error: "You are not authorized to delete this discussion topic.",
      };
    }

    const db = getServiceRoleClient() || supabase;

    // Delete child posts first, then the thread
    await db.from("global_forum_posts").delete().eq("thread_id", threadId);
    const { error: deleteError } = await db.from("global_forum_threads").delete().eq("id", threadId);

    if (deleteError) {
      console.error("Failed to delete global thread:", deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/community");

    return {
      success: true,
      data: { deletedId: threadId },
    };
  } catch (error) {
    console.error("deleteGlobalThreadAction error:", error);
    return { success: false, error: "An unexpected error occurred while deleting the discussion." };
  }
}

/**
 * Edit an existing post/reply in a global thread.
 * Strict Gating: Only the author can edit their reply.
 * Auto-Moderation: Validates new content.
 */
export async function editGlobalPostAction(
  postId: string,
  newContent: string
): Promise<ActionResult<GlobalPostItem>> {
  try {
    if (!postId || !newContent?.trim()) {
      return { success: false, error: "Post ID and content are required." };
    }

    const cleanContent = newContent.trim();

    // 1. Auto-Moderation Check
    const contentCheck = autoModerateContent(cleanContent);
    if (!contentCheck.allowed) {
      return {
        success: false,
        errorCode: "MODERATION_BLOCKED",
        error: contentCheck.reason || "Content violates community moderation rules.",
      };
    }

    // 2. Auth & Ownership Verification
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        errorCode: "UNAUTHORIZED",
        error: "You must be signed in to edit replies.",
      };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("global_forum_posts")
      .select("id, user_id, thread_id")
      .eq("id", postId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Reply not found." };
    }

    if (existing.user_id !== user.id) {
      return {
        success: false,
        errorCode: "FORBIDDEN",
        error: "You can only edit your own replies.",
      };
    }

    const db = getServiceRoleClient() || supabase;
    const { data: updated, error: updateError } = await db
      .from("global_forum_posts")
      .update({ content: cleanContent })
      .eq("id", postId)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("Failed to update global post:", updateError);
      return { success: false, error: updateError?.message || "Failed to update reply." };
    }

    revalidatePath("/community");

    return {
      success: true,
      data: updated as GlobalPostItem,
    };
  } catch (error) {
    console.error("editGlobalPostAction error:", error);
    return { success: false, error: "An unexpected error occurred while editing the reply." };
  }
}

/**
 * Delete a post/reply in a global thread.
 * Strict Gating: Post Author, Thread Creator, or EuroNova Admin.
 * When deleted by Thread Creator or Admin as suspicious, logged into Quarantine tray.
 */
export async function deleteGlobalPostAction(
  postId: string,
  isSuspicious = false
): Promise<ActionResult<{ deletedId: string; threadId: string }>> {
  try {
    if (!postId) {
      return { success: false, error: "Post ID is required." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        errorCode: "UNAUTHORIZED",
        error: "You must be signed in to delete replies.",
      };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("global_forum_posts")
      .select("id, user_id, thread_id, author_name, content")
      .eq("id", postId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Reply not found." };
    }

    // Fetch parent thread to verify if caller is the thread creator
    const [{ data: thread }, userRole] = await Promise.all([
      supabase
        .from("global_forum_threads")
        .select("id, user_id, title, reply_count")
        .eq("id", existing.thread_id)
        .maybeSingle(),
      getUserRole(user.id, user.email),
    ]);
    const isAuthor = existing.user_id === user.id;
    const isThreadCreator = Boolean(thread && thread.user_id === user.id);
    const isAdmin =
      userRole === "admin" ||
      userRole === "root" ||
      user.email === "euronovaofficial@gmail.com";
    const canModerate = isAdmin || userRole === "moderator";

    if (!isAuthor && !isThreadCreator && !canModerate) {
      return {
        success: false,
        errorCode: "FORBIDDEN",
        error: userRole === "support"
          ? "Support staff cannot delete replies. Only Moderators, Admins, or Thread Creators have deletion authority."
          : "You are not authorized to delete this reply.",
      };
    }

    const db = getServiceRoleClient() || supabase;
    const { error: deleteError } = await db.from("global_forum_posts").delete().eq("id", postId);

    if (deleteError) {
      console.error("Failed to delete global post:", deleteError);
      return { success: false, error: deleteError.message };
    }

    // If deleted by thread creator or admin (and not author's self delete), log to Quarantine tray
    if ((isSuspicious || !isAuthor) && (isAdmin || isThreadCreator)) {
      await logToQuarantine({
        targetUserId: existing.user_id,
        targetName: existing.author_name,
        reason: "quarantine_creator_deleted",
        flaggedContent: existing.content,
        contextTitle: thread?.title || "Community Discussion",
        reportedByUserId: user.id,
      });
    }

    // Decrement thread reply_count
    if (thread) {
      await db
        .from("global_forum_threads")
        .update({ reply_count: Math.max(0, (thread.reply_count || 1) - 1) })
        .eq("id", existing.thread_id);
    }

    revalidatePath("/community");

    return {
      success: true,
      data: { deletedId: postId, threadId: existing.thread_id },
    };
  } catch (error) {
    console.error("deleteGlobalPostAction error:", error);
    return { success: false, error: "An unexpected error occurred while deleting the reply." };
  }
}

/**
 * Warns a user regarding their reply in a Community Hub thread.
 * Strictly gated: Thread Creator or EuroNova Admin.
 */
export async function warnGlobalPostUser(
  postId: string,
  threadId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const [{ data: thread }, userRole] = await Promise.all([
      supabase
        .from("global_forum_threads")
        .select("id, user_id, title")
        .eq("id", threadId)
        .maybeSingle(),
      getUserRole(user.id, user.email),
    ]);
    const isThreadCreator = Boolean(thread && thread.user_id === user.id);
    const canModerate = userRole === "admin" || userRole === "moderator";

    if (!canModerate && !isThreadCreator) {
      return {
        success: false,
        error: userRole === "support"
          ? "Support staff cannot issue warnings. Only Moderators, Admins, or Thread Creators have disciplinary authority."
          : "Only the thread creator, moderators, or EuroNova Admins can warn users.",
      };
    }

    const { data: post } = await supabase
      .from("global_forum_posts")
      .select("id, user_id, content")
      .eq("id", postId)
      .maybeSingle();

    if (!post) {
      return { success: false, error: "Reply not found." };
    }

    return await warnUser({
      targetUserId: post.user_id,
      contextTitle: thread?.title || "Community Hub",
      warnedByUserId: user.id,
    });
  } catch (err) {
    console.error("warnGlobalPostUser error:", err);
    return { success: false, error: "Failed to issue warning." };
  }
}

/**
 * Mutes a user regarding their reply in a Community Hub thread (5m, 10m, 15m, 1h).
 * Strictly gated: Thread Creator or EuroNova Admin.
 */
export async function muteGlobalPostUser(
  postId: string,
  durationMinutes: MuteDuration,
  threadId: string,
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

    const [{ data: thread }, userRole] = await Promise.all([
      supabase
        .from("global_forum_threads")
        .select("id, user_id, title")
        .eq("id", threadId)
        .maybeSingle(),
      getUserRole(user.id, user.email),
    ]);
    const isThreadCreator = Boolean(thread && thread.user_id === user.id);
    const canModerate = userRole === "admin" || userRole === "moderator";

    if (!canModerate && !isThreadCreator) {
      return {
        success: false,
        error: userRole === "support"
          ? "Support staff cannot mute users. Only Moderators, Admins, or Thread Creators have disciplinary authority."
          : "Only the thread creator, moderators, or EuroNova Admins can mute users.",
      };
    }

    const { data: post } = await supabase
      .from("global_forum_posts")
      .select("id, user_id, content")
      .eq("id", postId)
      .maybeSingle();

    if (!post) {
      return { success: false, error: "Reply not found." };
    }

    return await muteUser({
      targetUserId: post.user_id,
      durationMinutes,
      reason: reason || "Suspicious reply in community discussion",
      contextTitle: thread?.title || "Community Hub",
      mutedByUserId: user.id,
    });
  } catch (err) {
    console.error("muteGlobalPostUser error:", err);
    return { success: false, error: "Failed to mute user." };
  }
}
