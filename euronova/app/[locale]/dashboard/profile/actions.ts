"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteMyAccount() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "No estás autenticado." };
    }

    const { error } = await supabase.rpc('delete_user');
    if (error) throw error;

    await supabase.auth.signOut();
  } catch (error: unknown) {
    console.error("Failed to delete account:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete account." };
  }
  
  redirect("/login");
}

export async function updateProfile(prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No estás autenticado." };
  }

  const role = formData.get("role") as string;

  let avatar_url = undefined;
  const avatarFile = formData.get("avatar") as File | null;
  
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) return { error: `Error uploading avatar: ${uploadError.message}` };
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
      
    avatar_url = publicUrl;
  }

  if (role === "youth") {
    const full_name = formData.get("full_name") as string;
    const birth_date = formData.get("birth_date") as string;
    const country_code = formData.get("country_code") as string;
    const is_rup_region = formData.get("is_rup_region") === "true"; // Viene como string del input hidden o "on" del checkbox
    const bio = formData.get("bio") as string;
    const phone = formData.get("phone") as string;
    const languagesStr = formData.get("languages") as string;
    const languages = languagesStr ? languagesStr.split(",").map(s => s.trim()).filter(Boolean) : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      id: user.id,
      full_name: full_name || null,
      birth_date: birth_date || null,
      country_code: country_code || null,
      is_rup_region,
      bio: bio || null,
      phone: phone || null,
      languages: languages.length > 0 ? languages : null
    };
    
    if (avatar_url) payload.avatar_url = avatar_url;

    const { error } = await supabase
      .from("users_youth")
      .upsert(payload);

    if (error) return { error: error.message };
  } else if (role === "org") {
    const org_name = formData.get("org_name") as string;
    const oid_number = formData.get("oid_number") as string;
    const country_hq = formData.get("country_hq") as string;
    const description = formData.get("description") as string;
    const website = formData.get("website") as string;
    const contact_email = formData.get("contact_email") as string;
    const social_instagram = formData.get("social_instagram") as string;
    const social_tiktok = formData.get("social_tiktok") as string;
    const social_youtube = formData.get("social_youtube") as string;
    const social_linkedin = formData.get("social_linkedin") as string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      id: user.id,
      org_name: org_name || null,
      oid_number: oid_number || null,
      country_hq: country_hq || null,
      description: description || null,
      website: website || null,
      contact_email: contact_email || null,
      social_instagram: social_instagram || null,
      social_tiktok: social_tiktok || null,
      social_youtube: social_youtube || null,
      social_linkedin: social_linkedin || null,
      verification_status: 'pending'
    };
    
    if (avatar_url) payload.avatar_url = avatar_url;

    const { error } = await supabase
      .from("users_org")
      .upsert(payload);

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
