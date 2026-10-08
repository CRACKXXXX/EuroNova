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

export async function revokeOrganization(orgId: string, formData?: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== "euronovaofficial@gmail.com") return { error: "Unauthorized" };

    const { data, error } = await supabase.from("users_org").update({ verification_status: "pending" }).eq("id", orgId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("RLS blocked the update or organization not found.");

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Revoke failed:", error);
    return { error: error.message || "Failed to revoke organization" };
  }
}

export async function deleteOrganization(orgId: string, formData?: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== "euronovaofficial@gmail.com") return { error: "Unauthorized" };

    const { data, error } = await supabase.from("users_org").delete().eq("id", orgId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("RLS blocked the delete or organization not found.");

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Delete failed:", error);
    return { error: error.message || "Failed to delete organization" };
  }
}
