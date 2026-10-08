"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function verifyOrganization(orgId: string, formData?: FormData) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== "euronovaofficial@gmail.com") {
      return { error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("users_org")
      .update({ verification_status: "verified" })
      .eq("id", orgId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("RLS blocked the update or organization not found.");
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Verification failed:", error);
    return { error: error.message || "Failed to verify organization" };
  }
}
