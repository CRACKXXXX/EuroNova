"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { moderateContent } from "@/lib/moderation";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";

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

    // Check if user is an organization
    const { data: orgData, error: orgError } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", user.id)
      .single();

    if (orgError || !orgData) {
      return { error: "Only organizations can publish projects." };
    }

    const title = (formData.get("title") as string | null)?.trim() || "";
    const description = (formData.get("description") as string | null)?.trim() || "";

    if (!title) {
      return { error: "Project title is required." };
    }

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
      const MAX_PROJECT_IMAGE_SIZE = 1 * 1024 * 1024; // Strictly 1MB limit
      if (imageFile.size > MAX_PROJECT_IMAGE_SIZE) {
        return { error: "File is too large. Maximum allowed size is 1MB." };
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

    const project_type = (formData.get("project_type") as string) || "ESC";
    const dest_country = (formData.get("dest_country") as string) || "";
    const exact_location = (formData.get("exact_location") as string) || null;
    const official_url = (formData.get("official_url") as string) || null;
    const target_profile = (formData.get("target_profile") as string) || null;

    const min_age = parseInt(formData.get("min_age") as string) || 18;
    const max_age = parseInt(formData.get("max_age") as string) || 30;
    const duration_days = parseInt(formData.get("duration_days") as string) || null;
    const travel_budget_min = parseInt(formData.get("travel_budget_min") as string) || null;
    const travel_budget_max = parseInt(formData.get("travel_budget_max") as string) || null;
    const participation_fee = parseInt(formData.get("participation_fee") as string) || null;
    const financing_type = (formData.get("financing_type") as string) || null;

    const covers_rup_flights = formData.get("covers_rup_flights") === "on";
    const is_last_minute = formData.get("is_last_minute") === "on";
    const accommodation_covered = formData.get("accommodation_covered") === "on";

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

    const { error: insertError } = await supabase.from("projects").insert({
      org_id: user.id,
      title,
      description,
      project_type,
      dest_country,
      exact_location,
      official_url,
      target_profile,
      min_age,
      max_age,
      duration_days,
      travel_budget_min,
      travel_budget_max,
      participation_fee,
      covers_rup_flights,
      is_last_minute,
      accommodation_covered,
      themes,
      eligible_countries,
      financing_type,
      image_url: imageUrl,
      status: projectStatus,
    });

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
