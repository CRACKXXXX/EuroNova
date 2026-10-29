"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { validateSafeHttpsUrl, stripDangerousHtml } from "@/lib/securitySanitizer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export type ProfileActionState = {
  success?: string;
  error?: string;
  data?: Record<string, unknown> | null;
} | null;

const noNullBytes = (val: string | null | undefined): boolean =>
  !val || !val.includes("\u0000");

const youthProfileSchema = z.object({
  full_name: z.string().trim().max(100).refine(noNullBytes, "Full name cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  birth_date: z.string().trim().optional().or(z.literal("")).nullable(),
  country_code: z.string().trim().max(10).refine(noNullBytes, "Country code cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  is_rup_region: z.boolean().default(false),
  bio: z.string().trim().max(2000).refine(noNullBytes, "Bio cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(30).refine(noNullBytes, "Phone cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  languages: z.string().trim().max(200).refine(noNullBytes, "Languages cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  notification_email: z.string().trim().email().max(120).optional().or(z.literal("")).nullable(),
  discord_webhook_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine((val) => !val || validateSafeHttpsUrl(val, { allowDiscordWebhookOnly: true }).isValid, {
      message: "Discord Webhook URL must be a valid HTTPS webhook from discord.com.",
    }),
});

const orgProfileSchema = z.object({
  org_name: z.string().trim().max(150).refine(noNullBytes, "Organization name cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  oid_number: z.string().trim().max(50).refine(noNullBytes, "OID number cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  country_hq: z.string().trim().max(10).refine(noNullBytes, "Country HQ cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  description: z.string().trim().max(5000).refine(noNullBytes, "Description cannot contain null bytes.").optional().or(z.literal("")).nullable(),
  website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine((val) => !val || validateSafeHttpsUrl(val).isValid, {
      message: "Website URL must use a safe HTTPS protocol without pointing to internal IP addresses.",
    }),
  contact_email: z.string().trim().email().max(120).optional().or(z.literal("")).nullable(),
  social_instagram: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine((val) => !val || validateSafeHttpsUrl(val).isValid, {
      message: "Instagram URL must use a safe HTTPS protocol.",
    }),
  social_tiktok: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine((val) => !val || validateSafeHttpsUrl(val).isValid, {
      message: "TikTok URL must use a safe HTTPS protocol.",
    }),
  social_youtube: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine((val) => !val || validateSafeHttpsUrl(val).isValid, {
      message: "YouTube URL must use a safe HTTPS protocol.",
    }),
  social_linkedin: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine((val) => !val || validateSafeHttpsUrl(val).isValid, {
      message: "LinkedIn URL must use a safe HTTPS protocol.",
    }),
  notification_email: z.string().trim().email().max(120).optional().or(z.literal("")).nullable(),
  discord_webhook_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine((val) => !val || validateSafeHttpsUrl(val, { allowDiscordWebhookOnly: true }).isValid, {
      message: "Discord Webhook URL must be a valid HTTPS webhook from discord.com.",
    }),
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

function sanitizeOptionalString(value: string | null | undefined, maxLength = 2000): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = stripDangerousHtml(value, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeLanguages(value: string | null | undefined): string[] | null {
  if (!value) return null;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

import { createClient as createAdminClient, SupabaseClient } from "@supabase/supabase-js";

function getPrivilegedAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Privileged service configuration is missing.");
  }
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface DataExportResult {
  success?: boolean;
  error?: string;
  filename?: string;
  data?: string;
}

/**
 * GDPR Article 20 - Right to Data Portability
 * Compiles a structured, machine-readable JSON archive of all personal records.
 */
export async function exportMyData(): Promise<DataExportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Authentication required to export personal data." };
    }

    const userId = user.id;

    // Concurrently fetch all personal data belonging to the authenticated user
    const [
      youthRes,
      orgRes,
      interactionsRes,
      notificationsRes,
      threadsRes,
      postsRes,
      messagesRes,
      ticketsRes,
      applicationsRes,
      reviewsRes,
    ] = await Promise.all([
      supabase.from("users_youth").select("*").eq("id", userId).maybeSingle(),
      supabase.from("users_org").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_project_interactions").select("*").eq("user_id", userId),
      supabase.from("notifications").select("*").eq("user_id", userId),
      supabase.from("global_forum_threads").select("id, category_id, title, content, views, reply_count, created_at").eq("user_id", userId),
      supabase.from("global_forum_posts").select("id, thread_id, content, created_at").eq("user_id", userId),
      supabase.from("project_forum_messages").select("id, project_id, content, created_at").eq("user_id", userId),
      supabase.from("support_tickets").select("id, subject, reason, content, status, created_at, resolved_at").eq("user_id", userId),
      supabase.from("applications").select("*").eq("youth_id", userId),
      supabase.from("reviews").select("*").eq("youth_id", userId),
    ]);

    const exportArchive = {
      metadata: {
        export_timestamp_utc: new Date().toISOString(),
        gdpr_compliance_article: "Article 20 — Right to Data Portability (EU GDPR 2016/679)",
        platform: "EuroNova European Youth Mobility Gateway",
        user_id: userId,
        format_version: "2026-v1",
      },
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        metadata: user.user_metadata || {},
      },
      profile: {
        youth: youthRes.data || null,
        organization: orgRes.data || null,
      },
      activity: {
        project_interactions: interactionsRes.data || [],
        notifications: notificationsRes.data || [],
        applications: applicationsRes.data || [],
        reviews: reviewsRes.data || [],
        support_tickets: ticketsRes.data || [],
      },
      forum_contributions: {
        global_threads: threadsRes.data || [],
        global_posts: postsRes.data || [],
        project_messages: messagesRes.data || [],
      },
    };

    const filename = `euronova-data-export-${userId.slice(0, 8)}-${Date.now()}.json`;
    const jsonString = JSON.stringify(exportArchive, null, 2);

    return {
      success: true,
      filename,
      data: jsonString,
    };
  } catch (err: unknown) {
    console.error("exportMyData failed:", err);
    return {
      error: sanitizeErrorMessage(err),
    };
  }
}

/**
 * GDPR Article 17 - Atomic Right to Erasure ("Delete My Account")
 * Anonymizes community discussions to Ghost User, purges all PII, and wipes auth credentials.
 */
export async function deleteMyAccount(): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Authentication required to perform account erasure." };
    }

    const userId = user.id;

    // Prevent deletion of root master administrator
    if (user.email === "euronovaofficial@gmail.com") {
      return { error: "Security Exception: The Root Master Administrator account cannot be deleted." };
    }

    const adminDb = getPrivilegedAdminClient();

    // 1. Resolve or verify Ghost User for forum preservation
    let ghostId = "554ec183-ced5-4e1c-9aee-a94ca1d51ec4";
    const { data: ghostCheck } = await adminDb
      .from("users_youth")
      .select("id")
      .eq("id", ghostId)
      .maybeSingle();

    if (!ghostCheck) {
      const { data: ghostByEmail } = await adminDb
        .from("users_youth")
        .select("id")
        .eq("email", "archive-anonymized@euronova.internal")
        .maybeSingle();

      if (ghostByEmail?.id) {
        ghostId = ghostByEmail.id;
      }
    }

    // 2. Anonymize all authored forum discussions (Art. 17 Forum Integrity Preservation)
    await Promise.all([
      adminDb
        .from("global_forum_threads")
        .update({
          user_id: ghostId,
          author_name: "Deleted User",
          author_avatar: null,
        })
        .eq("user_id", userId),

      adminDb
        .from("global_forum_posts")
        .update({
          user_id: ghostId,
          author_name: "Deleted User",
          author_avatar: null,
        })
        .eq("user_id", userId),

      adminDb
        .from("project_forum_messages")
        .update({
          user_id: ghostId,
          author_name: "Deleted User",
          avatar_url: null,
        })
        .eq("user_id", userId),
    ]);

    // 3. Purge direct personal activities & interactions
    await Promise.all([
      adminDb.from("notifications").delete().eq("user_id", userId),
      adminDb.from("user_project_interactions").delete().eq("user_id", userId),
      adminDb.from("applications").delete().eq("youth_id", userId),
      adminDb.from("reviews").delete().eq("youth_id", userId),
    ]);

    // 4. Scrub support tickets PII
    await adminDb
      .from("support_tickets")
      .update({
        email: "deleted-user@anonymized.internal",
        phone: null,
        content: "[Inquiry content purged pursuant to GDPR Art. 17 right to erasure]",
      })
      .eq("user_id", userId);

    // 5. Delete public relational profiles
    await Promise.all([
      adminDb.from("users_youth").delete().eq("id", userId),
      adminDb.from("users_org").delete().eq("id", userId),
    ]);

    // 6. Delete underlying auth user to permanently wipe credentials
    const { error: authError } = await adminDb.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("auth.admin.deleteUser failed:", authError);
      return { error: sanitizeErrorMessage(authError) };
    }

    // 7. Clear local session cookies
    await supabase.auth.signOut();

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to execute atomic account erasure:", error);
    return {
      error: sanitizeErrorMessage(error),
    };
  }
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

    // Rate Limiting Gate (Sliding Window per User)
    const rateCheck = await checkRateLimit(user.id, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return { error: rateCheck.error || "Demasiadas peticiones de actualización. Por favor, espera." };
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
      const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // Strictly 5MB limit
      if (avatarFile.size > MAX_AVATAR_SIZE) {
        return { error: "File is too large. Maximum allowed size is 5MB." };
      }

      const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (avatarFile.type && !ALLOWED_MIME_TYPES.includes(avatarFile.type)) {
        return { error: "Invalid file format. Only JPG, PNG, WEBP, and GIF images are allowed." };
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
        const [{ awardUserXp }, { XP_CONFIG }] = await Promise.all([
          import("@/actions/gamification"),
          import("@/lib/gamification"),
        ]);
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
        console.error("Could not award XP for profile completion:", xpErr);
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
        .maybeSingle();
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
        .maybeSingle();
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
