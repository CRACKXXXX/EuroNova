"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";
import { ReviewSubmissionSchema } from "@/lib/schemas";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export interface ReviewResult {
  success?: boolean;
  error?: string;
  xpGained?: number;
  leveledUp?: boolean;
  newLevel?: number;
}

/**
 * Registra o actualiza una reseña sobre una organización con control anti-spam estricto.
 */
export async function submitOrgReview(
  orgId: string,
  rating: number,
  reviewText: string
): Promise<ReviewResult> {
  try {
    // 1. Zod double-layer schema validation
    const parsed = ReviewSubmissionSchema.safeParse({ orgId, rating, reviewText });
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid review parameters.";
      return { error: issue };
    }

    const cleanReviewText = stripDangerousHtml(parsed.data.reviewText, 2000);
    if (cleanReviewText.length < 5) {
      return { error: "Review text must be at least 5 characters long after sanitization." };
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You must be signed in to submit an organization review." };
    }

    // Rate Limiting Gate (Sliding Window by User ID)
    const rateCheck = await checkRateLimit(user.id, RATE_LIMITS.MUTATION);
    if (!rateCheck.success) {
      return {
        error: rateCheck.error || "Rate limit exceeded. Please wait before submitting another review.",
      };
    }

    // LÓGICA ANTI-SPAM: Verificar que el usuario pertenezca a users_youth
    const { data: youth, error: youthError } = await supabase
      .from("users_youth")
      .select("id, full_name, birth_date, country_code, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (youthError) {
      return { error: sanitizeErrorMessage(youthError) };
    }

    if (!youth) {
      return { error: "Only verified youth participants can submit organization reviews." };
    }

    // Verificar que los campos esenciales no sean nulos o vacíos
    if (!youth.full_name?.trim() || !youth.birth_date || !youth.country_code?.trim()) {
      return {
        error: "Your profile is incomplete. Please complete your profile details before submitting a review.",
      };
    }

    // Verificar antigüedad de la cuenta: >= 7 días
    const createdAtTime = new Date(youth.created_at).getTime();
    const currentTime = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (currentTime - createdAtTime < sevenDaysInMs) {
      return {
        error: "Anti-spam protection: Your account must be at least 7 days old to review an organization.",
      };
    }

    // Verificar que la organización exista
    const { data: org, error: orgError } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !org) {
      return { error: "The targeted organization does not exist." };
    }

    if (org.id === user.id) {
      return { error: "Organizations cannot review themselves." };
    }

    // UPSERT en la tabla org_reviews
    const { error: insertError } = await supabase
      .from("org_reviews")
      .upsert(
        {
          org_id: orgId,
          author_id: user.id,
          rating: Math.round(rating),
          review_text: cleanReviewText,
          created_at: new Date().toISOString(),
        },
        { onConflict: "org_id,author_id" }
      );

    if (insertError) {
      return { error: sanitizeErrorMessage(insertError) };
    }

    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${orgId}`);

    let xpGained = 0;
    let leveledUp = false;
    let newLevel: number | undefined;

    try {
      const [{ awardUserXp }, { XP_CONFIG }] = await Promise.all([
        import("@/actions/gamification"),
        import("@/lib/gamification"),
      ]);
      const xpResult = await awardUserXp({
        amount: XP_CONFIG.NGO_REVIEW.amount,
        reason: XP_CONFIG.NGO_REVIEW.reason,
        actionType: XP_CONFIG.NGO_REVIEW.actionType,
        targetId: orgId,
        trustBoost: XP_CONFIG.NGO_REVIEW.trustBoost,
      });

      if (xpResult.success && xpResult.gained) {
        xpGained = xpResult.gained;
        leveledUp = xpResult.leveledUp || false;
        newLevel = xpResult.level;
      }
    } catch (xpErr) {
      console.error("Could not award XP for NGO review:", xpErr);
    }

    return { 
      success: true,
      xpGained,
      leveledUp,
      newLevel,
    };
  } catch (err: unknown) {
    return { error: sanitizeErrorMessage(err) };
  }
}
