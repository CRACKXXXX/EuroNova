import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getUserRole, type UserRole } from "@/lib/roles";

export const ADMIN_EMAIL = "euronovaofficial@gmail.com";

export type AdminActionResult = {
  success?: boolean;
  error?: string;
};

/**
 * Creates an admin client with service_role key to completely bypass Row Level Security (RLS)
 * for administrative write and delete mutations.
 */
export function getServiceRoleClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

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
export async function verifyAdmin() {
  try {
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
  } catch (err) {
    console.error("verifyAdmin unhandled error:", err);
    return { supabase: null as unknown as Awaited<ReturnType<typeof createClient>>, isAuthorized: false, user: null, role: "user" as UserRole };
  }
}

/**
 * Verifies that the current session belongs to a Moderator, Support Specialist, Administrator, or Root.
 * Can review/resolve reports, delete comments, warn/mute users.
 * Cross-Role: Both moderator and support roles have clearance to triage reports.
 * Destructive actions (deleting accounts, orgs, surveys) strictly blocked for moderators/support.
 */
export async function verifyModeratorOrAdmin() {
  try {
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
  } catch (err) {
    console.error("verifyModeratorOrAdmin unhandled error:", err);
    return { supabase: null as unknown as Awaited<ReturnType<typeof createClient>>, isAuthorized: false, user: null, role: "user" as UserRole };
  }
}

/**
 * Verifies that the current session belongs to any valid staff role (root, admin, moderator, support).
 * Cross-Role: Both moderator and support roles have clearance to view and reply to support tickets.
 */
export async function verifyStaff() {
  try {
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
  } catch (err) {
    console.error("verifyStaff unhandled error:", err);
    return { supabase: null as unknown as Awaited<ReturnType<typeof createClient>>, isAuthorized: false, user: null, role: "user" as UserRole };
  }
}
