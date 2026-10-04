"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No estás autenticado." };
  }

  const role = formData.get("role") as string;

  if (role === "youth") {
    const full_name = formData.get("full_name") as string;
    const birth_date = formData.get("birth_date") as string;
    const country_code = formData.get("country_code") as string;
    const is_rup_region = formData.get("is_rup_region") === "true"; // Viene como string del input hidden o "on" del checkbox
    const bio = formData.get("bio") as string;
    const phone = formData.get("phone") as string;
    const languagesStr = formData.get("languages") as string;
    const languages = languagesStr ? languagesStr.split(",").map(s => s.trim()).filter(Boolean) : [];

    const { error } = await supabase
      .from("users_youth")
      .upsert({
        id: user.id,
        full_name: full_name || null,
        birth_date: birth_date || null,
        country_code: country_code || null,
        is_rup_region,
        bio: bio || null,
        phone: phone || null,
        languages: languages.length > 0 ? languages : null
      });

    if (error) return { error: error.message };
  } else if (role === "org") {
    const org_name = formData.get("org_name") as string;
    const oid_number = formData.get("oid_number") as string;
    const country_hq = formData.get("country_hq") as string;
    const description = formData.get("description") as string;
    const website = formData.get("website") as string;
    const contact_email = formData.get("contact_email") as string;

    const { error } = await supabase
      .from("users_org")
      .upsert({
        id: user.id,
        org_name: org_name || null,
        oid_number: oid_number || null,
        country_hq: country_hq || null,
        description: description || null,
        website: website || null,
        contact_email: contact_email || null,
        verification_status: 'pending'
      });

    if (error) return { error: error.message };
  }

  let updatedData = null;

  if (role === "youth") {
    const { data } = await supabase.from("users_youth").select("*").eq("id", user.id).single();
    updatedData = data;
  } else {
    const { data } = await supabase.from("users_org").select("*").eq("id", user.id).single();
    updatedData = data;
  }

  revalidatePath('/dashboard/profile', 'page');
  return { success: "¡Perfil actualizado con éxito!", data: updatedData };
}
