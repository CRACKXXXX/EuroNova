"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
 * Verifies that the current session belongs to the authorized administrator.
 */
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || user.email !== ADMIN_EMAIL) {
    return { supabase, isAuthorized: false, user: null };
  }
  return { supabase, isAuthorized: true, user };
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

    // 1. Explicit cleanup for applications associated with this project
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
