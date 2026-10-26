import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { maskEmail } from "@/lib/externalAlerts";

export const dynamic = "force-dynamic";

const GHOST_USER_ID = "554ec183-ced5-4e1c-9aee-a94ca1d51ec4";
const ROOT_ADMIN_EMAIL = "euronovaofficial@gmail.com";
const GHOST_USER_EMAIL = "archive-anonymized@euronova.internal";

export async function GET(request: Request) {
  return handleInactivityPurge(request);
}

export async function POST(request: Request) {
  return handleInactivityPurge(request);
}

async function handleInactivityPurge(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase service credentials" },
        { status: 500 }
      );
    }

    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Calculate 2-year storage decay threshold (GDPR Art. 5.1.e)
    const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Date.now() - twoYearsMs;
    const cutoffDate = new Date(cutoffTimestamp).toISOString();

    // 3. Query all registered accounts via Supabase Auth Admin
    const { data: usersData, error: listError } = await adminDb.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("Failed to list users for inactivity purge:", listError);
      return NextResponse.json(
        { error: `Auth list error: ${listError.message}` },
        { status: 500 }
      );
    }

    const allUsers = usersData?.users || [];

    // 4. Identify inactive candidates (no login or account creation > 2 years ago)
    const candidates = allUsers.filter((u) => {
      // Security: never touch root administrator or ghost user
      if (u.email === ROOT_ADMIN_EMAIL || u.email === GHOST_USER_EMAIL || u.id === GHOST_USER_ID) {
        return false;
      }

      const lastActivityTime = u.last_sign_in_at
        ? new Date(u.last_sign_in_at).getTime()
        : new Date(u.created_at).getTime();

      return lastActivityTime < cutoffTimestamp;
    });

    // Limit to batch of 20 to prevent server execution timeouts
    const targetBatch = candidates.slice(0, 20);

    const purgedList: Array<{
      id: string;
      maskedEmail: string;
      lastActivity: string;
    }> = [];
    const purgeErrors: Array<{ id: string; error: string }> = [];

    // 5. Sequentially execute atomic erasure on each inactive account
    for (const user of targetBatch) {
      try {
        const userId = user.id;

        // A. Anonymize authored forum discussions to Ghost User (Art. 17 preservation)
        await Promise.all([
          adminDb
            .from("global_forum_threads")
            .update({
              user_id: GHOST_USER_ID,
              author_name: "Deleted User",
              author_avatar: null,
            })
            .eq("user_id", userId),

          adminDb
            .from("global_forum_posts")
            .update({
              user_id: GHOST_USER_ID,
              author_name: "Deleted User",
              author_avatar: null,
            })
            .eq("user_id", userId),

          adminDb
            .from("project_forum_messages")
            .update({
              user_id: GHOST_USER_ID,
              author_name: "Deleted User",
              avatar_url: null,
            })
            .eq("user_id", userId),
        ]);

        // B. Purge personal activities and direct interactions
        await Promise.all([
          adminDb.from("notifications").delete().eq("user_id", userId),
          adminDb.from("user_project_interactions").delete().eq("user_id", userId),
          adminDb.from("applications").delete().eq("youth_id", userId),
          adminDb.from("reviews").delete().eq("youth_id", userId),
        ]);

        // C. Scrub support tickets PII
        await adminDb
          .from("support_tickets")
          .update({
            email: "deleted-user@anonymized.internal",
            phone: null,
            content: "[Inquiry content purged pursuant to GDPR Art. 5.1.e storage limitation / 2-year inactivity decay]",
          })
          .eq("user_id", userId);

        // D. Delete public profiles in relational tables
        await Promise.all([
          adminDb.from("users_youth").delete().eq("id", userId),
          adminDb.from("users_org").delete().eq("id", userId),
        ]);

        // E. Permanently delete user credentials from Auth system
        const { error: delAuthErr } = await adminDb.auth.admin.deleteUser(userId);
        if (delAuthErr) {
          throw delAuthErr;
        }

        purgedList.push({
          id: userId,
          maskedEmail: maskEmail(user.email || ""),
          lastActivity: user.last_sign_in_at || user.created_at,
        });
      } catch (err: unknown) {
        console.error(`Failed to purge inactive user ${user.id}:`, err);
        purgeErrors.push({
          id: user.id,
          error: err instanceof Error ? err.message : "Unknown error during account purge",
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      retentionRule: "2 Years Data Decay (GDPR Art. 5.1.e)",
      cutoffDate,
      totalInactiveDetected: candidates.length,
      purgedCount: purgedList.length,
      purgedUsers: purgedList,
      errors: purgeErrors,
    });
  } catch (error: unknown) {
    console.error("Cron inactivity-purge failure:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
