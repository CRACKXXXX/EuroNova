"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "User not authenticated" };
    }

    // Check if user is an org
    const { data: orgData, error: orgError } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", user.id)
      .single();

    if (orgError || !orgData) {
      return { error: "Only organizations can publish projects." };
    }

    let imageUrl = null;
    const imageFile = formData.get("cover_image") as File | null;
    
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('projects')
        .upload(fileName, imageFile, { upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('projects').getPublicUrl(fileName);
        imageUrl = publicUrl;
      } else {
        console.error("Upload error:", uploadError);
      }
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const project_type = formData.get("project_type") as string;
    const dest_country = formData.get("dest_country") as string;
    const exact_location = formData.get("exact_location") as string;
    const official_url = formData.get("official_url") as string;
    const target_profile = formData.get("target_profile") as string;

    const min_age = parseInt(formData.get("min_age") as string) || 18;
    const max_age = parseInt(formData.get("max_age") as string) || 30;
    const duration_days = parseInt(formData.get("duration_days") as string) || null;
    const travel_budget_min = parseInt(formData.get("travel_budget_min") as string) || null;
    const travel_budget_max = parseInt(formData.get("travel_budget_max") as string) || null;
    const participation_fee = parseInt(formData.get("participation_fee") as string) || null;
    const financing_type = formData.get("financing_type") as string;

    const covers_rup_flights = formData.get("covers_rup_flights") === "on";
    const is_last_minute = formData.get("is_last_minute") === "on";
    const accommodation_covered = formData.get("accommodation_covered") === "on";

    const themesString = formData.get("themes") as string;
    const themes = themesString ? themesString.split(",").map((t) => t.trim()) : [];
    
    const eligibleCountriesStr = formData.get("eligible_countries") as string;
    const eligible_countries = eligibleCountriesStr ? eligibleCountriesStr.split(",").map((c) => c.trim()) : [];

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
      status: 'active'
    });

    if (insertError) {
      return { error: insertError.message || "Failed to insert project into database." };
    }

    revalidatePath("/", "layout");
    return { success: true };
    
  } catch (error: unknown) {
    console.error("Unhandled error in createProject:", error);
    return { error: error instanceof Error ? error.message : "An unexpected error occurred while publishing the project." };
  }
}
