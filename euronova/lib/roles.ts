import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type UserRole = "root" | "admin" | "moderator" | "support" | "user";

export interface UserRolePermissions {
  canViewReports: boolean;
  canResolveReports: boolean;
  canWarnUser: boolean;
  canMuteUser: boolean;
  canBanUser: boolean;
  canDeleteAnyComment: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canAssignRoles: boolean;
  canReplyGatedForum: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserRolePermissions> = {
  root: {
    canViewReports: true,
    canResolveReports: true,
    canWarnUser: true,
    canMuteUser: true,
    canBanUser: true,
    canDeleteAnyComment: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canAssignRoles: true,
    canReplyGatedForum: true,
  },
  admin: {
    canViewReports: true,
    canResolveReports: true,
    canWarnUser: true,
    canMuteUser: true,
    canBanUser: true,
    canDeleteAnyComment: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canAssignRoles: true,
    canReplyGatedForum: true,
  },
  moderator: {
    canViewReports: true,
    canResolveReports: true,
    canWarnUser: true,
    canMuteUser: true,
    canBanUser: false, // Moderator CANNOT ban/delete accounts/orgs/surveys
    canDeleteAnyComment: true,
    canEditProjects: false,
    canDeleteProjects: false,
    canAssignRoles: false,
    canReplyGatedForum: true,
  },
  support: {
    canViewReports: false, // Support reads/answers tickets; CANNOT manage reports or delete accounts
    canResolveReports: false,
    canWarnUser: false,
    canMuteUser: false,
    canBanUser: false,
    canDeleteAnyComment: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canAssignRoles: false,
    canReplyGatedForum: true,
  },
  user: {
    canViewReports: false,
    canResolveReports: false,
    canWarnUser: false,
    canMuteUser: false,
    canBanUser: false,
    canDeleteAnyComment: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canAssignRoles: false,
    canReplyGatedForum: false,
  },
};

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resolves the system role of a given user.
 * Verified with master administrator fallback, users_youth table, and auth metadata.
 */
export async function getUserRole(
  userId: string,
  userEmail?: string | null
): Promise<UserRole> {
  try {
    if (!userId) return "user";

    // 1. Master Root Administrator check
    if (userEmail === "euronovaofficial@gmail.com") {
      return "root";
    }

    const adminDb = getServiceRoleClient();
    if (!adminDb) return "user";

    // 2. Query users_youth table
    const { data: youth, error: youthErr } = await adminDb
      .from("users_youth")
      .select("role, email")
      .eq("id", userId)
      .maybeSingle();

    if (!youthErr && youth) {
      if (youth.email === "euronovaofficial@gmail.com") {
        return "root";
      }
      const rawRole = (youth.role || "").toLowerCase().trim();
      if (rawRole === "root" || rawRole === "admin" || rawRole === "moderator" || rawRole === "support") {
        return rawRole as UserRole;
      }
    }

    // 3. Fallback: Check Supabase Auth user metadata
    try {
      const { data: authUser } = await adminDb.auth.admin.getUserById(userId);
      if (authUser?.user?.email === "euronovaofficial@gmail.com") {
        return "root";
      }
      const metaRole = (authUser?.user?.user_metadata?.role || "").toLowerCase().trim();
      if (metaRole === "root" || metaRole === "admin" || metaRole === "moderator" || metaRole === "support") {
        return metaRole as UserRole;
      }
    } catch {
      // Non-blocking fallback
    }

    return "user";
  } catch (err) {
    console.error("getUserRole error:", err);
    return "user";
  }
}

/**
 * Checks whether a specific role has a given permission.
 */
export function hasPermission(
  role: UserRole,
  permission: keyof UserRolePermissions
): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? Boolean(perms[permission]) : false;
}

export { ROLE_BADGE_CONFIG } from "./rolesConstants";
