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
export async function verifyAdmin() {
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
export async function verifyModeratorOrAdmin() {
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
export async function verifyStaff() {
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

