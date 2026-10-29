import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { dispatchNotification } from "@/actions/notifications";
import { getUserRole } from "@/lib/roles";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase Service Role credentials.");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface MuteCheckResult {
  isMuted: boolean;
  remainingMinutes?: number;
  error?: string;
}

import { type MuteDuration, MUTE_DURATION_OPTIONS } from "./moderationConstants";
export { type MuteDuration, MUTE_DURATION_OPTIONS };

/**
 * Checks whether a user is currently muted from posting or replying.
 * Verifies both the database column `muted_until` and Supabase Auth `user_metadata.muted_until`.
 */
export async function checkUserMuted(userId: string): Promise<MuteCheckResult> {
  try {
    if (!userId) {
      return { isMuted: false };
    }

    const adminDb = getServiceRoleClient();
    let mutedUntilStr: string | null = null;

    // 1. Check youth profile column
    try {
      const { data: youth } = await adminDb
        .from("users_youth")
        .select("muted_until")
        .eq("id", userId)
        .maybeSingle();

      if (youth?.muted_until) {
        mutedUntilStr = youth.muted_until;
      }
    } catch {
      // Column may not be migrated yet; fallback cleanly
    }

    // 2. Check org profile column if not found
    if (!mutedUntilStr) {
      try {
        const { data: org } = await adminDb
          .from("users_org")
          .select("muted_until")
          .eq("id", userId)
          .maybeSingle();

        if (org?.muted_until) {
          mutedUntilStr = org.muted_until;
        }
      } catch {
        // Fallback cleanly
      }
    }

    // 3. Check Supabase Auth user_metadata
    if (!mutedUntilStr) {
      try {
        const { data: authUser } = await adminDb.auth.admin.getUserById(userId);
        if (authUser?.user?.user_metadata?.muted_until) {
          mutedUntilStr = authUser.user.user_metadata.muted_until as string;
        }
      } catch {
        // Fallback cleanly
      }
    }

    if (mutedUntilStr) {
      const expiry = new Date(mutedUntilStr).getTime();
      const now = Date.now();
      if (expiry > now) {
        const remainingMinutes = Math.max(1, Math.ceil((expiry - now) / (60 * 1000)));
        return {
          isMuted: true,
          remainingMinutes,
          error: `You are temporarily muted and cannot post for ${remainingMinutes} more minutes.`,
        };
      }
    }

    return { isMuted: false };
  } catch (err) {
    console.error("checkUserMuted error:", err);
    return { isMuted: false };
  }
}

export interface MidSessionStatusResult {
  allowed: boolean;
  isMuted?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  remainingMinutes?: number;
  error?: string;
  errorCode?: "USER_MUTED" | "USER_BANNED" | "ORG_NOT_VERIFIED" | "ORG_SUSPENDED" | "ACCOUNT_RESTRICTED";
}

export interface MidSessionStatusOptions {
  requireVerifiedOrg?: boolean;
}

/**
 * Validates mid-session active status against the live database, bypassing stale JWT cookies.
 * Rejects banned users (auth banned or trust_score <= 0), active mutes (muted_until > now),
 * and unverified/suspended NGOs attempting write mutations.
 */
export async function verifyMidSessionActiveStatus(
  userId: string,
  options: MidSessionStatusOptions = {}
): Promise<MidSessionStatusResult> {
  try {
    if (!userId || typeof userId !== "string") {
      return {
        allowed: false,
        error: "Authentication required.",
        errorCode: "ACCOUNT_RESTRICTED",
      };
    }

    const adminDb = getServiceRoleClient();
    const now = Date.now();

    // 1. Check Supabase Auth admin record for permanent or active temporary ban
    try {
      const { data: authData, error: authErr } = await adminDb.auth.admin.getUserById(userId);
      if (!authErr && authData?.user) {
        const u = authData.user;
        const meta = u.user_metadata || {};

        if (meta.banned === true || meta.is_banned === true) {
          return {
            allowed: false,
            isBanned: true,
            error: "Your account has been banned due to violations of European youth safety protocols.",
            errorCode: "USER_BANNED",
          };
        }

        if (u.banned_until) {
          const banExpiry = new Date(u.banned_until).getTime();
          if (banExpiry > now) {
            return {
              allowed: false,
              isBanned: true,
              error: "Your account is temporarily suspended by platform administration.",
              errorCode: "USER_BANNED",
            };
          }
        }

        if (meta.muted_until) {
          const muteExpiry = new Date(meta.muted_until as string).getTime();
          if (muteExpiry > now) {
            const remainingMinutes = Math.max(1, Math.ceil((muteExpiry - now) / (60 * 1000)));
            return {
              allowed: false,
              isMuted: true,
              remainingMinutes,
              error: `You are temporarily muted and cannot post for ${remainingMinutes} more minutes.`,
              errorCode: "USER_MUTED",
            };
          }
        }
      }
    } catch (authFetchErr) {
      console.error("Auth admin check non-fatal exception:", authFetchErr);
    }

    // 2. Query users_youth profile (trust score & muted_until)
    try {
      const { data: youth } = await adminDb
        .from("users_youth")
        .select("trust_score, muted_until")
        .eq("id", userId)
        .maybeSingle();

      if (youth) {
        // Floor check: If trust_score <= 0, account is restricted/suspended
        if (typeof youth.trust_score === "number" && youth.trust_score <= 0) {
          return {
            allowed: false,
            isBanned: true,
            error: "Your account is restricted due to severe trust score infractions (Score: 0/100). Write access is disabled.",
            errorCode: "ACCOUNT_RESTRICTED",
          };
        }

        if (youth.muted_until) {
          const muteExpiry = new Date(youth.muted_until).getTime();
          if (muteExpiry > now) {
            const remainingMinutes = Math.max(1, Math.ceil((muteExpiry - now) / (60 * 1000)));
            return {
              allowed: false,
              isMuted: true,
              remainingMinutes,
              error: `You are temporarily muted and cannot post for ${remainingMinutes} more minutes.`,
              errorCode: "USER_MUTED",
            };
          }
        }
      }
    } catch (youthErr) {
      console.error("Youth mid-session status check error:", youthErr);
    }

    // 3. Query users_org profile (verification status & muted_until)
    try {
      const { data: org } = await adminDb
        .from("users_org")
        .select("is_verified, verified, verification_status, muted_until")
        .eq("id", userId)
        .maybeSingle();

      if (org) {
        if (org.muted_until) {
          const muteExpiry = new Date(org.muted_until).getTime();
          if (muteExpiry > now) {
            const remainingMinutes = Math.max(1, Math.ceil((muteExpiry - now) / (60 * 1000)));
            return {
              allowed: false,
              isMuted: true,
              remainingMinutes,
              error: `Your organization is temporarily muted and cannot post for ${remainingMinutes} more minutes.`,
              errorCode: "USER_MUTED",
            };
          }
        }

        const vStatus = (org.verification_status || "").toLowerCase();
        if (vStatus === "suspended" || vStatus === "rejected") {
          return {
            allowed: false,
            isSuspended: true,
            error: "Your organization accreditation has been suspended or rejected. Write access is revoked.",
            errorCode: "ORG_SUSPENDED",
          };
        }

        if (options.requireVerifiedOrg) {
          const isVerified = org.is_verified === true || org.verified === true || vStatus === "verified";
          if (!isVerified) {
            return {
              allowed: false,
              isSuspended: true,
              error: "Only verified European organizations can publish projects or surveys. Verification is pending or unapproved.",
              errorCode: "ORG_NOT_VERIFIED",
            };
          }
        }
      } else if (options.requireVerifiedOrg) {
        // If requireVerifiedOrg is true but no org record exists, check if elevated staff
        const { getUserRole } = await import("@/lib/roles");
        const role = await getUserRole(userId);
        if (role !== "admin" && role !== "root") {
          return {
            allowed: false,
            isSuspended: true,
            error: "Only verified European organizations or administrators can perform this action.",
            errorCode: "ORG_NOT_VERIFIED",
          };
        }
      }
    } catch (orgErr) {
      console.error("Org mid-session status check error:", orgErr);
    }

    return { allowed: true };
  } catch (err) {
    console.error("verifyMidSessionActiveStatus exception:", err);
    // Fail closed if critical database failure
    return {
      allowed: false,
      error: "Security verification unavailable. Please try again later.",
      errorCode: "ACCOUNT_RESTRICTED",
    };
  }
}

/**
 * Mutes a user for the specified duration (5m, 10m, 15m, 60m).
 * Updates database and auth metadata, dispatches full notification, and logs to Quarantine.
 */
export async function muteUser({
  targetUserId,
  durationMinutes,
  reason,
  contextTitle,
  mutedByUserId,
  projectId,
}: {
  targetUserId: string;
  durationMinutes: MuteDuration;
  reason?: string;
  contextTitle: string;
  mutedByUserId?: string;
  projectId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!targetUserId) {
      return { success: false, error: "Target user ID is required." };
    }

    // Staff immunity guard: Root, Admin, and Moderator are immune to mutes
    const targetRole = await getUserRole(targetUserId);
    if (targetRole === "root" || targetRole === "admin" || targetRole === "moderator") {
      return {
        success: false,
        error: "Permission Denied: Staff members (Root, Admin, Moderator) are immune to disciplinary mutes.",
      };
    }

    // Role-based permission guard: Support cannot mute
    if (mutedByUserId) {
      const executorRole = await getUserRole(mutedByUserId);
      if (executorRole === "support") {
        return {
          success: false,
          error: "Permission Denied: Support staff cannot mute users. Only Moderators, Admins, or Project Coordinators have disciplinary authority.",
        };
      }
    }

    const durationOption = MUTE_DURATION_OPTIONS.find((o) => o.minutes === durationMinutes);
    const durationLabel = durationOption ? durationOption.label : `${durationMinutes} Minutes`;
    const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const adminDb = getServiceRoleClient();

    // 1. Try updating users_youth
    try {
      await adminDb
        .from("users_youth")
        .update({ muted_until: mutedUntil })
        .eq("id", targetUserId);
    } catch (e) {
      console.error("Could not update users_youth.muted_until directly:", e);
    }

    // 2. Try updating users_org
    try {
      await adminDb
        .from("users_org")
        .update({ muted_until: mutedUntil })
        .eq("id", targetUserId);
    } catch (e) {
      console.error("Could not update users_org.muted_until directly:", e);
    }

    // Deduct 30 trust points from user profile if youth (Moderator Mute: -30)
    try {
      const { data: youth } = await adminDb
        .from("users_youth")
        .select("trust_score")
        .eq("id", targetUserId)
        .maybeSingle();

      if (youth && typeof youth.trust_score === "number") {
        await adminDb
          .from("users_youth")
          .update({ trust_score: Math.max(0, Math.min(100, youth.trust_score - 30)) })
          .eq("id", targetUserId);
      }
    } catch (e) {
      console.error("Could not adjust trust score on mute:", e);
    }

    // 3. Update Auth user_metadata for reliable enforcement
    try {
      await adminDb.auth.admin.updateUserById(targetUserId, {
        user_metadata: { muted_until: mutedUntil },
      });
    } catch (authErr) {
      console.error("Failed to update user_metadata for mute:", authErr);
    }

    // 4. Send official full-text notification
    await dispatchNotification({
      userId: targetUserId,
      type: "action_required",
      title: "Temporary Time-out Enforced",
      message: `You have been muted for ${durationLabel} due to suspicious behavior. You cannot post until the time expires.`,
      actionUrl: projectId ? `/dashboard/projects/${projectId}` : "/community",
    });

    // 5. Log incident into Quarantine tray for Admin review
    await logToQuarantine({
      targetUserId,
      reason: "quarantine_muted",
      flaggedContent: `[User Muted for ${durationLabel} in "${contextTitle}"]: ${reason || "Suspicious activity detected by moderator/coordinator"}`,
      contextTitle,
      reportedByUserId: mutedByUserId,
      projectId,
    });

    return { success: true };
  } catch (err) {
    console.error("muteUser exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mute user.",
    };
  }
}

/**
 * Issues an official warning to a user regarding their comment,
 * sends full notification, and deducts reputation points.
 */
export async function warnUser({
  targetUserId,
  contextTitle,
  warnedByUserId,
  projectId,
}: {
  targetUserId: string;
  contextTitle: string;
  warnedByUserId?: string;
  projectId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!targetUserId) {
      return { success: false, error: "Target user ID is required." };
    }

    // Staff immunity guard: Root, Admin, and Moderator are immune to warnings
    const targetRole = await getUserRole(targetUserId);
    if (targetRole === "root" || targetRole === "admin" || targetRole === "moderator") {
      return {
        success: false,
        error: "Permission Denied: Staff members (Root, Admin, Moderator) are immune to disciplinary warnings.",
      };
    }

    // Role-based permission guard: Support cannot warn
    if (warnedByUserId) {
      const executorRole = await getUserRole(warnedByUserId);
      if (executorRole === "support") {
        return {
          success: false,
          error: "Permission Denied: Support staff cannot warn users. Only Moderators, Admins, or Project Coordinators have disciplinary authority.",
        };
      }
    }

    const adminDb = getServiceRoleClient();

    // Deduct 15 trust points from user profile if youth (Moderator Warn: -15)
    try {
      const { data: youth } = await adminDb
        .from("users_youth")
        .select("trust_score")
        .eq("id", targetUserId)
        .maybeSingle();

      if (youth && typeof youth.trust_score === "number") {
        await adminDb
          .from("users_youth")
          .update({ trust_score: Math.max(0, Math.min(100, youth.trust_score - 15)) })
          .eq("id", targetUserId);
      }
    } catch (e) {
      console.error("Could not adjust trust score:", e);
    }

    // Send mandatory full-text warning notification
    await dispatchNotification({
      userId: targetUserId,
      type: "action_required",
      title: "Official Warning Issued",
      message: `You have been warned regarding your comment on '${contextTitle}'. Please follow the guidelines.`,
      actionUrl: projectId ? `/dashboard/projects/${projectId}` : "/community",
    });

    // Log to Quarantine tray
    await logToQuarantine({
      targetUserId,
      reason: "quarantine_warning",
      flaggedContent: `[Official Warning issued on "${contextTitle}"]: Community guidelines infraction recorded.`,
      contextTitle,
      reportedByUserId: warnedByUserId,
      projectId,
    });

    return { success: true };
  } catch (err) {
    console.error("warnUser exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to warn user.",
    };
  }
}

/**
 * Logs a flagged, suspicious, or deleted message into the Quarantine Tray (project_reports)
 * so Administrators can review context later.
 */
export async function logToQuarantine({
  targetUserId,
  targetName,
  reason,
  flaggedContent,
  contextTitle,
  reportedByUserId,
  projectId,
}: {
  targetUserId?: string;
  targetName?: string;
  reason: string;
  flaggedContent: string;
  contextTitle: string;
  reportedByUserId?: string;
  projectId?: string;
}): Promise<void> {
  try {
    const adminDb = getServiceRoleClient();

    // Check if target name needs to be resolved
    let resolvedName = targetName;
    if (!resolvedName && targetUserId) {
      try {
        const { data: youth } = await adminDb
          .from("users_youth")
          .select("full_name")
          .eq("id", targetUserId)
          .maybeSingle();
        if (youth?.full_name) {
          resolvedName = youth.full_name;
        } else {
          const { data: org } = await adminDb
            .from("users_org")
            .select("org_name")
            .eq("id", targetUserId)
            .maybeSingle();
          if (org?.org_name) resolvedName = org.org_name;
        }
      } catch {
        // Fallback
      }
    }

    const payload: Record<string, unknown> = {
      target_type: "quarantine",
      reason: reason || "quarantine_suspicious",
      description: `[Quarantine Context: "${contextTitle}"] ${flaggedContent}`.slice(0, 2000),
      status: "pending",
      reporter_id: reportedByUserId || null,
      target_user_id: targetUserId || null,
      target_name: resolvedName || "Suspicious Transmission",
    };

    if (projectId) {
      payload.project_id = projectId;
    }

    // Insert into project_reports
    const { error: insertErr } = await adminDb.from("project_reports").insert(payload);
    if (insertErr) {
      // If target_type constraint fails before migration 00018 is executed, fallback to target_type: 'user'
      console.error("Quarantine insert with target_type 'quarantine' failed, falling back to 'user':", insertErr.message);
      payload.target_type = "user";
      await adminDb.from("project_reports").insert(payload);
    }
  } catch (err) {
    console.error("Failed to log to Quarantine tray:", err);
  }
}

/**
 * Anti-Troll Hardening: Severe report streak check.
 * Simply creating a report NEVER automatically deducts trust_score from the reported user.
 * 1 or 2 isolated reports from trolls have absolutely zero impact.
 * Only if >= 5 UNIQUE reporters report the same target user within a 24-hour window,
 * an automated temporary safety mute and trust penalty is triggered.
 */
export async function checkSevereReportStreak(
  targetUserId: string,
  targetTitle?: string
): Promise<boolean> {
  if (!targetUserId) return false;
  try {
    // Staff immunity guard: Root, Admin, and Moderator are immune to automated streaks
    const targetRole = await getUserRole(targetUserId);
    if (targetRole === "root" || targetRole === "admin" || targetRole === "moderator") {
      return false;
    }

    const adminDb = getServiceRoleClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReports, error } = await adminDb
      .from("project_reports")
      .select("reporter_id")
      .eq("target_type", "user")
      .eq("target_user_id", targetUserId)
      .gte("created_at", oneDayAgo);

    if (error || !recentReports) return false;

    const uniqueReporters = new Set(
      recentReports
        .map((r: { reporter_id?: string | null }) => r.reporter_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );

    if (uniqueReporters.size >= 5) {
      await muteUser({
        targetUserId,
        durationMinutes: 60, // 1 hour temporary hold until human moderator review
        reason: "Automod severe report streak (5+ unique community reports within 24h)",
        contextTitle: targetTitle ? `Automod Streak: ${targetTitle}` : "Automod Report Streak",
        mutedByUserId: "system_automod",
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error("checkSevereReportStreak error:", err);
    return false;
  }
}
