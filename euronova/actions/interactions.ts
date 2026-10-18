"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface InteractionResult {
  success?: boolean;
  is_favorite?: boolean;
  is_applied?: boolean;
  error?: string;
  xpGained?: number;
  leveledUp?: boolean;
  newLevel?: number;
}

/**
 * Conmuta el estado de favorito (Guardado) de un proyecto para el usuario autenticado.
 */
export async function toggleProjectFavorite(projectId: string): Promise<InteractionResult> {
  try {
    if (!projectId || typeof projectId !== "string") {
      return { error: "Invalid project ID." };
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Authentication required to favorite projects." };
    }

    // Obtener la interacción actual
    const { data: existing, error: selectError } = await supabase
      .from("user_project_interactions")
      .select("is_favorite, is_applied")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .maybeSingle();

    if (selectError) {
      return { error: selectError.message };
    }

    const currentFavorite = existing?.is_favorite ?? false;
    const currentApplied = existing?.is_applied ?? false;
    const newFavorite = !currentFavorite;

    const { error: upsertError } = await supabase
      .from("user_project_interactions")
      .upsert(
        {
          user_id: user.id,
          project_id: projectId,
          is_favorite: newFavorite,
          is_applied: currentApplied,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,project_id" }
      );

    if (upsertError) {
      return { error: upsertError.message };
    }

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/my-missions");

    // Hito de tracción para la ONG organizadora cuando un voluntario guarda el proyecto
    if (newFavorite) {
      try {
        const { data: projData } = await supabase
          .from("projects")
          .select("org_id, title")
          .eq("id", projectId)
          .maybeSingle();

        if (projData?.org_id && projData.org_id !== user.id) {
          const { dispatchNotification } = await import("@/actions/notifications");
          await dispatchNotification({
            userId: projData.org_id,
            type: "alert",
            title: "Mission Traction Milestone",
            message: `Your project "${projData.title || "Mission"}" was bookmarked by a new volunteer!`,
            actionUrl: `/dashboard/organizations/${projData.org_id}/analytics`,
          });
        }
      } catch (notifErr) {
        console.warn("Could not dispatch favorite traction notification:", notifErr);
      }
    }

    return { success: true, is_favorite: newFavorite };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { error: message };
  }
}

/**
 * Conmuta el estado de postulación (Aplicado) de un proyecto para el usuario autenticado.
 */
export async function toggleProjectApplied(projectId: string): Promise<InteractionResult> {
  try {
    if (!projectId || typeof projectId !== "string") {
      return { error: "Invalid project ID." };
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Authentication required to track applications." };
    }

    // Obtener la interacción actual
    const { data: existing, error: selectError } = await supabase
      .from("user_project_interactions")
      .select("is_favorite, is_applied")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .maybeSingle();

    if (selectError) {
      return { error: selectError.message };
    }

    const currentFavorite = existing?.is_favorite ?? false;
    const currentApplied = existing?.is_applied ?? false;
    const newApplied = !currentApplied;

    const { error: upsertError } = await supabase
      .from("user_project_interactions")
      .upsert(
        {
          user_id: user.id,
          project_id: projectId,
          is_favorite: currentFavorite,
          is_applied: newApplied,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,project_id" }
      );

    if (upsertError) {
      return { error: upsertError.message };
    }

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/my-missions");

    let xpGained = 0;
    let leveledUp = false;
    let newLevel: number | undefined = undefined;

    if (newApplied) {
      try {
        const { awardUserXp } = await import("@/actions/gamification");
        const { XP_CONFIG } = await import("@/lib/gamification");
        const xpResult = await awardUserXp({
          amount: XP_CONFIG.APPLY_MISSION.amount,
          reason: XP_CONFIG.APPLY_MISSION.reason,
          actionType: XP_CONFIG.APPLY_MISSION.actionType,
          targetId: projectId,
        });

        if (xpResult.success && xpResult.gained) {
          xpGained = xpResult.gained;
          leveledUp = xpResult.leveledUp || false;
          newLevel = xpResult.level;
        }
      } catch (xpErr) {
        console.warn("Could not award XP for application:", xpErr);
      }

      // Recordatorio de intención para el voluntario y notificación de tracción para la ONG (EuroNova no es ATS)
      try {
        const { data: projData } = await supabase
          .from("projects")
          .select("org_id, title")
          .eq("id", projectId)
          .maybeSingle();

        const projectTitle = projData?.title || "Erasmus+ Mission";
        const { dispatchNotification } = await import("@/actions/notifications");

        // 1. Recordatorio para el joven voluntario
        await dispatchNotification({
          userId: user.id,
          type: "alert",
          title: "External Application Reminder",
          message: `You showed interest in "${projectTitle}". Make sure to complete the official external application form!`,
          actionUrl: `/dashboard/projects/${projectId}`,
        });

        // 2. Hito de tracción para la ONG responsable del proyecto
        if (projData?.org_id && projData.org_id !== user.id) {
          await dispatchNotification({
            userId: projData.org_id,
            type: "alert",
            title: "Mission Traction Milestone",
            message: `Your project "${projectTitle}" gained new traction! A volunteer expressed intent to apply externally.`,
            actionUrl: `/dashboard/organizations/${projData.org_id}/analytics`,
          });
        }
      } catch (notifErr) {
        console.warn("Could not dispatch application reminder notifications:", notifErr);
      }
    }

    return { 
      success: true, 
      is_applied: newApplied,
      xpGained,
      leveledUp,
      newLevel
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { error: message };
  }
}
