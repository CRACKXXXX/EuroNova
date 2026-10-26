"use server";

import { revalidatePath } from "next/cache";
import { sendEmailAction } from "@/actions/sendEmail";
import {
  ADMIN_EMAIL,
  getServiceRoleClient,
  verifyAdmin,
  type AdminActionResult,
} from "./adminActionUtils";

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
