"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/roles";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";

import { ProjectCreationSchema } from "@/lib/schemas";
import { stripDangerousHtml, validateSafeHttpsUrl } from "@/lib/securitySanitizer";

export async function updateProjectAction(
  projectId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "User not authenticated" };
    }

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, org_id, image_url")
      .eq("id", projectId)
      .maybeSingle();

    if (fetchError || !project) {
      return { error: "Project not found" };
    }

    // Check permissions: Owner NGO or Root/Admin
    const role = await getUserRole(user.id, user.email);
    const isElevated =
      role === "admin" ||
      role === "root" ||
      user.email === "euronovaofficial@gmail.com";

    if (user.id !== project.org_id && !isElevated) {
      return { error: "Unauthorized: You do not have permission to edit this project." };
    }

    // Normalize URL
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

    const parsed = ProjectCreationSchema.safeParse(rawProjectData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid project submission parameters.";
      return { error: issue };
    }

    const title = stripDangerousHtml(parsed.data.title, 150);
    const description = stripDangerousHtml(parsed.data.description, 10000);
    const exact_location = parsed.data.exact_location
      ? stripDangerousHtml(parsed.data.exact_location, 150)
      : null;
    const target_profile = parsed.data.target_profile
      ? stripDangerousHtml(parsed.data.target_profile, 500)
      : null;

    // Optional Image update
    let imageUrl: string | null = project.image_url;
    const imageFile = formData.get("cover_image") as File | null;
    if (
      imageFile &&
      typeof imageFile === "object" &&
      "size" in imageFile &&
      imageFile.size > 0
    ) {
      const MAX_PROJECT_IMAGE_SIZE = 5 * 1024 * 1024;
      if (imageFile.size > MAX_PROJECT_IMAGE_SIZE) {
        return { error: "File is too large. Maximum allowed size is 5MB." };
      }
      const fileExt = imageFile.name ? imageFile.name.split(".").pop() || "png" : "png";
      const fileName = `${project.org_id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("projects")
        .upload(fileName, imageFile, { upsert: true });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("projects").getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    const baseUpdate = {
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
    };

    const extendedUpdate = {
      ...baseUpdate,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      application_deadline: parsed.data.application_deadline || null,
      participant_count: parsed.data.participant_count || null,
      application_form_id: parsed.data.application_form_id || null,
    };

    let { error: updateError } = await supabase
      .from("projects")
      .update(extendedUpdate)
      .eq("id", projectId);

    if (updateError && (updateError.message.includes("column") || updateError.code === "42703")) {
      const retry = await supabase.from("projects").update(baseUpdate).eq("id", projectId);
      updateError = retry.error;
    }

    if (updateError) {
      return { error: sanitizeErrorMessage(updateError) };
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${projectId}`);

    return { success: true };
  } catch (err: unknown) {
    return { error: sanitizeErrorMessage(err) };
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "User not authenticated" };
    }

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("org_id")
      .eq("id", projectId)
      .maybeSingle();

    if (fetchError || !project) {
      return { error: "Project not found" };
    }

    // Check permissions: Owner NGO or Root/Admin
    const role = await getUserRole(user.id, user.email);
    const isElevated =
      role === "admin" ||
      role === "root" ||
      user.email === "euronovaofficial@gmail.com";

    if (user.id !== project.org_id && !isElevated) {
      return { error: "Unauthorized: You do not have permission to delete this project." };
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      return { error: sanitizeErrorMessage(deleteError) };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard/projects");
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return { error: sanitizeErrorMessage(err) };
  }
}
