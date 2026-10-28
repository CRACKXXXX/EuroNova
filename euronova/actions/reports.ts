"use server";

import { createClient } from "@/utils/supabase/server";
import { sendEmailAction } from "./sendEmail";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { ReportSubmissionSchema, type ReportSubmissionInput } from "@/lib/schemas";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rateLimiter";
import { checkSevereReportStreak } from "@/lib/moderationShield";

export type ReportTargetType = ReportSubmissionInput["targetType"];

export interface SubmitGlobalReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: string;
  reason: string;
  description?: string;
}

export interface SubmitReportPayload {
  projectId: string;
  projectTitle: string;
  reason: string;
  description: string;
}

export interface SubmitSurveyReportPayload {
  surveyId: string;
  surveyQuestion: string;
  reason: string;
  description?: string;
}

export interface SubmitReportResult {
  success?: boolean;
  error?: string;
  reportId?: string;
}

/**
 * Server Action: Submit a 360º moderation report targeting a Project, Organization, or User.
 * Inserts the record into `project_reports` and triggers an email notification to EuroNova admins.
 */
export async function submitGlobalReportAction(
  payload: SubmitGlobalReportPayload
): Promise<SubmitReportResult> {
  try {
    // 1. Zod double-layer schema validation
    const parsed = ReportSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid report parameters.";
      return { error: issue };
    }

    const { targetType, targetId } = parsed.data;
    const targetTitle = stripDangerousHtml(parsed.data.targetTitle, 200);
    const reason = stripDangerousHtml(parsed.data.reason, 100);
    const description = parsed.data.description
      ? stripDangerousHtml(parsed.data.description, 2000)
      : undefined;

    const supabase = await createClient();

    // Determine if reporter is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const reporterId = user?.id || null;
    const reporterEmail = user?.email || "Anonymous Visitor";

    // 2. Sliding window Rate Limiter (User ID or Client IP)
    const clientIp = await getClientIp();
    const rateIdentifier = reporterId ? `report_user_${reporterId}` : `report_ip_${clientIp}`;
    const rateCheck = await checkRateLimit(rateIdentifier, RATE_LIMITS.REPORT);
    if (!rateCheck.success) {
      return {
        error: rateCheck.error || "Too many reports submitted. Please wait before reporting again.",
      };
    }

    // 3. Prepare insertion payload based on target_type
    const insertData: Record<string, unknown> = {
      target_type: targetType,
      target_name: targetTitle,
      reporter_id: reporterId,
      reason: reason,
      description: description ? description : null,
      status: "pending",
    };

    if (targetType === "project") {
      insertData.project_id = targetId;
    } else if (targetType === "organization") {
      insertData.org_id = targetId;
    } else if (targetType === "user") {
      insertData.target_user_id = targetId;
    } else if (targetType === "survey") {
      try {
        const { data: surveyRow } = await supabase
          .from("ngo_surveys")
          .select("id, org_id")
          .eq("id", targetId)
          .maybeSingle();

        if (surveyRow?.org_id) {
          insertData.org_id = surveyRow.org_id;
          insertData.target_user_id = surveyRow.org_id;
        }
      } catch (err) {
        console.error("Could not find survey creator:", err);
      }
      insertData.description = `[Survey ID: ${targetId}] ${description || ""}`.trim();
    }

    // 2. Insert into `project_reports` table
    const { data: insertedReport, error: insertError } = await supabase
      .from("project_reports")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert 360 report into project_reports:", insertError);
      return { error: sanitizeErrorMessage(insertError) };
    }

    // 3. Dispatch email notification to EuroNova command center
    const targetLabel =
      targetType === "organization"
        ? "Organization"
        : targetType === "user"
        ? "User"
        : targetType === "survey"
        ? "Survey"
        : "Project";

    await sendEmailAction({
      to: "euronovaofficial@gmail.com",
      subject: `🚨 [360º Moderation Alert] ${targetLabel} Reported: "${targetTitle}"`,
      body: `A new 360º moderation report was transmitted on EuroNova.
--------------------------------------------------
Target Type:   ${targetLabel.toUpperCase()}
Target Title:  ${targetTitle}
Target ID:     ${targetId}
Reporter:      ${reporterEmail} (ID: ${reporterId || "Unauthenticated"})
Reason:        ${reason}
Details:
${description || "No additional commentary provided."}
Status:        pending
Timestamp:     ${new Date().toISOString()}
--------------------------------------------------
Review and moderate this transmission at https://euronova.space/dashboard/admin?tab=reports`,
    });

    // 4. Anti-Troll Hardening: Check if a severe streak exists (>= 5 unique reporters in 24h)
    // Isolated reports (1-4) NEVER penalize trust_score. Only severe streaks trigger automod action.
    if (targetType === "user" && targetId) {
      checkSevereReportStreak(targetId, targetTitle).catch((err) => {
        console.error("Async checkSevereReportStreak error:", err);
      });
    }

    return {
      success: true,
      reportId: insertedReport?.id,
    };
  } catch (error: unknown) {
    console.error("submitGlobalReportAction exception:", error);
    return {
      error: sanitizeErrorMessage(error),
    };
  }
}

/**
 * Backward-compatible adapter for project reporting
 */
export async function submitProjectReportAction(
  payload: SubmitReportPayload
): Promise<SubmitReportResult> {
  return submitGlobalReportAction({
    targetType: "project",
    targetId: payload.projectId,
    targetTitle: payload.projectTitle,
    reason: payload.reason,
    description: payload.description,
  });
}

/**
 * Moderation adapter for community survey reporting
 */
export async function submitSurveyReportAction(
  payload: SubmitSurveyReportPayload
): Promise<SubmitReportResult> {
  return submitGlobalReportAction({
    targetType: "survey",
    targetId: payload.surveyId,
    targetTitle: payload.surveyQuestion,
    reason: payload.reason,
    description: payload.description,
  });
}
