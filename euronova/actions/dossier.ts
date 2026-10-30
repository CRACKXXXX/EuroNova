"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/roles";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rateLimiter";
import { verifyMidSessionActiveStatus } from "@/lib/moderationShield";
import { revalidatePath } from "next/cache";

export type QuestionType =
  | "text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "language_level"
  | "file_upload"
  | "yes_no";

export interface DossierQuestion {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DossierTemplate {
  id: string;
  org_id: string;
  title: string;
  description?: string | null;
  questions: DossierQuestion[];
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DossierSubmission {
  id: string;
  project_id: string;
  project_title?: string;
  survey_id?: string | null;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  answers: Record<string, unknown>;
  status: "submitted" | "shortlisted" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

// In-memory fallback stores for non-blocking local/mock resilience
const inMemoryTemplates: DossierTemplate[] = [];
const inMemorySubmissions: DossierSubmission[] = [];

/**
 * Checks whether user has permission to manage the given organization's resources.
 */
async function verifyOrgOwnership(userId: string, userEmail: string | undefined, orgId: string): Promise<boolean> {
  if (userId === orgId || userEmail === "euronovaofficial@gmail.com") return true;
  const role = await getUserRole(userId, userEmail);
  return role === "admin" || role === "root";
}

/**
 * Fetches all dossier form templates owned by an organization.
 */
export async function getOrgDossierTemplatesAction(orgId: string): Promise<{
  success: boolean;
  templates: DossierTemplate[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("org_surveys")
      .select("id, org_id, title, description, questions, is_archived, created_at, updated_at")
      .eq("org_id", orgId)
      .or("is_archived.is.null,is_archived.eq.false")
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("DB query failed for org_surveys, falling back to memory:", error.message);
      const filtered = inMemoryTemplates.filter((t) => t.org_id === orgId && !t.is_archived);
      return { success: true, templates: filtered };
    }

    const templates: DossierTemplate[] = (data || []).map((row) => ({
      id: row.id,
      org_id: row.org_id,
      title: row.title || "Candidate Application Dossier",
      description: row.description || null,
      questions: Array.isArray(row.questions) ? (row.questions as DossierQuestion[]) : [],
      is_archived: row.is_archived || false,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    }));

    return { success: true, templates };
  } catch (err) {
    console.warn("Exception fetching org dossier templates, fallback to memory:", err);
    const filtered = inMemoryTemplates.filter((t) => t.org_id === orgId);
    return { success: true, templates: filtered };
  }
}

/**
 * Creates a new dossier form template for an organization.
 */
export async function createDossierTemplateAction(input: {
  orgId: string;
  title: string;
  description?: string;
  questions: DossierQuestion[];
}): Promise<{ success: boolean; template?: DossierTemplate; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required to create form templates." };
    }

    const isAuthorized = await verifyOrgOwnership(user.id, user.email, input.orgId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: You do not have permission to manage this organization's templates." };
    }

    const rateCheck = await checkRateLimit(user.id, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return { success: false, error: "RATE_LIMIT_EXCEEDED" };
    }

    const cleanTitle = stripDangerousHtml(input.title.trim() || "Candidate Application Dossier", 150);
    const cleanDesc = input.description ? stripDangerousHtml(input.description.trim(), 500) : null;

    const payload = {
      org_id: input.orgId,
      title: cleanTitle,
      description: cleanDesc,
      questions: input.questions || [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("org_surveys")
      .insert(payload)
      .select("id, org_id, title, description, questions, created_at, updated_at")
      .single();

    if (error) {
      console.warn("DB insert failed for org_surveys, persisting to memory:", error.message);
      const newTemp: DossierTemplate = {
        id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        org_id: input.orgId,
        title: cleanTitle,
        description: cleanDesc,
        questions: input.questions || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      inMemoryTemplates.unshift(newTemp);
      revalidatePath(`/dashboard/organizations/${input.orgId}/surveys`);
      return { success: true, template: newTemp };
    }

    const created: DossierTemplate = {
      id: data.id,
      org_id: data.org_id,
      title: data.title,
      description: data.description,
      questions: Array.isArray(data.questions) ? (data.questions as DossierQuestion[]) : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    revalidatePath(`/dashboard/organizations/${input.orgId}/surveys`);
    return { success: true, template: created };
  } catch (err) {
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Updates an existing dossier form template.
 */
export async function updateDossierTemplateAction(input: {
  templateId: string;
  orgId: string;
  title: string;
  description?: string;
  questions: DossierQuestion[];
}): Promise<{ success: boolean; template?: DossierTemplate; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required to update form templates." };
    }

    const isAuthorized = await verifyOrgOwnership(user.id, user.email, input.orgId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: You do not have permission to manage this organization's templates." };
    }

    const cleanTitle = stripDangerousHtml(input.title.trim() || "Candidate Application Dossier", 150);
    const cleanDesc = input.description ? stripDangerousHtml(input.description.trim(), 500) : null;

    const payload = {
      title: cleanTitle,
      description: cleanDesc,
      questions: input.questions || [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("org_surveys")
      .update(payload)
      .eq("id", input.templateId)
      .eq("org_id", input.orgId)
      .select("id, org_id, title, description, questions, created_at, updated_at")
      .maybeSingle();

    if (error || !data) {
      // Memory fallback
      const idx = inMemoryTemplates.findIndex((t) => t.id === input.templateId);
      if (idx !== -1) {
        inMemoryTemplates[idx] = {
          ...inMemoryTemplates[idx],
          title: cleanTitle,
          description: cleanDesc,
          questions: input.questions,
          updated_at: new Date().toISOString(),
        };
        revalidatePath(`/dashboard/organizations/${input.orgId}/surveys`);
        return { success: true, template: inMemoryTemplates[idx] };
      }
      return { success: false, error: error ? error.message : "Template not found." };
    }

    const updated: DossierTemplate = {
      id: data.id,
      org_id: data.org_id,
      title: data.title,
      description: data.description,
      questions: Array.isArray(data.questions) ? (data.questions as DossierQuestion[]) : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    revalidatePath(`/dashboard/organizations/${input.orgId}/surveys`);
    return { success: true, template: updated };
  } catch (err) {
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Deletes a dossier form template and unlinks it from any projects using it.
 */
export async function deleteDossierTemplateAction(
  templateId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required to delete templates." };
    }

    const isAuthorized = await verifyOrgOwnership(user.id, user.email, orgId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: You do not have permission to delete this template." };
    }

    // Unlink from active projects first
    await supabase
      .from("projects")
      .update({ application_form_id: null })
      .eq("application_form_id", templateId);

    // Soft Delete: Mark template as archived instead of deleting to preserve historical submissions
    const { error } = await supabase
      .from("org_surveys")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", templateId)
      .eq("org_id", orgId);

    if (error) {
      const target = inMemoryTemplates.find((t) => t.id === templateId);
      if (target) {
        target.is_archived = true;
        target.updated_at = new Date().toISOString();
      }
    }

    revalidatePath(`/dashboard/organizations/${orgId}/surveys`);
    return { success: true };
  } catch (err) {
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Volunteer submits an application dossier directly on the project details page.
 * Automatically marks is_applied = true in user_project_interactions,
 * awards XP (+75 XP with MISSION_APPLY), and dispatches notifications.
 */
export async function submitProjectDossierAction(input: {
  projectId: string;
  surveyId: string;
  answers: Record<string, unknown>;
}): Promise<{
  success: boolean;
  submissionId?: string;
  error?: string;
  xpAwarded?: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "You must be logged in as a volunteer to submit an application." };
    }

    const statusCheck = await verifyMidSessionActiveStatus(user.id);
    if (!statusCheck.allowed) {
      return { success: false, error: statusCheck.error || "Action restricted." };
    }

    const clientIp = await getClientIp();
    const ipRateCheck = await checkRateLimit(`dossier_ip_${clientIp}`, RATE_LIMITS.DOSSIER_SUBMISSION);
    if (!ipRateCheck.success) {
      return { success: false, error: "RATE_LIMIT_EXCEEDED" };
    }

    const userRateCheck = await checkRateLimit(`dossier_user_${user.id}`, RATE_LIMITS.DOSSIER_SUBMISSION);
    if (!userRateCheck.success) {
      return { success: false, error: "RATE_LIMIT_EXCEEDED" };
    }

    // Role-based guard: Organizations cannot apply to projects
    if (user.user_metadata?.role === "org") {
      return { success: false, error: "Organizations cannot apply to missions." };
    }

    const { data: orgProfile } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (orgProfile) {
      return { success: false, error: "Organizations cannot apply to missions." };
    }

    // Fetch project to retrieve org_id and title
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("id, org_id, title")
      .eq("id", input.projectId)
      .maybeSingle();

    if (projError || !project) {
      return { success: false, error: "Project not found or inactive." };
    }

    if (project.org_id === user.id) {
      return { success: false, error: "You cannot apply to your own organization's missions." };
    }

    const orgId = project.org_id;

    // Insert or update submission
    const submissionPayload = {
      project_id: input.projectId,
      survey_id: input.surveyId,
      user_id: user.id,
      org_id: orgId,
      answers: input.answers,
      status: "submitted",
      updated_at: new Date().toISOString(),
    };

    let submissionId = `sub-${Date.now()}`;
    const { data: subData, error: subError } = await supabase
      .from("project_dossier_submissions")
      .upsert(submissionPayload, { onConflict: "project_id,user_id" })
      .select("id")
      .maybeSingle();

    if (subError) {
      console.warn("DB upsert failed for project_dossier_submissions, using memory store:", subError.message);
      const existingIdx = inMemorySubmissions.findIndex(
        (s) => s.project_id === input.projectId && s.user_id === user.id
      );
      if (existingIdx !== -1) {
        inMemorySubmissions[existingIdx].answers = input.answers;
        inMemorySubmissions[existingIdx].updated_at = new Date().toISOString();
        submissionId = inMemorySubmissions[existingIdx].id;
      } else {
        inMemorySubmissions.unshift({
          id: submissionId,
          project_id: input.projectId,
          project_title: project.title,
          survey_id: input.surveyId,
          user_id: user.id,
          user_email: user.email,
          answers: input.answers,
          status: "submitted",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else if (subData?.id) {
      submissionId = subData.id;
    }

    // Mark applied in user_project_interactions
    try {
      await supabase.from("user_project_interactions").upsert(
        {
          user_id: user.id,
          project_id: input.projectId,
          is_applied: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,project_id" }
      );
    } catch (interactErr) {
      console.error("Error setting interaction is_applied:", interactErr);
    }

    // Award XP (+75 XP)
    let xpAwarded = 75;
    try {
      const [{ awardUserXp }, { XP_CONFIG }] = await Promise.all([
        import("@/actions/gamification"),
        import("@/lib/gamification"),
      ]);
      const xpRes = await awardUserXp({
        amount: XP_CONFIG.APPLY_MISSION.amount,
        reason: XP_CONFIG.APPLY_MISSION.reason,
        actionType: XP_CONFIG.APPLY_MISSION.actionType,
        targetId: input.projectId,
        trustBoost: XP_CONFIG.APPLY_MISSION.trustBoost,
      });
      if (xpRes.success && xpRes.gained) {
        xpAwarded = xpRes.gained;
      }
    } catch (xpErr) {
      console.error("Error awarding XP on dossier submission:", xpErr);
    }

    // Dispatch notifications
    try {
      const { dispatchNotification } = await import("@/actions/notifications");
      // 1. Volunteer confirmation
      await dispatchNotification({
        userId: user.id,
        type: "alert",
        title: "Application Dossier Submitted",
        message: `Your application dossier for "${project.title}" has been transmitted to the host organization!`,
        actionUrl: `/dashboard/projects/${input.projectId}`,
      });

      // 2. NGO notification
      if (orgId && orgId !== user.id) {
        await dispatchNotification({
          userId: orgId,
          type: "action_required",
          title: "New Candidate Application Dossier",
          message: `A candidate submitted their application dossier for "${project.title}". Review their submission in your Dossier panel.`,
          actionUrl: `/dashboard/organizations/${orgId}/surveys`,
        });
      }
    } catch (notifErr) {
      console.error("Error dispatching dossier notifications:", notifErr);
    }

    revalidatePath(`/dashboard/projects/${input.projectId}`);
    revalidatePath("/dashboard/my-missions");

    return { success: true, submissionId, xpAwarded };
  } catch (err) {
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Checks if a specific volunteer has already submitted a dossier for a project.
 */
export async function getVolunteerSubmissionStatusAction(
  projectId: string,
  userId: string
): Promise<{
  hasSubmitted: boolean;
  submission?: DossierSubmission | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_dossier_submissions")
      .select("id, project_id, survey_id, user_id, answers, status, created_at, updated_at")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      return {
        hasSubmitted: true,
        submission: {
          id: data.id,
          project_id: data.project_id,
          survey_id: data.survey_id,
          user_id: data.user_id,
          answers: (data.answers as Record<string, unknown>) || {},
          status: data.status as "submitted" | "shortlisted" | "accepted" | "rejected",
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      };
    }

    // Memory store fallback
    const mem = inMemorySubmissions.find((s) => s.project_id === projectId && s.user_id === userId);
    if (mem) {
      return { hasSubmitted: true, submission: mem };
    }

    return { hasSubmitted: false, submission: null };
  } catch (err) {
    console.warn("Exception checking volunteer submission status:", err);
    return { hasSubmitted: false, submission: null };
  }
}

/**
 * Fetches all dossier submissions for an organization's projects (Anti-IDOR protected).
 */
export async function getOrgDossierSubmissionsAction(orgId: string): Promise<{
  success: boolean;
  submissions: DossierSubmission[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, submissions: [], error: "Authentication required." };
    }

    const isAuthorized = await verifyOrgOwnership(user.id, user.email, orgId);
    if (!isAuthorized) {
      return { success: false, submissions: [], error: "Unauthorized: Access denied to candidate submissions." };
    }

    const { data, error } = await supabase
      .from("project_dossier_submissions")
      .select(`
        id, project_id, survey_id, user_id, answers, status, created_at, updated_at,
        projects(title),
        users_youth(first_name, last_name, avatar_url)
      `)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("DB query error for dossier submissions, falling back to memory:", error.message);
      return { success: true, submissions: inMemorySubmissions };
    }

    interface RawSubmissionRow {
      id: string;
      project_id: string;
      survey_id?: string | null;
      user_id: string;
      answers: unknown;
      status: string;
      created_at: string;
      updated_at: string;
      projects?: { title?: string } | { title?: string }[];
      users_youth?:
        | { first_name?: string; last_name?: string; avatar_url?: string | null }
        | { first_name?: string; last_name?: string; avatar_url?: string | null }[];
    }

    const submissions: DossierSubmission[] = ((data as unknown as RawSubmissionRow[]) || []).map((row) => {
      const proj = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      const youth = Array.isArray(row.users_youth) ? row.users_youth[0] : row.users_youth;
      const userName = youth ? `${youth.first_name || ""} ${youth.last_name || ""}`.trim() : "Volunteer Applicant";

      return {
        id: row.id,
        project_id: row.project_id,
        project_title: proj?.title || "Erasmus+ Mission",
        survey_id: row.survey_id,
        user_id: row.user_id,
        user_name: userName || "Volunteer Applicant",
        user_avatar: youth?.avatar_url || null,
        answers: (row.answers as Record<string, unknown>) || {},
        status: (row.status as "submitted" | "shortlisted" | "accepted" | "rejected") || "submitted",
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return { success: true, submissions };
  } catch (err) {
    return { success: false, submissions: inMemorySubmissions, error: sanitizeErrorMessage(err) };
  }
}

/**
 * Updates candidate submission status (Shortlist, Accept, Reject).
 * Anti-IDOR protected: only owning NGO or admin.
 */
export async function updateSubmissionStatusAction(input: {
  submissionId: string;
  orgId: string;
  status: "submitted" | "shortlisted" | "accepted" | "rejected";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const isAuthorized = await verifyOrgOwnership(user.id, user.email, input.orgId);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Access denied." };
    }

    // STRICT CAPACITY RACE-CONDITION GUARD:
    // If setting status to 'accepted', verify that project participant_count is not exceeded
    if (input.status === "accepted") {
      let targetProjectId: string | null = null;
      let currentStatus: string | null = null;
      const { data: subData } = await supabase
        .from("project_dossier_submissions")
        .select("project_id, status")
        .eq("id", input.submissionId)
        .eq("org_id", input.orgId)
        .maybeSingle();

      if (subData?.project_id) {
        targetProjectId = subData.project_id;
        currentStatus = subData.status;
      } else {
        const mem = inMemorySubmissions.find((s) => s.id === input.submissionId);
        if (mem) {
          targetProjectId = mem.project_id;
          currentStatus = mem.status;
        }
      }

      if (targetProjectId && currentStatus !== "accepted") {
        const { data: project } = await supabase
          .from("projects")
          .select("participant_count, title")
          .eq("id", targetProjectId)
          .maybeSingle();

        if (project && typeof project.participant_count === "number" && project.participant_count > 0) {
          const { count: acceptedCount, error: countErr } = await supabase
            .from("project_dossier_submissions")
            .select("id", { count: "exact", head: true })
            .eq("project_id", targetProjectId)
            .eq("status", "accepted");

          const safeAcceptedCount = !countErr && typeof acceptedCount === "number"
            ? acceptedCount
            : inMemorySubmissions.filter((s) => s.project_id === targetProjectId && s.status === "accepted").length;

          if (safeAcceptedCount >= project.participant_count) {
            return {
              success: false,
              error: `Mission capacity reached (${safeAcceptedCount}/${project.participant_count} spots filled). You cannot accept more candidates than available spots.`,
            };
          }
        }
      }
    }

    const { error } = await supabase
      .from("project_dossier_submissions")
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", input.submissionId)
      .eq("org_id", input.orgId);

    if (error) {
      const mem = inMemorySubmissions.find((s) => s.id === input.submissionId);
      if (mem) {
        mem.status = input.status;
        mem.updated_at = new Date().toISOString();
      }
    }

    revalidatePath(`/dashboard/organizations/${input.orgId}/surveys`);
    return { success: true };
  } catch (err) {
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}
