"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";

export type ProfileActionState = {
  success?: string;
  error?: string;
  data?: Record<string, unknown> | null;
} | null;

const youthProfileSchema = z.object({
  full_name: z.string().trim().optional().or(z.literal("")).nullable(),
  birth_date: z.string().trim().optional().or(z.literal("")).nullable(),
  country_code: z.string().trim().optional().or(z.literal("")).nullable(),
  is_rup_region: z.boolean().default(false),
  bio: z.string().trim().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().optional().or(z.literal("")).nullable(),
  languages: z.string().trim().optional().or(z.literal("")).nullable(),
  notification_email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  discord_webhook_url: z.string().trim().url().optional().or(z.literal("")).nullable(),
});

const orgProfileSchema = z.object({
  org_name: z.string().trim().optional().or(z.literal("")).nullable(),
  oid_number: z.string().trim().optional().or(z.literal("")).nullable(),
  country_hq: z.string().trim().optional().or(z.literal("")).nullable(),
  description: z.string().trim().optional().or(z.literal("")).nullable(),
  website: z.string().trim().optional().or(z.literal("")).nullable(),
  contact_email: z.string().trim().optional().or(z.literal("")).nullable(),
  social_instagram: z.string().trim().optional().or(z.literal("")).nullable(),
  social_tiktok: z.string().trim().optional().or(z.literal("")).nullable(),
  social_youtube: z.string().trim().optional().or(z.literal("")).nullable(),
  social_linkedin: z.string().trim().optional().or(z.literal("")).nullable(),
  notification_email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  discord_webhook_url: z.string().trim().url().optional().or(z.literal("")).nullable(),
});

interface YouthUpdatePayload {
  id: string;
  full_name: string | null;
  birth_date: string | null;
  country_code: string | null;
  is_rup_region: boolean;
  bio: string | null;
  phone: string | null;
  languages: string[] | null;
  notification_email?: string | null;
  discord_webhook_url?: string | null;
  avatar_url?: string;
}

interface OrgUpdatePayload {
  id: string;
  org_name: string | null;
  oid_number: string | null;
  country_hq: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  social_linkedin: string | null;
  notification_email?: string | null;
  discord_webhook_url?: string | null;
  verification_status?: string;
  avatar_url?: string;
}

function sanitizeOptionalString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeLanguages(value: string | null | undefined): string[] | null {
  if (!value) return null;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

export async function deleteMyAccount(): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "No estás autenticado." };
    }

    const { error } = await supabase.rpc("delete_user");
    if (error) {
      return { error: sanitizeErrorMessage(error) };
    }

    await supabase.auth.signOut();
  } catch (error: unknown) {
    console.error("Failed to delete account:", error);
    return {
      error: sanitizeErrorMessage(error),
    };
  }

  redirect("/login");
}

export async function updateProfile(
  prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "No estás autenticado." };
    }

    const role = formData.get("role")?.toString();
    if (role !== "youth" && role !== "org") {
      return { error: "Rol no válido." };
    }

    let avatar_url: string | undefined = undefined;
    const avatarFile = formData.get("avatar") as File | null;

    if (
      avatarFile &&
      typeof avatarFile === "object" &&
      "size" in avatarFile &&
      avatarFile.size > 0
    ) {
      const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // Strictly 1MB limit
      if (avatarFile.size > MAX_AVATAR_SIZE) {
        return { error: "File is too large. Maximum allowed size is 1MB." };
      }

      const fileExt = avatarFile.name ? avatarFile.name.split(".").pop() || "png" : "png";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        return { error: sanitizeErrorMessage(uploadError) };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      avatar_url = publicUrl;
    }

    let xpGained = 0;
    let leveledUp = false;
    let newLevel: number | undefined;

    if (role === "youth") {
      const rawData = {
        full_name: formData.get("full_name")?.toString() ?? "",
        birth_date: formData.get("birth_date")?.toString() ?? "",
        country_code: formData.get("country_code")?.toString() ?? "",
        is_rup_region: formData.get("is_rup_region") === "true",
        bio: formData.get("bio")?.toString() ?? "",
        phone: formData.get("phone")?.toString() ?? "",
        languages: formData.get("languages")?.toString() ?? "",
        notification_email: formData.get("notification_email")?.toString() ?? "",
        discord_webhook_url: formData.get("discord_webhook_url")?.toString() ?? "",
      };

      const parsed = youthProfileSchema.safeParse(rawData);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((issue) => issue.message).join(", ");
        return { error: errorMsg || "Datos de perfil no válidos." };
      }

      const {
        full_name,
        birth_date,
        country_code,
        is_rup_region,
        bio,
        phone,
        languages: rawLanguages,
        notification_email,
        discord_webhook_url,
      } = parsed.data;

      const payload: YouthUpdatePayload = {
        id: user.id,
        full_name: sanitizeOptionalString(full_name),
        birth_date: sanitizeOptionalString(birth_date),
        country_code: sanitizeOptionalString(country_code),
        is_rup_region: Boolean(is_rup_region),
        bio: sanitizeOptionalString(bio),
        phone: sanitizeOptionalString(phone),
        languages: sanitizeLanguages(rawLanguages),
        notification_email: sanitizeOptionalString(notification_email),
        discord_webhook_url: sanitizeOptionalString(discord_webhook_url),
      };

      if (avatar_url) {
        payload.avatar_url = avatar_url;
      }

      const { error } = await supabase.from("users_youth").upsert(payload);

      if (error) {
        return { error: error.message };
      }

      // Recompensa única de XP por completar el dossier de perfil (Anti-farming blindado)
      try {
        const { awardUserXp } = await import("@/actions/gamification");
        const { XP_CONFIG } = await import("@/lib/gamification");
        const hasCoreData = Boolean(
          payload.full_name && 
          (payload.country_code || payload.bio || (payload.languages && payload.languages.length > 0))
        );

        if (hasCoreData) {
          const xpResult = await awardUserXp({
            amount: XP_CONFIG.PROFILE_COMPLETION.amount,
            reason: XP_CONFIG.PROFILE_COMPLETION.reason,
            actionType: XP_CONFIG.PROFILE_COMPLETION.actionType,
            targetId: XP_CONFIG.PROFILE_COMPLETION.targetId,
            trustBoost: XP_CONFIG.PROFILE_COMPLETION.trustBoost,
          });

          if (xpResult.success && xpResult.gained) {
            xpGained = xpResult.gained;
            leveledUp = xpResult.leveledUp || false;
            newLevel = xpResult.level;
          }
        }
      } catch (xpErr) {
        console.warn("Could not award XP for profile completion:", xpErr);
      }
    } else {
      const rawData = {
        org_name: formData.get("org_name")?.toString() ?? "",
        oid_number: formData.get("oid_number")?.toString() ?? "",
        country_hq: formData.get("country_hq")?.toString() ?? "",
        description: formData.get("description")?.toString() ?? "",
        website: formData.get("website")?.toString() ?? "",
        contact_email: formData.get("contact_email")?.toString() ?? "",
        social_instagram: formData.get("social_instagram")?.toString() ?? "",
        social_tiktok: formData.get("social_tiktok")?.toString() ?? "",
        social_youtube: formData.get("social_youtube")?.toString() ?? "",
        social_linkedin: formData.get("social_linkedin")?.toString() ?? "",
        notification_email: formData.get("notification_email")?.toString() ?? "",
        discord_webhook_url: formData.get("discord_webhook_url")?.toString() ?? "",
      };

      const parsed = orgProfileSchema.safeParse(rawData);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((issue) => issue.message).join(", ");
        return { error: errorMsg || "Datos de organización no válidos." };
      }

      const {
        org_name,
        oid_number,
        country_hq,
        description,
        website,
        contact_email,
        social_instagram,
        social_tiktok,
        social_youtube,
        social_linkedin,
        notification_email,
        discord_webhook_url,
      } = parsed.data;

      const payload: OrgUpdatePayload = {
        id: user.id,
        org_name: sanitizeOptionalString(org_name),
        oid_number: sanitizeOptionalString(oid_number),
        country_hq: sanitizeOptionalString(country_hq),
        description: sanitizeOptionalString(description),
        website: sanitizeOptionalString(website),
        contact_email: sanitizeOptionalString(contact_email),
        social_instagram: sanitizeOptionalString(social_instagram),
        social_tiktok: sanitizeOptionalString(social_tiktok),
        social_youtube: sanitizeOptionalString(social_youtube),
        social_linkedin: sanitizeOptionalString(social_linkedin),
        notification_email: sanitizeOptionalString(notification_email),
        discord_webhook_url: sanitizeOptionalString(discord_webhook_url),
        verification_status: "pending",
      };

      if (avatar_url) {
        payload.avatar_url = avatar_url;
      }

      const { error } = await supabase.from("users_org").upsert(payload);

      if (error) {
        return { error: error.message };
      }
    }

    let updatedData: Record<string, unknown> | null = null;

    if (role === "youth") {
      const { data } = await supabase
        .from("users_youth")
        .select("*")
        .eq("id", user.id)
        .single();
      updatedData = {
        ...(data as Record<string, unknown> | null),
        xpGained,
        leveledUp,
        newLevel,
      };
    } else {
      const { data } = await supabase
        .from("users_org")
        .select("*")
        .eq("id", user.id)
        .single();
      updatedData = data as Record<string, unknown> | null;
    }

    revalidatePath("/dashboard/profile", "page");
    return { success: "¡Perfil actualizado con éxito!", data: updatedData };
  } catch (error: unknown) {
    console.error("Profile update failed:", error);
    return {
      error: sanitizeErrorMessage(error),
    };
  }
}
