import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "./rolesTypes";

export * from "./rolesTypes";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
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
