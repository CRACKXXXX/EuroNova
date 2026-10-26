"use server";

import { createClient } from "@/utils/supabase/server";

export interface RandomProjectResult {
  id?: string;
  error?: string;
}

/**
 * Retorna un ID aleatorio de un proyecto publicado.
 */
export async function getRandomProjectIdAction(): Promise<RandomProjectResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("status", "published")
      .limit(100);

    if (error) {
      return { error: error.message };
    }

    if (!data || data.length === 0) {
      return { error: "No published projects found." };
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    return { id: data[randomIndex].id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error occurred.";
    return { error: message };
  }
}
