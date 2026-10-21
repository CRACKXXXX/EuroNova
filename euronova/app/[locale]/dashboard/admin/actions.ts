"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { sendEmailAction } from "@/actions/sendEmail";

import { getUserRole, type UserRole } from "@/lib/roles";
import { sendEscalationAlert } from "@/lib/externalAlerts";

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
 * Verifies that the current session belongs strictly to an authorized system administrator (admin or root).
 * Full God Mode, destructive deletions, and role assignments.
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
  const isAuthorized = role === "admin" || role === "root";
  return { supabase, isAuthorized, user, role };
}

/**
 * Verifies that the current session belongs to a Moderator, Administrator, or Root.
 * Can resolve reports, delete comments, warn/mute users.
 * Destructive actions (deleting accounts, orgs, surveys) strictly blocked for moderators.
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
  const isAuthorized = role === "root" || role === "admin" || role === "moderator";
  return { supabase, isAuthorized, user, role };
}

/**
 * Verifies that the current session belongs to any valid staff role (root, admin, moderator, support).
 */
async function verifyStaff() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, isAuthorized: false, user: null, role: "user" as UserRole };
  }

  const role = await getUserRole(user.id, user.email);
  const isAuthorized =
    role === "root" || role === "admin" || role === "moderator" || role === "support";
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
        resolution_action: "Dismissed without penalty (False report or non-violation)",
        updated_at: new Date().toISOString(),
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
          resolution_action: "Withdrew / Hidden Project from Public View",
          updated_at: new Date().toISOString(),
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
          resolution_action: "Suspended Organization Account & Revoked Publishing",
          updated_at: new Date().toISOString(),
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
        resolution_action: "Deleted Reported Comment (-5 Trust Score)",
        updated_at: new Date().toISOString(),
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
        resolution_action: "Deleted Comment & Issued Disciplinary Strike (-15 Trust Score)",
        updated_at: new Date().toISOString(),
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
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Banning user accounts strictly requires Admin or Root clearance. Moderators must escalate to admin." };
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
        resolution_action: "Permanently Banned User Account & Removed Content",
        updated_at: new Date().toISOString(),
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

    const validRoles: UserRole[] = ["root", "admin", "moderator", "support", "user"];
    if (!validRoles.includes(newRole)) {
      return { error: "Invalid role specified." };
    }

    if (newRole === "root" && user.email !== ADMIN_EMAIL) {
      return { error: "Only the Root Administrator can assign Root clearance." };
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

/**
 * Moderation Action: Delete reported survey, penalize creator's Trust Score (-15), and resolve report.
 */
export async function deleteSurveyAndWarnCreator(
  reportId: string,
  surveyQuestionOrId?: string,
  targetUserId?: string
): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Deleting community surveys strictly requires Admin or Root clearance. Moderators must escalate to admin." };
    }

    const adminDb = getServiceRoleClient();

    let resolvedCreatorId = targetUserId;
    let surveyFoundId: string | null = null;

    // Check report details
    const { data: rep } = await adminDb
      .from("project_reports")
      .select("target_name, org_id, target_user_id, description")
      .eq("id", reportId)
      .maybeSingle();

    if (rep) {
      resolvedCreatorId = resolvedCreatorId || rep.target_user_id || rep.org_id || undefined;
      const match = rep.description?.match(/\[Survey ID:\s*([a-zA-Z0-9_-]+)\]/);
      if (match) {
        surveyFoundId = match[1];
      }
    }

    const targetSearch = surveyFoundId || surveyQuestionOrId || rep?.target_name;

    if (targetSearch) {
      const { data: byId } = await adminDb
        .from("ngo_surveys")
        .select("id, org_id")
        .eq("id", targetSearch)
        .maybeSingle();

      if (byId) {
        surveyFoundId = byId.id;
        resolvedCreatorId = resolvedCreatorId || byId.org_id;
      } else {
        const { data: byQuestion } = await adminDb
          .from("ngo_surveys")
          .select("id, org_id")
          .eq("question", targetSearch)
          .maybeSingle();

        if (byQuestion) {
          surveyFoundId = byQuestion.id;
          resolvedCreatorId = resolvedCreatorId || byQuestion.org_id;
        }
      }
    }

    // Delete survey options & survey from DB
    if (surveyFoundId) {
      await adminDb.from("ngo_survey_options").delete().eq("survey_id", surveyFoundId);
      await adminDb.from("ngo_survey_votes").delete().eq("survey_id", surveyFoundId);
      await adminDb.from("ngo_surveys").delete().eq("id", surveyFoundId);
    } else if (surveyQuestionOrId) {
      await adminDb.from("ngo_surveys").delete().eq("question", surveyQuestionOrId);
    }

    // Penalize creator (-15 Trust Score per True Trust Protocol) & notify
    if (resolvedCreatorId) {
      try {
        const { data: userYouth } = await adminDb
          .from("users_youth")
          .select("trust_score")
          .eq("id", resolvedCreatorId)
          .maybeSingle();

        if (userYouth) {
          const currentTrust = userYouth.trust_score ?? 30;
          await adminDb
            .from("users_youth")
            .update({ trust_score: Math.max(0, currentTrust - 15) })
            .eq("id", resolvedCreatorId);
        }

        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: resolvedCreatorId,
          type: "moderation",
          title: "Community Survey Removed & Disciplinary Warning",
          message: "Your reported community survey was removed by administration for non-compliance. A moderation strike (-15 Trust Score) was applied to your profile.",
          actionUrl: "/community",
        });
      } catch (err) {
        console.warn("Could not apply penalty or notification to survey creator:", err);
      }
    }

    // Mark report as resolved
    await adminDb
      .from("project_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_action: "Deleted Community Survey & Deducted 15 Trust Score",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    revalidatePath("/dashboard/admin");
    revalidatePath("/community");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteSurveyAndWarnCreator failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete survey and warn creator.",
    };
  }
}

/**
 * Moderation Action: Leave survey intact, penalize creator's Trust Score (-15), and resolve report.
 */
export async function warnSurveyCreator(
  reportId: string,
  targetUserId?: string
): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyModeratorOrAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Moderator or Admin access required." };
    }

    const adminDb = getServiceRoleClient();

    let resolvedCreatorId = targetUserId;
    if (!resolvedCreatorId) {
      const { data: rep } = await adminDb
        .from("project_reports")
        .select("org_id, target_user_id, target_name")
        .eq("id", reportId)
        .maybeSingle();

      resolvedCreatorId = rep?.target_user_id || rep?.org_id || undefined;

      if (!resolvedCreatorId && rep?.target_name) {
        const { data: s } = await adminDb
          .from("ngo_surveys")
          .select("org_id")
          .eq("question", rep.target_name)
          .maybeSingle();
        if (s?.org_id) {
          resolvedCreatorId = s.org_id;
        }
      }
    }

    // Penalize creator (-15 Trust Score per True Trust Protocol) & notify
    if (resolvedCreatorId) {
      try {
        const { data: userYouth } = await adminDb
          .from("users_youth")
          .select("trust_score")
          .eq("id", resolvedCreatorId)
          .maybeSingle();

        if (userYouth) {
          const currentTrust = userYouth.trust_score ?? 30;
          await adminDb
            .from("users_youth")
            .update({ trust_score: Math.max(0, currentTrust - 15) })
            .eq("id", resolvedCreatorId);
        }

        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: resolvedCreatorId,
          type: "moderation",
          title: "Official Moderation Warning on Survey",
          message: "Your community survey was reported and reviewed by administration. A moderation warning strike (-15 Trust Score) was recorded on your profile. Please review the community guidelines.",
          actionUrl: "/community",
        });
      } catch (err) {
        console.warn("Could not apply warning to survey creator:", err);
      }
    }

    // Mark report as resolved
    await adminDb
      .from("project_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_action: "Warned Survey Creator (-15 Trust Score)",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    revalidatePath("/dashboard/admin");
    revalidatePath("/community");
    return { success: true };
  } catch (error: unknown) {
    console.error("warnSurveyCreator failed:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to warn survey creator.",
    };
  }
}

/**
 * Admin Action: Send a custom in-app notification directly to a Youth User or Organization.
 */
export async function sendCustomAdminNotification(
  targetUserId: string,
  title: string,
  message: string,
  type: "system" | "action_required" | "moderation" | "alert" = "system"
): Promise<AdminActionResult> {
  try {
    const { isAuthorized } = await verifyAdmin();
    if (!isAuthorized) {
      return { error: "Unauthorized: Admin access required." };
    }

    if (!targetUserId || !title.trim() || !message.trim()) {
      return { error: "Recipient ID, title, and message are required." };
    }

    const { dispatchNotification } = await import("@/actions/notifications");
    const result = await dispatchNotification({
      userId: targetUserId,
      type,
      title: title.trim(),
      message: message.trim(),
      actionUrl: "/dashboard",
    });

    if (!result.success) {
      return { error: result.error || "Failed to deliver in-app notification." };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("sendCustomAdminNotification exception:", err);
    return { error: err instanceof Error ? err.message : "Failed to send in-app notification." };
  }
}

/**
 * Moderation Escalation Protocol:
 * Moderators and Support staff submit destructive action requests to System Administrators.
 */
export async function escalateReportToAdmin(
  reportId: string,
  reason: string,
  recommendedAction: "ban_user" | "delete_org" | "delete_survey" | "emergency_lock" | "investigate"
): Promise<AdminActionResult> {
  try {
    const { isAuthorized, user, role } = await verifyModeratorOrAdmin();
    if (!isAuthorized || !user) {
      return { error: "Unauthorized: Moderator, Support, or Admin access required." };
    }

    if (!reason.trim() || !recommendedAction) {
      return { error: "Escalation reason and recommended action are required." };
    }

    const adminDb = getServiceRoleClient();

    // 1. Fetch report details
    const { data: rep, error: repErr } = await adminDb
      .from("project_reports")
      .select("id, target_type, target_name, org_id, target_user_id, project_id")
      .eq("id", reportId)
      .maybeSingle();

    if (repErr || !rep) {
      return { error: "Report not found." };
    }

    const targetId = rep.target_user_id || rep.org_id || rep.project_id || rep.id;
    const targetName = rep.target_name || `Report #${reportId.slice(0, 8)}`;

    // 2. Insert into admin_escalations
    const { error: escErr } = await adminDb.from("admin_escalations").insert({
      escalated_by: user.id,
      escalated_by_role: role,
      target_type: rep.target_type || "report",
      target_id: targetId,
      target_name: targetName,
      reason: reason.trim(),
      recommended_action: recommendedAction,
      status: "pending",
    });

    if (escErr) throw escErr;

    // 3. Mark report as 'escalated'
    await adminDb
      .from("project_reports")
      .update({ 
        status: "escalated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    // 4. Send external alert to Discord & Email
    await sendEscalationAlert({
      escalationId: targetId,
      reportId,
      reason: reason.trim(),
      recommendedAction,
      targetType: rep.target_type || "report",
      targetName,
      requestedByName: `${user.email || user.id} (${role})`,
    });

    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("escalateReportToAdmin error:", err);
    return { error: err instanceof Error ? err.message : "Failed to escalate report to admin." };
  }
}

export interface AdminEscalationItem {
  id: string;
  created_at: string;
  updated_at?: string | null;
  escalated_by: string | null;
  escalated_by_role: string;
  target_type: string;
  target_id: string;
  target_name: string | null;
  reason: string;
  recommended_action: string;
  status: string;
  admin_notes: string | null;
  resolution_action?: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

/**
 * Resolves an admin escalation (Approved / Rejected) and optionally executes the destructive action.
 * Strictly requires Admin or Root clearance.
 */
export async function resolveAdminEscalation(
  escalationId: string,
  decision: "approved" | "rejected",
  adminNotes?: string,
  executeAction?: boolean
): Promise<AdminActionResult> {
  try {
    const { isAuthorized, user } = await verifyAdmin();
    if (!isAuthorized || !user) {
      return { error: "Unauthorized: Admin clearance required." };
    }

    const adminDb = getServiceRoleClient();

    const { data: esc, error: escErr } = await adminDb
      .from("admin_escalations")
      .select("*")
      .eq("id", escalationId)
      .maybeSingle();

    if (escErr || !esc) {
      return { error: "Escalation record not found." };
    }

    if (executeAction && decision === "approved") {
      if (esc.recommended_action === "delete_survey") {
        await adminDb.from("ngo_survey_votes").delete().or(`survey_id.eq.${esc.target_id}`);
        await adminDb.from("ngo_survey_options").delete().or(`survey_id.eq.${esc.target_id}`);
        await adminDb.from("ngo_surveys").delete().or(`id.eq.${esc.target_id},question.eq.${esc.target_name}`);
      } else if (esc.recommended_action === "ban_user") {
        await adminDb.from("users_youth").update({ trust_score: 0 }).eq("id", esc.target_id);
        try {
          await adminDb.auth.admin.updateUserById(esc.target_id, {
            ban_duration: "876000h",
            user_metadata: { is_banned: true, banned_reason: esc.reason },
          });
        } catch {}
      } else if (esc.recommended_action === "delete_org") {
        await adminDb.from("users_org").update({ verification_status: "rejected" }).eq("id", esc.target_id);
      }
    }

    // Update escalation record
    await adminDb
      .from("admin_escalations")
      .update({
        status: decision === "approved" ? "approved" : "rejected",
        admin_notes: adminNotes?.trim() || null,
        resolution_action: decision === "approved"
          ? `Approved: Executed ${esc.recommended_action}`
          : "Dismissed / Rejected by Admin",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", escalationId);

    // Mark any corresponding report resolved
    await adminDb
      .from("project_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_action: decision === "approved"
          ? `Resolved via Admin Escalation (${esc.recommended_action})`
          : "Escalation Dismissed by Admin",
        updated_at: new Date().toISOString(),
      })
      .or(`target_user_id.eq.${esc.target_id},org_id.eq.${esc.target_id},id.eq.${esc.target_id}`);

    // Notify staff member who filed escalation
    if (esc.escalated_by) {
      try {
        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: esc.escalated_by,
          type: "system",
          title: `Escalation ${decision === "approved" ? "Approved" : "Dismissed"}`,
          message: `Your escalation regarding "${esc.target_name}" was ${decision === "approved" ? "approved and executed" : "reviewed and dismissed"} by administration.${adminNotes ? ` Note: ${adminNotes}` : ""}`,
          actionUrl: "/dashboard/admin?tab=escalations",
        });
      } catch {}
    }

    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("resolveAdminEscalation error:", err);
    return { error: err instanceof Error ? err.message : "Failed to resolve escalation." };
  }
}

export interface StaffTicketItem {
  id: string;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
  resolution_action?: string | null;
  user_id: string | null;
  email: string;
  phone: string | null;
  subject: string;
  reason: string;
  content: string;
  status: string | null;
}

/**
 * Updates a Support Ticket's status and optionally sends a notification/response to the user.
 */
export async function updateSupportTicketStatus(
  ticketId: string,
  newStatus: "open" | "in_progress" | "resolved" | "escalated",
  replyMessage?: string
): Promise<AdminActionResult> {
  try {
    const { isAuthorized, user } = await verifyStaff();
    if (!isAuthorized || !user) {
      return { error: "Unauthorized: Staff clearance required." };
    }

    const adminDb = getServiceRoleClient();
    const { data: ticket, error: ticketErr } = await adminDb
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return { error: "Support ticket not found." };
    }

    await adminDb
      .from("support_tickets")
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
        resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
        resolution_action: newStatus === "resolved"
          ? (replyMessage ? `Resolved with reply: ${replyMessage.slice(0, 100)}` : "Resolved by Support Specialist")
          : undefined,
      })
      .eq("id", ticketId);

    if (replyMessage && replyMessage.trim() && ticket.user_id) {
      try {
        const { dispatchNotification } = await import("@/actions/notifications");
        await dispatchNotification({
          userId: ticket.user_id,
          type: "system",
          title: `Support Ticket Update: ${ticket.subject}`,
          message: replyMessage.trim(),
          actionUrl: "/dashboard/support",
        });

        const { sendDirectTicketReplyAlert } = await import("@/lib/externalAlerts");
        await sendDirectTicketReplyAlert({
          userId: ticket.user_id,
          fallbackEmail: ticket.email,
          ticketSubject: ticket.subject,
          replyMessage: replyMessage.trim(),
          ticketId,
          newStatus,
        });
      } catch (notifyErr) {
        console.warn("Failed to dispatch ticket notification or external alert:", notifyErr);
      }
    }

    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateSupportTicketStatus error:", err);
    return { error: err instanceof Error ? err.message : "Failed to update support ticket." };
  }
}



