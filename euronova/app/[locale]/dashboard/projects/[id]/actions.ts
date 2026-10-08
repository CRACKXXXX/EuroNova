"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteProjectAction(projectId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not authenticated" };
  }

  // Fetch project
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) {
    return { error: "Project not found" };
  }

  // Check permissions: Owner or Admin
  if (user.id !== project.org_id && user.email !== "euronovaofficial@gmail.com") {
    return { error: "Unauthorized: You do not have permission to delete this project." };
  }

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard/projects");
}
