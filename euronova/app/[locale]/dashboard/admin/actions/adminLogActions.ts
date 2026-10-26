"use server";

import { revalidatePath } from "next/cache";
import { sendEscalationAlert } from "@/lib/externalAlerts";
import {
  getServiceRoleClient,
  verifyAdmin,
  verifyModeratorOrAdmin,
  verifyStaff,
  type AdminActionResult,
} from "./adminActionUtils";

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
        console.error("Could not deduct trust score on comment removal:", err);
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
        console.error("Could not record warning on target user:", err);
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
        console.error("Could not ban target user:", err);
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
        console.error("Could not apply penalty or notification to survey creator:", err);
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
        console.error("Could not apply warning to survey creator:", err);
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
        console.error("Failed to dispatch ticket notification or external alert:", notifyErr);
      }
    }

    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateSupportTicketStatus error:", err);
    return { error: err instanceof Error ? err.message : "Failed to update support ticket." };
  }
}
