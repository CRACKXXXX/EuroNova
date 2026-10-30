"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { moderateContent } from "@/lib/moderation";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { ProjectCreationSchema } from "@/lib/schemas";
import { validateSafeHttpsUrl, stripDangerousHtml } from "@/lib/securitySanitizer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { verifyMidSessionActiveStatus } from "@/lib/moderationShield";

export interface CreateProjectResult {
  error?: string;
  success?: boolean | string;
}

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "User not authenticated" };
    }

    // Rate Limiting Gate (Sliding Window per Organization)
    const rateCheck = await checkRateLimit(`project_${user.id}`, RATE_LIMITS.PROJECT_CREATION);
    if (!rateCheck.success) {
      return { error: "RATE_LIMIT_EXCEEDED" };
    }

    // VERIFY MID-SESSION ACTIVE STATUS & ACCREDITED NGO STATUS
    const statusCheck = await verifyMidSessionActiveStatus(user.id, { requireVerifiedOrg: true });
    if (!statusCheck.allowed) {
      return { error: statusCheck.error || "Only verified, accredited organizations can publish projects." };
    }

    // Check if user is an organization
    const { data: orgData, error: orgError } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (orgError || !orgData) {
      return { error: "Only organizations can publish projects." };
    }

    // Parse and normalize raw form fields
    const rawOfficialUrl = (formData.get("official_url") as string | null)?.trim() || null;
    if (rawOfficialUrl) {
      const urlCheck = validateSafeHttpsUrl(rawOfficialUrl);
      if (!urlCheck.isValid) {
        return { error: `Invalid official application URL: ${urlCheck.error}` };
      }
    }

    const themesString = formData.get("themes") as string | null;
    const themes = themesString
      ? themesString
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const eligibleCountriesStr = formData.get("eligible_countries") as string | null;
    const eligible_countries = eligibleCountriesStr
      ? eligibleCountriesStr
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    const rawApplicationFormId = (formData.get("application_form_id") as string | null)?.trim() || null;
    const rawStartDate = (formData.get("start_date") as string | null)?.trim() || null;
    const rawEndDate = (formData.get("end_date") as string | null)?.trim() || null;
    const rawDeadline = (formData.get("application_deadline") as string | null)?.trim() || null;
    const rawParticipantCount = parseInt(formData.get("participant_count") as string) || null;

    const rawProjectData = {
      title: (formData.get("title") as string | null)?.trim() || "",
      description: (formData.get("description") as string | null)?.trim() || "",
      project_type: (formData.get("project_type") as string) || "ESC",
      dest_country: (formData.get("dest_country") as string) || "",
      exact_location: (formData.get("exact_location") as string | null)?.trim() || null,
      official_url: rawOfficialUrl,
      target_profile: (formData.get("target_profile") as string | null)?.trim() || null,
      min_age: parseInt(formData.get("min_age") as string) || 18,
      max_age: parseInt(formData.get("max_age") as string) || 30,
      duration_days: parseInt(formData.get("duration_days") as string) || null,
      travel_budget_min: parseInt(formData.get("travel_budget_min") as string) || null,
      travel_budget_max: parseInt(formData.get("travel_budget_max") as string) || null,
      participation_fee: parseInt(formData.get("participation_fee") as string) || null,
      financing_type: (formData.get("financing_type") as string) || null,
      covers_rup_flights: formData.get("covers_rup_flights") === "on",
      is_last_minute: formData.get("is_last_minute") === "on",
      accommodation_covered: formData.get("accommodation_covered") === "on",
      themes,
      eligible_countries,
      start_date: rawStartDate,
      end_date: rawEndDate,
      application_deadline: rawDeadline,
      participant_count: rawParticipantCount,
      application_form_id: rawApplicationFormId,
    };

    // Zod double-layer schema validation
    const parsed = ProjectCreationSchema.safeParse(rawProjectData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid project submission parameters.";
      return { error: issue };
    }

    // Strip dangerous HTML
    const title = stripDangerousHtml(parsed.data.title, 150);
    const description = stripDangerousHtml(parsed.data.description, 10000);
    const exact_location = parsed.data.exact_location
      ? stripDangerousHtml(parsed.data.exact_location, 150)
      : null;
    const target_profile = parsed.data.target_profile
      ? stripDangerousHtml(parsed.data.target_profile, 500)
      : null;

    // AI Auto-moderation interception
    const moderation = await moderateContent(title, description);

    if (moderation.action === "auto_reject") {
      return {
        error: "Your project violates our content guidelines and has been blocked.",
      };
    }

    const projectStatus: "published" | "pending_review" =
      moderation.action === "pending_review" ? "pending_review" : "published";

    let imageUrl: string | null = null;
    const imageFile = formData.get("cover_image") as File | null;

    if (
      imageFile &&
      typeof imageFile === "object" &&
      "size" in imageFile &&
      imageFile.size > 0
    ) {
      const MAX_PROJECT_IMAGE_SIZE = 5 * 1024 * 1024; // Strictly 5MB limit
      if (imageFile.size > MAX_PROJECT_IMAGE_SIZE) {
        return { error: "File is too large. Maximum allowed size is 5MB." };
      }

      const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (imageFile.type && !ALLOWED_MIME_TYPES.includes(imageFile.type)) {
        return { error: "Invalid file format. Only JPG, PNG, WEBP, and GIF images are allowed." };
      }

      const fileExt = imageFile.name ? imageFile.name.split(".").pop() || "png" : "png";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("projects")
        .upload(fileName, imageFile, { upsert: true });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("projects").getPublicUrl(fileName);
        imageUrl = publicUrl;
      } else {
        console.error("Upload error:", uploadError);
        return { error: sanitizeErrorMessage(uploadError) };
      }
    }

    const basePayload = {
      org_id: user.id,
      title,
      description,
      project_type: parsed.data.project_type,
      dest_country: parsed.data.dest_country,
      exact_location,
      official_url: parsed.data.official_url,
      target_profile,
      min_age: parsed.data.min_age,
      max_age: parsed.data.max_age,
      duration_days: parsed.data.duration_days,
      travel_budget_min: parsed.data.travel_budget_min,
      travel_budget_max: parsed.data.travel_budget_max,
      participation_fee: parsed.data.participation_fee,
      covers_rup_flights: parsed.data.covers_rup_flights,
      is_last_minute: parsed.data.is_last_minute,
      accommodation_covered: parsed.data.accommodation_covered,
      themes: parsed.data.themes,
      eligible_countries: parsed.data.eligible_countries,
      financing_type: parsed.data.financing_type,
      image_url: imageUrl,
      status: projectStatus,
    };

    const extendedPayload = {
      ...basePayload,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      application_deadline: parsed.data.application_deadline || null,
      participant_count: parsed.data.participant_count || null,
      application_form_id: parsed.data.application_form_id || null,
    };

    let { error: insertError } = await supabase.from("projects").insert(extendedPayload);

    // Defensive fallback: If database schema doesn't yet have extended columns, retry with base payload
    if (insertError && (insertError.message.includes("column") || insertError.code === "42703")) {
      console.warn("Retrying project insert with base schema payload:", insertError.message);
      const retry = await supabase.from("projects").insert(basePayload);
      insertError = retry.error;
    }

    if (insertError) {
      return { error: sanitizeErrorMessage(insertError) };
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard/projects", "page");

    if (projectStatus === "pending_review") {
      return { success: "Project submitted! Pending manual review." };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Unhandled error in createProject:", error);
    return {
      error: sanitizeErrorMessage(error),
    };
  }
}
