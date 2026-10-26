"use server";

import { revalidatePath } from "next/cache";
import { type UserRole } from "@/lib/roles";
import {
  ADMIN_EMAIL,
  getServiceRoleClient,
  verifyAdmin,
  type AdminActionResult,
} from "./adminActionUtils";

export interface StaffSearchUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
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
