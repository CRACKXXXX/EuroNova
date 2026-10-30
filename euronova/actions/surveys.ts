"use server";

import { createClient } from "@/utils/supabase/server";
import { autoModerateContent } from "@/lib/autoModerator";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { getUserRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { SurveyCreationSchema, SurveyVoteSchema } from "@/lib/schemas";
import { verifyMidSessionActiveStatus } from "@/lib/moderationShield";

export type SurveyType = "boolean" | "single_choice" | "multiple_choice";
export type SurveyStatus = "published" | "draft" | "closed";

export interface SurveyOptionItem {
  id: string;
  survey_id: string;
  option_text: string;
  display_order: number;
  percentage?: number; // Calculated on server, 0 to 100
}

export interface CommunitySurveyItem {
  id: string;
  org_id: string;
  org_name: string;
  question: string;
  survey_type: SurveyType;
  status: SurveyStatus;
  created_at: string;
  options: SurveyOptionItem[];
  hasVoted: boolean;
  userVotedOptionIds: string[];
}

export interface SurveysPaginationResult {
  surveys: CommunitySurveyItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreateSurveyInput {
  question: string;
  survey_type: SurveyType;
  options: string[];
  status?: SurveyStatus;
}

export interface UpdateSurveyInput {
  surveyId: string;
  question: string;
  survey_type: SurveyType;
  options: string[];
  status?: SurveyStatus;
}

// In-memory resilient cache fallback in case migration 00020 has not yet been applied in remote Supabase
interface FallbackSurvey {
  id: string;
  org_id: string;
  org_name: string;
  question: string;
  survey_type: SurveyType;
  status: SurveyStatus;
  created_at: string;
  options: { id: string; survey_id: string; option_text: string; display_order: number }[];
  votes: { survey_id: string; option_id: string; user_id: string }[];
}

const globalSurveyStore: FallbackSurvey[] = [];

/**
 * Creates a new NGO community survey.
 * Validates survey_type, passes question and options through autoModerator.
 */
export async function createNgoSurveyAction(
  input: CreateSurveyInput
): Promise<{ success: boolean; error?: string; surveyId?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "You are not authenticated. Please log in." };
    }

    // Rate Limiting Gate (Sliding Window by User ID)
    const rateCheck = await checkRateLimit(user.id, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return {
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
      };
    }

    // VERIFY MID-SESSION ACTIVE STATUS & ACCREDITED NGO STATUS
    const statusCheck = await verifyMidSessionActiveStatus(user.id, { requireVerifiedOrg: true });
    if (!statusCheck.allowed) {
      return { success: false, error: statusCheck.error || "Your organization cannot create surveys." };
    }

    // 1. Zod double-layer schema validation
    const parsed = SurveyCreationSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid survey parameters.";
      return { success: false, error: issue };
    }

    const { survey_type, status = "published" } = parsed.data;
    const question = stripDangerousHtml(parsed.data.question, 300);

    if (question.length < 5) {
      return { success: false, error: "Please fill in all required fields after sanitization." };
    }

    // Auto-moderation check on the question
    const modCheckQuestion = autoModerateContent(question);
    if (!modCheckQuestion.allowed) {
      return {
        success: false,
        error: "Your input contains restricted words or personal data and was blocked.",
      };
    }

    // Prepare normalized options
    let normalizedOptions: string[] = [];
    if (survey_type === "boolean") {
      normalizedOptions = ["Yes", "No"];
    } else {
      normalizedOptions = parsed.data.options
        .map((opt) => stripDangerousHtml(opt, 150))
        .filter((opt) => opt.length > 0);
      if (normalizedOptions.length < 2) {
        return { success: false, error: "Please provide at least 2 distinct voting options." };
      }
    }

    // Auto-moderation check on each option
    for (const optText of normalizedOptions) {
      const modCheckOpt = autoModerateContent(optText);
      if (!modCheckOpt.allowed) {
        return {
          success: false,
          error: "Your input contains restricted words or personal data and was blocked.",
        };
      }
    }

    // Determine organization display name and enforce accreditation
    const userRole = await getUserRole(user.id, user.email);
    const isElevated = userRole === "admin" || userRole === "root" || user.email === "euronovaofficial@gmail.com";

    const { data: orgProfile } = await supabase
      .from("users_org")
      .select("org_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!orgProfile && !isElevated) {
      return { success: false, error: "Only accredited organizations can create surveys." };
    }

    const orgName = orgProfile?.org_name || "Verified European NGO";

    // 1. Try persisting to Supabase database
    const { data: surveyRow, error: insertError } = await supabase
      .from("ngo_surveys")
      .insert({
        org_id: user.id,
        org_name: orgName,
        question: question.trim(),
        survey_type,
        status,
      })
      .select("id")
      .single();

    if (!insertError && surveyRow?.id) {
      const optionsRows = normalizedOptions.map((text, idx) => ({
        survey_id: surveyRow.id,
        option_text: text,
        display_order: idx + 1,
      }));

      const { error: optError } = await supabase.from("ngo_survey_options").insert(optionsRows);
      if (optError) {
        console.error("Error inserting survey options:", optError);
      }

      revalidatePath("/community");
      return { success: true, surveyId: surveyRow.id };
    }

    // 2. Resilient fallback if table does not exist yet (PGRST205)
    console.error("Using resilient store for NGO survey creation:", insertError?.message);
    const newSurveyId = `survey-${Date.now()}`;
    const fallbackOptions = normalizedOptions.map((optText, idx) => ({
      id: `opt-${Date.now()}-${idx}`,
      survey_id: newSurveyId,
      option_text: optText,
      display_order: idx + 1,
    }));

    globalSurveyStore.unshift({
      id: newSurveyId,
      org_id: user.id,
      org_name: orgName,
      question: question.trim(),
      survey_type,
      status,
      created_at: new Date().toISOString(),
      options: fallbackOptions,
      votes: [],
    });

    revalidatePath("/community");
    return { success: true, surveyId: newSurveyId };
  } catch (error: unknown) {
    console.error("createNgoSurveyAction unexpected exception:", error);
    return { success: false, error: sanitizeErrorMessage(error) };
  }
}

/**
 * Updates an existing survey and its options.
 */
export async function updateNgoSurveyAction(
  input: UpdateSurveyInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "You are not authenticated. Please log in." };
    }

    // VERIFY MID-SESSION ACTIVE STATUS & ACCREDITED NGO STATUS
    const statusCheck = await verifyMidSessionActiveStatus(user.id, { requireVerifiedOrg: true });
    if (!statusCheck.allowed) {
      return { success: false, error: statusCheck.error || "Your organization cannot modify surveys." };
    }

    const { surveyId, question, survey_type, options, status = "published" } = input;

    if (!question || question.trim().length < 5) {
      return { success: false, error: "Please fill in all required fields." };
    }

    const modCheckQuestion = autoModerateContent(question);
    if (!modCheckQuestion.allowed) {
      return {
        success: false,
        error: "Your input contains restricted words or personal data and was blocked.",
      };
    }

    let normalizedOptions: string[] = [];
    if (survey_type === "boolean") {
      normalizedOptions = ["Yes", "No"];
    } else {
      normalizedOptions = options.map((opt) => opt.trim()).filter(Boolean);
      if (normalizedOptions.length < 2) {
        return { success: false, error: "Please provide at least 2 distinct voting options." };
      }
    }

    for (const opt of normalizedOptions) {
      if (!autoModerateContent(opt).allowed) {
        return {
          success: false,
          error: "Your input contains restricted words or personal data and was blocked.",
        };
      }
    }

    const userRole = await getUserRole(user.id, user.email);
    const isElevated = userRole === "admin" || userRole === "root" || user.email === "euronovaofficial@gmail.com";

    // Try Supabase DB update
    let updateQuery = supabase
      .from("ngo_surveys")
      .update({
        question: question.trim(),
        survey_type,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", surveyId);

    if (!isElevated) {
      updateQuery = updateQuery.eq("org_id", user.id);
    }

    const { error: updateError } = await updateQuery;

    if (!updateError) {
      await supabase.from("ngo_survey_options").delete().eq("survey_id", surveyId);
      const optionsRows = normalizedOptions.map((text, idx) => ({
        survey_id: surveyId,
        option_text: text,
        display_order: idx + 1,
      }));
      await supabase.from("ngo_survey_options").insert(optionsRows);
      revalidatePath("/community");
      return { success: true };
    }

    // Resilient store fallback with strict ownership verification
    const target = globalSurveyStore.find((s) => s.id === surveyId);
    if (target) {
      if (target.org_id !== user.id && !isElevated) {
        return { success: false, error: "Unauthorized: You do not own this survey." };
      }
      target.question = question.trim();
      target.survey_type = survey_type;
      target.status = status;
      target.options = normalizedOptions.map((text, idx) => ({
        id: `opt-${surveyId}-${idx}`,
        survey_id: surveyId,
        option_text: text,
        display_order: idx + 1,
      }));
    }

    revalidatePath("/community");
    return { success: true };
  } catch (error: unknown) {
    console.error("updateNgoSurveyAction unexpected exception:", error);
    return { success: false, error: sanitizeErrorMessage(error) };
  }
}

/**
 * Deletes a survey and all associated options/votes.
 */
export async function deleteNgoSurveyAction(
  surveyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "You are not authenticated. Please log in." };
    }

    const userRole = await getUserRole(user.id, user.email);
    const canDeleteAny =
      userRole === "admin" ||
      userRole === "root" ||
      user.email === "euronovaofficial@gmail.com";

    const query = supabase.from("ngo_surveys").delete().eq("id", surveyId);
    if (!canDeleteAny) {
      query.eq("org_id", user.id);
    }

    const { error } = await query;
    if (!error) {
      revalidatePath("/community");
      return { success: true };
    }

    // Resilient store fallback
    const idx = globalSurveyStore.findIndex((s) => s.id === surveyId);
    if (idx !== -1) {
      if (canDeleteAny || globalSurveyStore[idx].org_id === user.id) {
        globalSurveyStore.splice(idx, 1);
      }
    }

    revalidatePath("/community");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteNgoSurveyAction exception:", error);
    return { success: false, error: sanitizeErrorMessage(error) };
  }
}

/**
 * Fetches published community surveys with strictly 50-item pagination and calculated percentage bars.
 * Does NOT return raw vote counts to the client.
 */
export async function getCommunitySurveysAction(
  page: number = 1,
  pageSize: number = 50
): Promise<SurveysPaginationResult> {
  try {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id || null;

    // 1. Attempt fetching from database
    const { data: surveysData, count, error: surveysError } = await supabase
      .from("ngo_surveys")
      .select("id, org_id, org_name, question, survey_type, status, created_at", { count: "exact" })
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(offset, offset + safePageSize - 1);

    if (!surveysError && surveysData) {
      const surveyIds = surveysData.map((s) => s.id);

      // Fetch options and votes concurrently
      const [{ data: allOptions }, { data: allVotes }] = await Promise.all([
        supabase
          .from("ngo_survey_options")
          .select("id, survey_id, option_text, display_order")
          .in("survey_id", surveyIds)
          .order("display_order", { ascending: true }),
        supabase
          .from("ngo_survey_votes")
          .select("id, survey_id, option_id, user_id")
          .in("survey_id", surveyIds),
      ]);

      const items: CommunitySurveyItem[] = surveysData.map((s) => {
        const sOptions = (allOptions || []).filter((o) => o.survey_id === s.id);
        const sVotes = (allVotes || []).filter((v) => v.survey_id === s.id);
        const totalVotes = sVotes.length;

        // Votes cast by current user
        const userVotes = currentUserId
          ? sVotes.filter((v) => v.user_id === currentUserId)
          : [];
        const hasVoted = userVotes.length > 0;
        const userVotedOptionIds = userVotes.map((v) => v.option_id);

        // Calculate exact percentages without revealing raw vote counts
        const optionsWithPercentage: SurveyOptionItem[] = sOptions.map((opt) => {
          const optVotesCount = sVotes.filter((v) => v.option_id === opt.id).length;
          const percentage = totalVotes > 0 ? Math.round((optVotesCount / totalVotes) * 100) : 0;
          return {
            id: opt.id,
            survey_id: opt.survey_id,
            option_text: opt.option_text,
            display_order: opt.display_order,
            percentage,
          };
        });

        return {
          id: s.id,
          org_id: s.org_id,
          org_name: s.org_name || "Verified European NGO",
          question: s.question,
          survey_type: s.survey_type as SurveyType,
          status: s.status as SurveyStatus,
          created_at: s.created_at,
          options: optionsWithPercentage,
          hasVoted,
          userVotedOptionIds,
        };
      });

      const totalCount = count || items.length;
      const totalPages = Math.ceil(totalCount / safePageSize) || 1;

      return {
        surveys: items,
        totalCount,
        page: safePage,
        pageSize: safePageSize,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      };
    }

    // 2. Resilient store fallback
    const publishedList = globalSurveyStore.filter((s) => s.status === "published");
    const totalCount = publishedList.length;
    const paginated = publishedList.slice(offset, offset + safePageSize);

    const items: CommunitySurveyItem[] = paginated.map((s) => {
      const totalVotes = s.votes.length;
      const userVotes = currentUserId ? s.votes.filter((v) => v.user_id === currentUserId) : [];
      const hasVoted = userVotes.length > 0;
      const userVotedOptionIds = userVotes.map((v) => v.option_id);

      const optionsWithPercentage = s.options.map((opt) => {
        const optVotesCount = s.votes.filter((v) => v.option_id === opt.id).length;
        const percentage = totalVotes > 0 ? Math.round((optVotesCount / totalVotes) * 100) : 0;
        return {
          ...opt,
          percentage,
        };
      });

      return {
        id: s.id,
        org_id: s.org_id,
        org_name: s.org_name,
        question: s.question,
        survey_type: s.survey_type,
        status: s.status,
        created_at: s.created_at,
        options: optionsWithPercentage,
        hasVoted,
        userVotedOptionIds,
      };
    });

    const totalPages = Math.ceil(totalCount / safePageSize) || 1;
    return {
      surveys: items,
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    };
  } catch (error: unknown) {
    console.error("getCommunitySurveysAction exception:", error);
    return {
      surveys: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }
}

/**
 * Casts a vote on an NGO community survey.
 * Once cast, calculates and returns updated percentages immediately.
 */
export async function voteNgoSurveyAction(payload: {
  surveyId: string;
  optionIds: string[];
}): Promise<{
  success: boolean;
  error?: string;
  percentages?: Record<string, number>;
  userVotedOptionIds?: string[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "You are not authenticated. Please log in." };
    }

    // Rate Limiting Gate (Sliding Window by User ID)
    const rateCheck = await checkRateLimit(user.id, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return {
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
      };
    }

    // VERIFY MID-SESSION ACTIVE STATUS (Bans, Mutes, Suspensions)
    const statusCheck = await verifyMidSessionActiveStatus(user.id);
    if (!statusCheck.allowed) {
      return {
        success: false,
        error: statusCheck.error || "You are temporarily restricted from voting.",
      };
    }

    // 1. Zod schema validation
    const parsed = SurveyVoteSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid vote parameters.";
      return { success: false, error: issue };
    }

    const { surveyId, optionIds } = parsed.data;

    // 2. Try DB operations
    const { data: survey, error: surveyError } = await supabase
      .from("ngo_surveys")
      .select("id, survey_type, status")
      .eq("id", surveyId)
      .maybeSingle();

    if (!surveyError && survey) {
      if (survey.status !== "published") {
        return { success: false, error: "This survey is currently closed." };
      }

      // Check if user already voted in this survey
      const { data: existingVotes } = await supabase
        .from("ngo_survey_votes")
        .select("id, option_id")
        .eq("survey_id", surveyId)
        .eq("user_id", user.id);

      if (existingVotes && existingVotes.length > 0) {
        return { success: false, error: "You have already cast your vote in this survey." };
      }

      // If single_choice or boolean, restrict to 1 option
      const selectedOptionIds =
        survey.survey_type === "multiple_choice" ? optionIds : [optionIds[0]];

      const voteInserts = selectedOptionIds.map((optId) => ({
        survey_id: surveyId,
        option_id: optId,
        user_id: user.id,
      }));

      const { error: voteError } = await supabase.from("ngo_survey_votes").insert(voteInserts);
      if (voteError) {
        if (voteError.code === "23505") {
          return {
            success: false,
            error: "You have already cast your vote in this survey.",
          };
        }
        return { success: false, error: sanitizeErrorMessage(voteError) };
      }

      // Fetch all votes and options for this survey concurrently to compute updated percentages
      const [{ data: allVotes }, { data: allOptions }] = await Promise.all([
        supabase
          .from("ngo_survey_votes")
          .select("option_id")
          .eq("survey_id", surveyId),
        supabase
          .from("ngo_survey_options")
          .select("id")
          .eq("survey_id", surveyId),
      ]);

      const totalVotes = allVotes?.length || 0;
      const percentages: Record<string, number> = {};

      (allOptions || []).forEach((opt) => {
        const count = (allVotes || []).filter((v) => v.option_id === opt.id).length;
        percentages[opt.id] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      });

      revalidatePath("/community");
      return {
        success: true,
        percentages,
        userVotedOptionIds: selectedOptionIds,
      };
    }

    // 2. Resilient store fallback
    const target = globalSurveyStore.find((s) => s.id === surveyId);
    if (!target) {
      return { success: false, error: "Survey not found." };
    }

    const alreadyVoted = target.votes.some((v) => v.user_id === user.id);
    if (alreadyVoted) {
      return { success: false, error: "You have already cast your vote in this survey." };
    }

    const selectedOptionIds =
      target.survey_type === "multiple_choice" ? optionIds : [optionIds[0]];

    selectedOptionIds.forEach((optId) => {
      target.votes.push({
        survey_id: surveyId,
        option_id: optId,
        user_id: user.id,
      });
    });

    const totalVotes = target.votes.length;
    const percentages: Record<string, number> = {};
    target.options.forEach((opt) => {
      const count = target.votes.filter((v) => v.option_id === opt.id).length;
      percentages[opt.id] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    });

    revalidatePath("/community");
    return {
      success: true,
      percentages,
      userVotedOptionIds: selectedOptionIds,
    };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return {
        success: false,
        error: "You have already cast your vote in this survey.",
      };
    }
    console.error("voteNgoSurveyAction exception:", error);
    return { success: false, error: sanitizeErrorMessage(error) };
  }
}

/**
 * Fetches surveys created by a specific organization with 50-item pagination.
 */
export async function getOrgSurveysAction(
  orgId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<SurveysPaginationResult> {
  try {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const supabase = await createClient();

    const { data: surveysData, count, error } = await supabase
      .from("ngo_surveys")
      .select("id, org_id, org_name, question, survey_type, status, created_at", { count: "exact" })
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + safePageSize - 1);

    if (!error && surveysData) {
      const surveyIds = surveysData.map((s) => s.id);
      const [{ data: allOptions }, { data: allVotes }] = await Promise.all([
        supabase
          .from("ngo_survey_options")
          .select("id, survey_id, option_text, display_order")
          .in("survey_id", surveyIds)
          .order("display_order", { ascending: true }),
        supabase
          .from("ngo_survey_votes")
          .select("id, survey_id, option_id, user_id")
          .in("survey_id", surveyIds),
      ]);

      const items: CommunitySurveyItem[] = surveysData.map((s) => {
        const sOptions = (allOptions || []).filter((o) => o.survey_id === s.id);
        const sVotes = (allVotes || []).filter((v) => v.survey_id === s.id);
        const totalVotes = sVotes.length;

        const optionsWithPercentage = sOptions.map((opt) => {
          const optVotesCount = sVotes.filter((v) => v.option_id === opt.id).length;
          const percentage = totalVotes > 0 ? Math.round((optVotesCount / totalVotes) * 100) : 0;
          return {
            ...opt,
            percentage,
          };
        });

        return {
          id: s.id,
          org_id: s.org_id,
          org_name: s.org_name || "Verified Organization",
          question: s.question,
          survey_type: s.survey_type as SurveyType,
          status: s.status as SurveyStatus,
          created_at: s.created_at,
          options: optionsWithPercentage,
          hasVoted: false,
          userVotedOptionIds: [],
        };
      });

      const totalCount = count || items.length;
      const totalPages = Math.ceil(totalCount / safePageSize) || 1;

      return {
        surveys: items,
        totalCount,
        page: safePage,
        pageSize: safePageSize,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      };
    }

    // Fallback store
    const orgList = globalSurveyStore.filter((s) => s.org_id === orgId);
    const totalCount = orgList.length;
    const paginated = orgList.slice(offset, offset + safePageSize);

    const items: CommunitySurveyItem[] = paginated.map((s) => {
      const totalVotes = s.votes.length;
      const optionsWithPercentage = s.options.map((opt) => {
        const optVotesCount = s.votes.filter((v) => v.option_id === opt.id).length;
        const percentage = totalVotes > 0 ? Math.round((optVotesCount / totalVotes) * 100) : 0;
        return {
          ...opt,
          percentage,
        };
      });

      return {
        id: s.id,
        org_id: s.org_id,
        org_name: s.org_name,
        question: s.question,
        survey_type: s.survey_type,
        status: s.status,
        created_at: s.created_at,
        options: optionsWithPercentage,
        hasVoted: false,
        userVotedOptionIds: [],
      };
    });

    const totalPages = Math.ceil(totalCount / safePageSize) || 1;
    return {
      surveys: items,
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    };
  } catch (error: unknown) {
    console.error("getOrgSurveysAction exception:", error);
    return {
      surveys: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }
}
