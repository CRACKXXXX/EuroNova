import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getUserRole, type UserRole } from "@/lib/roles";
import { SupportPanelClient } from "./SupportPanelClient";
import type { StaffTicketItem } from "../admin/actions";

export const dynamic = "force-dynamic";

function getAdminDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function SupportPanelPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, supabase] = await Promise.all([
    props.params,
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Role Guard: Strictly requires support, moderator, admin, or root
  const currentUserRole: UserRole = await getUserRole(user.id, user.email);
  if (
    currentUserRole !== "support" &&
    currentUserRole !== "moderator" &&
    currentUserRole !== "admin" &&
    currentUserRole !== "root"
  ) {
    redirect(`/${locale}/dashboard`);
  }

  const adminDb = getAdminDb();

  // Query Support Tickets
  const { data: ticketsData } = await adminDb
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const tickets = (ticketsData as StaffTicketItem[]) || [];

  return (
    <div className="w-full">
      <SupportPanelClient
        currentUserRole={currentUserRole}
        tickets={tickets}
        locale={locale}
      />
    </div>
  );
}
