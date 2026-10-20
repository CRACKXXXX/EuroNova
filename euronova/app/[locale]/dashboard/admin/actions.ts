"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendEmailAction } from "@/actions/sendEmail";

import { getUserRole, type UserRole } from "@/lib/roles";

const ADMIN_EMAIL = "euronovaofficial@gmail.com";

export type AdminActionResult = {
  success?: boolean;
  error?: string;
};

/**
 * Creates an admin client with service_role key to completely bypass Row Level Security (RLS)
 * for administrative write and delete mutations.
 */
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL environment variables. Please check your .env.local file."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Verifies that the current session belongs strictly to an authorized system administrator.
 * Only 'admin' role can access full God Mode and role assignments.
 */
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, isAuthorized: false, user: null, role: "user" as UserRole };
  }

  const role = await getUserRole(user.id, user.email);
  return { supabase, isAuthorized: role === "admin", user, role };
}

/**
 * Verifies that the current session belongs to a Moderator or Administrator.
 * Can resolve reports, delete comments, warn/mute/ban users.
 * Support staff is strictly blocked.
 */
async function verifyModeratorOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, isAuthorized: false, user: null, role: "user" as UserRole };
  }

  const role = await getUserRole(user.id, user.email);
  const isAuthorized = role === "admin" || role === "moderator";
  return { supabase, isAuthorized, user, role };
}

export async function approveOrganization(orgId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();
    const { error } = await adminDb
      .from("users_org")
      .update({ verification_status: "verified" })
      .eq("id", orgId);

    if (error) throw error;

    try {
      const { dispatchNotification } = await import("@/actions/notifications");
      await dispatchNotification({
        userId: orgId,
        type: "system",
        title: "Organization Verified",
        message: "Your organization credentials have been verified by administration. Full publishing capabilities unlocked.",
        actionUrl: `/dashboard/organizations/${orgId}`,
      });
    } catch {
      // Ignore notification error
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/organizations");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("approveOrganization failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to approve organization.",
    };
  }
}

export async function revokeOrganization(orgId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();
    const { error } = await adminDb
      .from("users_org")
      .update({ verification_status: "pending" })
      .eq("id", orgId);

    if (error) throw error;

    try {
      const { dispatchNotification } = await import("@/actions/notifications");
      await dispatchNotification({
        userId: orgId,
        type: "action_required",
        title: "Action Required: Complete Organization Dossier",
        message: "Your organization verification requires updated documentation. Please review and complete your dossier credentials.",
        actionUrl: `/dashboard/organizations/${orgId}`,
      });
    } catch {
      // Ignore notification error
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/organizations");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("revokeOrganization failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to revoke organization.",
    };
  }
}

export async function deleteOrganization(orgId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Explicit cascade cleanup for associated projects and reviews
    const { error: projError } = await adminDb.from("projects").delete().eq("org_id", orgId);
    if (projError) throw projError;

    const { error: revError } = await adminDb.from("reviews").delete().eq("org_id", orgId);
    if (revError) throw revError;

    // 2. Delete public table entity record
    const { error: orgError } = await adminDb.from("users_org").delete().eq("id", orgId);
    if (orgError) throw orgError;

    // 3. Delete underlying auth user to prevent ghost accounts in Supabase Auth
    const { error: authError } = await adminDb.auth.admin.deleteUser(orgId);
    if (authError) throw authError;

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/organizations");
    revalidatePath("/dashboard/projects");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteOrganization failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete organization.",
    };
  }
}

export async function deleteYouthUser(userId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Explicit cleanup for applications, reviews, and youth profile
    const { error: appError } = await adminDb.from("applications").delete().eq("youth_id", userId);
    if (appError) throw appError;

    const { error: revError } = await adminDb.from("reviews").delete().eq("youth_id", userId);
    if (revError) throw revError;

    // 2. Delete public youth profile record
    const { error: youthError } = await adminDb.from("users_youth").delete().eq("id", userId);
    if (youthError) throw youthError;

    // 3. Delete underlying auth user to prevent ghost accounts in Supabase Auth
    const { error: authError } = await adminDb.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    revalidatePath("/dashboard/admin");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteYouthUser failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete youth user.",
    };
  }
}

export async function publishProject(projectId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();
    const { error } = await adminDb
      .from("projects")
      .update({ status: "published" })
      .eq("id", projectId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/projects");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("publishProject failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to publish project.",
    };
  }
}

export async function deleteProject(projectId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Explicit cleanup for applications and reports associated with this project
    await adminDb.from("project_reports").delete().eq("project_id", projectId);
    const { error: appError } = await adminDb.from("applications").delete().eq("project_id", projectId);
    if (appError) throw appError;

    // 2. Delete project from database
    const { error } = await adminDb.from("projects").delete().eq("id", projectId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/projects");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteProject failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete project.",
    };
  }
}

/**
 * Report Moderation: Dismiss a report (marks as resolved)
 */
export async function dismissReport(reportId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyModeratorOrAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Moderator or Admin access required." };
    }

    const adminDb = getServiceRoleClient();
    const { error } = await adminDb
      .from("project_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) throw error;

    try {
      const { data: rep } = await adminDb
        .from("project_reports")
        .select("reporter_id")
        .eq("id", reportId)
        .maybeSingle();

      if (rep?.reporter_id) {
        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: rep.reporter_id,
          type: "moderation",
          title: "Report Resolved",
          message: "Your report regarding an Erasmus+ mission has been reviewed and resolved by orbital moderation.",
          actionUrl: "/dashboard/projects",
        });
      }
    } catch {
      // Ignore notification error
    }

    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (error: unknown) {
    console.error("dismissReport failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to dismiss report.",
    };
  }
}

/**
 * Report Moderation: Hide / Reject project and resolve the report
 */
export async function hideProject(projectId: string, reportId?: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Update project status to rejected
    const { error: projError } = await adminDb
      .from("projects")
      .update({ status: "rejected" })
      .eq("id", projectId);

    if (projError) throw projError;

    // 2. If associated report provided, mark resolved and track resolved_at
    if (reportId) {
      await adminDb
        .from("project_reports")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      try {
        const { data: rep } = await adminDb
          .from("project_reports")
          .select("reporter_id")
          .eq("id", reportId)
          .maybeSingle();

        if (rep?.reporter_id) {
          const { dispatchNotification } = await import("@/actions/notifications");
          await dispatchNotification({
            userId: rep.reporter_id,
            type: "moderation",
            title: "Report Resolved",
            message: "Your report regarding an Erasmus+ mission has been resolved. The reported mission has been withdrawn from public view.",
            actionUrl: "/dashboard/projects",
          });
        }
      } catch {
        // Ignore notification error
      }
    }

    // 3. Dispatch security notification email
    await sendEmailAction({
      to: ADMIN_EMAIL,
      subject: `🛡️ [Project Hidden] Project ${projectId} has been hidden/rejected`,
      body: `Project ${projectId} has been withdrawn from public view by orbital administration in response to a safety report.`,
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/projects");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("hideProject failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to hide project.",
    };
  }
}

/**
 * Report Moderation: Request changes on a reported project (marks as reviewed and moves project to pending_review)
 */
export async function requestChanges(projectId: string, reportId?: string, notes?: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Switch project status to pending_review
    const { error: projError } = await adminDb
      .from("projects")
      .update({ status: "pending_review" })
      .eq("id", projectId);

    if (projError) throw projError;

    // 2. Mark report status as reviewed
    if (reportId) {
      await adminDb
        .from("project_reports")
        .update({ status: "reviewed" })
        .eq("id", reportId);
    }

    // 3. Dispatch notification email scaffold
    await sendEmailAction({
      to: ADMIN_EMAIL,
      subject: `📋 [Changes Requested] Project ${projectId}`,
      body: `Modifications have been requested for project ${projectId}.\nNotes: ${notes || "Report investigation requires publisher revisions."}`,
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/projects");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("requestChanges failed:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to request changes.",
    };
  }
}

/**
 * Report Moderation: Reopen / Undo a resolved report (reverts status to pending)
 */
export async function reopenReport(reportId: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyModeratorOrAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Moderator or Admin access required." };
    }

    const adminDb = getServiceRoleClient();
    const { error } = await adminDb
      .from("project_reports")
      .update({
        status: "pending",
        resolved_at: null,
      })
      .eq("id", reportId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (error: unknown) {
    console.error("reopenReport failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to reopen report.",
    };
  }
}

/**
 * Moderation Action: Suspend an Organization and resolve associated report
 */
export async function suspendOrganization(orgId: string, reportId?: string): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Set organization verification status to rejected/suspended
    const { error: orgError } = await adminDb
      .from("users_org")
      .update({ verification_status: "rejected" })
      .eq("id", orgId);

    if (orgError) throw orgError;

    // 2. Mark report as resolved if reportId provided
    if (reportId) {
      await adminDb
        .from("project_reports")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      try {
        const { data: rep } = await adminDb
          .from("project_reports")
          .select("reporter_id")
          .eq("id", reportId)
          .maybeSingle();

        if (rep?.reporter_id) {
          const { dispatchNotification } = await import("@/actions/notifications");
          await dispatchNotification({
            userId: rep.reporter_id,
            type: "moderation",
            title: "Report Resolved",
            message: "Your report regarding an organization has been reviewed. The organization has been suspended pending compliance.",
            actionUrl: "/dashboard",
          });
        }
      } catch {
        // Ignore notification error
      }
    }

    // 3. Notify the organization
    try {
      const { dispatchNotification } = await import("@/actions/notifications");
      await dispatchNotification({
        userId: orgId,
        type: "action_required",
        title: "Account Suspended: Compliance Review Required",
        message: "Your organization account has been suspended following a compliance review. Please contact administration.",
        actionUrl: `/dashboard/organizations/${orgId}`,
      });
    } catch {
      // Ignore notification error
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/organizations");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("suspendOrganization failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to suspend organization.",
    };
  }
}

export interface AdminProjectEditPayload {
  title: string;
  description?: string | null;
  dest_country: string;
  project_type: string;
  duration_days?: number | null;
  official_url?: string | null;
  covers_rup_flights?: boolean;
  is_last_minute?: boolean;
}

/**
 * Admin God Mode: Edit any project (fix typos, dates, scraped info)
 */
export async function updateProjectByAdmin(
  projectId: string,
  data: AdminProjectEditPayload
): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    if (!projectId || !data.title || !data.dest_country) {
      return { error: "Title and destination country are required." };
    }

    const adminDb = getServiceRoleClient();
    const { error } = await adminDb
      .from("projects")
      .update({
        title: data.title.trim(),
        description: data.description ? data.description.trim() : "",
        dest_country: data.dest_country.trim().toUpperCase(),
        project_type: data.project_type,
        duration_days: data.duration_days ?? null,
        official_url: data.official_url ? data.official_url.trim() : null,
        covers_rup_flights: data.covers_rup_flights ?? false,
        is_last_minute: data.is_last_minute ?? false,
      })
      .eq("id", projectId);

    if (error) throw error;

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("updateProjectByAdmin failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update project.",
    };
  }
}

/**
 * Moderation Action: Delete reported comment or message and mark report as resolved
 */
export async function deleteReportedComment(
  reportId: string,
  commentId?: string,
  targetUserId?: string
): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyModeratorOrAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Moderator or Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Delete comment from forum tables if commentId provided
    if (commentId) {
      await adminDb.from("global_forum_posts").delete().eq("id", commentId);
      await adminDb.from("project_forum_messages").delete().eq("id", commentId);
    }

    // 2. Mark report as resolved
    const { error: repError } = await adminDb
      .from("project_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (repError) throw repError;

    // 3. Deduct 5 trust points from target user if youth (Auto-Mod / Comment Deletion: -5)
    if (targetUserId) {
      try {
        const { data: userYouth } = await adminDb
          .from("users_youth")
          .select("trust_score")
          .eq("id", targetUserId)
          .maybeSingle();

        if (userYouth && typeof userYouth.trust_score === "number") {
          await adminDb
            .from("users_youth")
            .update({ trust_score: Math.max(0, userYouth.trust_score - 5) })
            .eq("id", targetUserId);
        }
      } catch (err) {
        console.warn("Could not deduct trust score on comment removal:", err);
      }

      try {
        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: targetUserId,
          type: "moderation",
          title: "Comment Removed",
          message: "A comment or message you posted was reported and removed by moderation for violating community rules.",
          actionUrl: "/dashboard",
        });
      } catch {
        // Non-blocking notification dispatch
      }
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/community");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteReportedComment failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete comment.",
    };
  }
}

/**
 * Moderation Action: Delete reported comment, add a warning strike, and resolve report
 */
export async function deleteCommentAndWarnUser(
  reportId: string,
  commentId?: string,
  targetUserId?: string
): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyModeratorOrAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Moderator or Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Delete comment from forum tables if commentId provided
    if (commentId) {
      await adminDb.from("global_forum_posts").delete().eq("id", commentId);
      await adminDb.from("project_forum_messages").delete().eq("id", commentId);
    }

    // 2. Adjust target user trust_score / send formal warning notification
    if (targetUserId) {
      try {
        const { data: userYouth } = await adminDb
          .from("users_youth")
          .select("trust_score")
          .eq("id", targetUserId)
          .maybeSingle();

        if (userYouth) {
          const currentTrust = userYouth.trust_score ?? 50;
          await adminDb
            .from("users_youth")
            .update({ trust_score: Math.max(0, currentTrust - 15) })
            .eq("id", targetUserId);
        }

        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: targetUserId,
          type: "moderation",
          title: "Official Moderation Warning",
          message: "Your reported comment was deleted and a moderation strike was applied to your profile. Continued infractions will result in an account ban.",
          actionUrl: "/dashboard",
        });
      } catch (err) {
        console.warn("Could not record warning on target user:", err);
      }
    }

    // 3. Mark report as resolved
    const { error: repError } = await adminDb
      .from("project_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (repError) throw repError;

    revalidatePath("/dashboard/admin");
    revalidatePath("/community");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteCommentAndWarnUser failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to apply warning.",
    };
  }
}

/**
 * Moderation Action: Delete comment, ban target user account, and resolve report
 */
export async function deleteCommentAndBanUser(
  reportId: string,
  commentId?: string,
  targetUserId?: string
): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyModeratorOrAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Moderator or Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Delete comment from forum tables if commentId provided
    if (commentId) {
      await adminDb.from("global_forum_posts").delete().eq("id", commentId);
      await adminDb.from("project_forum_messages").delete().eq("id", commentId);
    }

    // 2. Permanently ban user account via Supabase Auth Admin API
    if (targetUserId) {
      try {
        // Suspend auth login access (100 years ban)
        await adminDb.auth.admin.updateUserById(targetUserId, {
          ban_duration: "876000h",
          user_metadata: { banned: true, banned_at: new Date().toISOString() },
        });

        // Set trust_score to 0 in youth profile
        await adminDb
          .from("users_youth")
          .update({ trust_score: 0 })
          .eq("id", targetUserId);

        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: targetUserId,
          type: "moderation",
          title: "Account Suspended",
          message: "Your account has been permanently suspended by administration for severe violations of European youth safety protocols.",
          actionUrl: "/dashboard",
        });
      } catch (err) {
        console.warn("Could not ban target user:", err);
      }
    }

    // 3. Mark report as resolved
    const { error: repError } = await adminDb
      .from("project_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (repError) throw repError;

    revalidatePath("/dashboard/admin");
    revalidatePath("/community");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteCommentAndBanUser failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to ban user account.",
    };
  }
}

/**
 * Staff & Role Management: Admin-only action to assign or change a user's system role.
 * Strictly verifies the executor is an 'admin'.
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<AdminActionResult> {
  try {
    const { isAuthorized, user } = await verifyAdmin();
    if (!isAuthorized || !user) {
      return { error: "Unauthorized: Admin clearance required to assign roles." };
    }

    if (!targetUserId || !newRole) {
      return { error: "Target user ID and new role are required." };
    }

    const validRoles: UserRole[] = ["admin", "moderator", "support", "user"];
    if (!validRoles.includes(newRole)) {
      return { error: "Invalid role specified." };
    }

    const adminDb = getServiceRoleClient();

    // Prevent modifying the root administrator
    const { data: targetAuthUser } = await adminDb.auth.admin.getUserById(targetUserId);
    if (targetAuthUser?.user?.email === ADMIN_EMAIL) {
      return { error: "Cannot modify root administrator credentials." };
    }

    // Update public profile entity in users_youth
    const { error: youthError } = await adminDb
      .from("users_youth")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (youthError) throw youthError;

    // Synchronize auth user_metadata for reliable token/session lookup
    await adminDb.auth.admin.updateUserById(targetUserId, {
      user_metadata: { role: newRole },
    });

    try {
      const { dispatchNotification } = await import("@/actions/notifications");
      await dispatchNotification({
        userId: targetUserId,
        type: "system",
        title: "Account Role Updated",
        message: `Your clearance level on EuroNova has been updated to: [${newRole.toUpperCase()}].`,
        actionUrl: "/dashboard",
      });
    } catch {
      // Non-blocking notification dispatch
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/community");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("updateUserRole failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update user role.",
    };
  }
}

export interface StaffSearchUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Searches users for the Staff & Roles management console.
 * Strictly verifies the executor is an 'admin'.
 */
export async function searchStaffUsers(query?: string): Promise<{
  users?: StaffSearchUser[];
  error?: string;
}> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin clearance required." };
    }

    const adminDb = getServiceRoleClient();
    const cleanQuery = query?.trim().toLowerCase() || "";

    let dbQuery = adminDb
      .from("users_youth")
      .select("id, full_name, email, role, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (cleanQuery) {
      dbQuery = dbQuery.or(
        `id.eq.${cleanQuery},full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`
      );
    }

    const { data, error } = await dbQuery.limit(50);
    if (error) throw error;

    const userList: StaffSearchUser[] = (data || []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: (u.role || "user") as UserRole,
      avatar_url: u.avatar_url,
      created_at: u.created_at,
    }));

    const missingEmailIds = userList.filter((u) => !u.email).map((u) => u.id);
    if (missingEmailIds.length > 0) {
      const { data: emailsData } = await adminDb.rpc("get_admin_user_emails", {
        user_ids: missingEmailIds,
      });
      if (Array.isArray(emailsData)) {
        const emailMap = new Map(
          emailsData.map((e: { user_id: string; email: string }) => [e.user_id, e.email])
        );
        userList.forEach((u) => {
          if (!u.email && emailMap.has(u.id)) {
            u.email = emailMap.get(u.id) || null;
          }
        });
      }
    }

    return { users: userList };
  } catch (err: unknown) {
    console.error("searchStaffUsers error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to search staff users.",
    };
  }
}


