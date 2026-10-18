"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
    if (!orgId || typeof orgId !== "string") {
      return { error: "Organization ID is required." };
    }

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return { error: "Rating must be an integer between 1 and 5." };
    }

    if (!reviewText || typeof reviewText !== "string" || reviewText.trim().length < 5) {
      return { error: "Review text must be at least 5 characters long." };
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You must be signed in to submit an organization review." };
    }

    // LÓGICA ANTI-SPAM: Verificar que el usuario pertenezca a users_youth
    const { data: youth, error: youthError } = await supabase
      .from("users_youth")
      .select("id, full_name, birth_date, country_code, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (youthError) {
      return { error: `Failed to verify youth profile: ${youthError.message}` };
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
          review_text: reviewText.trim(),
          created_at: new Date().toISOString(),
        },
        { onConflict: "org_id,author_id" }
      );

    if (insertError) {
      return { error: insertError.message };
    }

    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${orgId}`);

    let xpGained = 0;
    let leveledUp = false;
    let newLevel: number | undefined;

    try {
      const { awardUserXp } = await import("@/actions/gamification");
      const { XP_CONFIG } = await import("@/lib/gamification");
      const xpResult = await awardUserXp({
        amount: XP_CONFIG.NGO_REVIEW.amount,
        reason: XP_CONFIG.NGO_REVIEW.reason,
        actionType: XP_CONFIG.NGO_REVIEW.actionType,
        targetId: orgId,
      });

      if (xpResult.success && xpResult.gained) {
        xpGained = xpResult.gained;
        leveledUp = xpResult.leveledUp || false;
        newLevel = xpResult.level;
      }
    } catch (xpErr) {
      console.warn("Could not award XP for NGO review:", xpErr);
    }

    return { 
      success: true,
      xpGained,
      leveledUp,
      newLevel,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { error: message };
  }
}
