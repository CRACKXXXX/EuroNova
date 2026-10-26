import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getUserRole, type UserRole } from "@/lib/roles";
import { ModeratorPanelClient } from "./ModeratorPanelClient";
import type { ReportItem } from "../admin/AdminDashboardClient";
import type { AdminEscalationItem } from "../admin/actions";

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

export default async function ModeratorPanelPage(props: {
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

  // Role Guard: Strictly requires moderator, admin, or root
  const currentUserRole: UserRole = await getUserRole(user.id, user.email);
  if (
    currentUserRole !== "moderator" &&
    currentUserRole !== "admin" &&
    currentUserRole !== "root"
  ) {
    redirect(`/${locale}/dashboard`);
  }

  const adminDb = getAdminDb();

  // Query Reports & Escalations
  const [reportsRes, escalationsRes] = await Promise.all([
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

  const reports = (reportsRes.data as ReportItem[]) || [];
  const escalations = (escalationsRes.data as AdminEscalationItem[]) || [];

  return (
    <div className="w-full">
      <ModeratorPanelClient
        currentUserRole={currentUserRole}
        reports={reports}
        escalations={escalations}
        locale={locale}
      />
    </div>
  );
}
