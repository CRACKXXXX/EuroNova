import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getUserRole, type UserRole } from "@/lib/roles";
import { SupportPanelClient } from "./SupportPanelClient";
import type { StaffTicketItem, AdminEscalationItem } from "../admin/actions";
import type { ReportItem } from "../admin/AdminDashboardClient";

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

  // Role Guard: Strictly requires support, admin, or root
  const currentUserRole: UserRole = await getUserRole(user.id, user.email);

  // If Moderator user attempts to access Support panel, redirect to their dedicated terminal
  if (currentUserRole === "moderator") {
    redirect(`/${locale}/dashboard/moderator-panel`);
  }

  if (
    currentUserRole !== "support" &&
    currentUserRole !== "admin" &&
    currentUserRole !== "root"
  ) {
    redirect(`/${locale}/dashboard`);
  }

  const adminDb = getAdminDb();

  // Query Support Tickets, Reports & Escalations in parallel
  const [ticketsRes, reportsRes, escalationsRes] = await Promise.all([
    adminDb
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    adminDb
      .from("project_reports")
      .select("*, projects(id, title, status, dest_country, project_type), users_org(id, org_name, verification_status, contact_email)")
      .order("created_at", { ascending: false })
      .limit(100),
    adminDb
      .from("admin_escalations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const tickets = (ticketsRes.data as StaffTicketItem[]) || [];
  const reports = (reportsRes.data as ReportItem[]) || [];
  const escalations = (escalationsRes.data as AdminEscalationItem[]) || [];

  return (
    <div className="w-full">
      <SupportPanelClient
        currentUserRole={currentUserRole}
        tickets={tickets}
        reports={reports}
        escalations={escalations}
        locale={locale}
      />
    </div>
  );
}
