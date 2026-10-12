"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface InteractionResult {
  success?: boolean;
  is_favorite?: boolean;
  is_applied?: boolean;
  error?: string;
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

    return { success: true, is_applied: newApplied };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { error: message };
  }
}
