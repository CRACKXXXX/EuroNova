"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/roles";
import { sanitizeErrorMessage } from "@/lib/errorSanitizer";

export async function deleteProjectAction(projectId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "User not authenticated" };
    }

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("org_id")
      .eq("id", projectId)
      .maybeSingle();

    if (fetchError || !project) {
      return { error: "Project not found" };
    }

    // Check permissions: Owner NGO or Root/Admin
    const role = await getUserRole(user.id, user.email);
    const isElevated =
      role === "admin" ||
      role === "root" ||
      user.email === "euronovaofficial@gmail.com";

    if (user.id !== project.org_id && !isElevated) {
      return { error: "Unauthorized: You do not have permission to delete this project." };
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      return { error: sanitizeErrorMessage(deleteError) };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard/projects");
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return { error: sanitizeErrorMessage(err) };
  }
}
