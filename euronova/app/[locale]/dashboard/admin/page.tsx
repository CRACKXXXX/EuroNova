import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getUserRole, type UserRole } from "@/lib/roles";
import {
  AdminDashboardClient,
  OrgItem,
  YouthUserItem,
  ProjectItem,
  ReportItem,
} from "./AdminDashboardClient";
import type { AdminEscalationItem, StaffTicketItem } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function getAdminDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL environment variables."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function parsePage(param: string | number | string[] | undefined): number {
  if (typeof param === "number") {
    return isNaN(param) || param < 1 ? 1 : Math.floor(param);
  }
  const val = Array.isArray(param) ? param[0] : param;
  const num = parseInt(val || "1", 10);
  return isNaN(num) || num < 1 ? 1 : num;
}

export default async function AdminPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard");
  }

  // 1. Role-based verification using centralized role utility
  const currentUserRole: UserRole = await getUserRole(user.id, user.email);

  // Strict Panel Isolation: Route staff members to their dedicated panels
  if (currentUserRole === "moderator") {
    redirect("/dashboard/moderator-panel");
  }

  if (currentUserRole === "support") {
    redirect("/dashboard/support-panel");
  }

  const isAuthorizedAdmin = currentUserRole === "root" || currentUserRole === "admin";
  if (!isAuthorizedAdmin) {
    redirect("/dashboard");
  }

  const adminDb = getAdminDb();

  const searchParams = await props.searchParams;
  const t = await getTranslations("AdminPanel");

  const requestedTab = searchParams.tab as
    | "orgs"
    | "youth"
    | "projects"
    | "reports"
    | "staff"
    | "escalations"
    | "tickets"
    | undefined;

  let currentTab:
    | "orgs"
    | "youth"
    | "projects"
    | "reports"
    | "staff"
    | "escalations"
    | "tickets" = "orgs";

  currentTab = requestedTab || "orgs";

  const currentPage = parsePage(searchParams.page);

  // Strict 403 Guard: If user is not admin/root, deny access to restricted tabs
  if (
    (currentTab === "staff" || currentTab === "escalations") &&
    currentUserRole !== "admin" &&
    currentUserRole !== "root"
  ) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="bg-void-surface border border-nova-flare/40 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-nova-flare/10 border border-nova-flare/30 flex items-center justify-center text-nova-flare text-3xl font-black">
            403
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied: Admin Clearance Required</h2>
          <p className="text-sm text-gray-400 mb-6">
            The requested terminal is strictly restricted to Level 4 EuroNova System Administrators. Moderators and Support personnel cannot access this clearance level.
          </p>
          <Link
            href={currentUserRole === "support" ? "/dashboard/admin?tab=tickets" : "/dashboard/admin?tab=reports"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white hover:border-plasma-cyan/50 transition-colors text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Authorized Hub
          </Link>
        </div>
      </div>
    );
  }

  // 2. Dedicated count queries BEFORE fetching paginated data
  const [
    totalProjectsCountRes,
    totalPublishedProjectsCountRes,
    totalPendingProjectsCountRes,
    totalOrgsCountRes,
    totalPendingOrgsCountRes,
    totalVerifiedOrgsCountRes,
    totalYouthCountRes,
    totalStaffCountRes,
    totalEscalationsRes,
    totalPendingEscalationsRes,
    totalTicketsRes,
    totalPendingTicketsRes,
  ] = await Promise.all([
    adminDb.from("projects").select("*", { count: "exact", head: true }),
    adminDb.from("projects").select("*", { count: "exact", head: true }).eq("status", "published"),
    adminDb.from("projects").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    adminDb.from("users_org").select("*", { count: "exact", head: true }),
    adminDb
      .from("users_org")
      .select("*", { count: "exact", head: true })
      .or("verification_status.eq.pending,verification_status.is.null,verification_status.eq.rejected"),
    adminDb.from("users_org").select("*", { count: "exact", head: true }).eq("verification_status", "verified"),
    adminDb.from("users_youth").select("*", { count: "exact", head: true }),
    adminDb.from("users_youth").select("*", { count: "exact", head: true }).in("role", ["admin", "root", "moderator", "support"]),
    adminDb.from("admin_escalations").select("*", { count: "exact", head: true }),
    adminDb.from("admin_escalations").select("*", { count: "exact", head: true }).eq("status", "pending"),
    adminDb.from("support_tickets").select("*", { count: "exact", head: true }),
    adminDb.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "pending", "in_progress"]),
  ]);

  const totalProjects = totalProjectsCountRes.count ?? 0;
  const totalPublishedProjects = totalPublishedProjectsCountRes.count ?? 0;
  const totalPendingProjects = totalPendingProjectsCountRes.count ?? 0;
  const totalOrgs = totalOrgsCountRes.count ?? 0;
  const totalPendingOrgs = totalPendingOrgsCountRes.count ?? 0;
  const totalVerifiedOrgs = totalVerifiedOrgsCountRes.count ?? 0;
  const totalYouth = totalYouthCountRes.count ?? 0;
  const totalStaff = totalStaffCountRes.count ?? 0;
  const totalEscalations = totalEscalationsRes.count ?? 0;
  const totalPendingEscalations = totalPendingEscalationsRes.count ?? 0;
  const totalTickets = totalTicketsRes.count ?? 0;
  const totalPendingTickets = totalPendingTicketsRes.count ?? 0;

  // Defensive queries for project_reports table
  let totalReports = 0;
  let totalPendingReports = 0;
  try {
    const [reportsCountRes, pendingReportsCountRes] = await Promise.all([
      adminDb.from("project_reports").select("*", { count: "exact", head: true }),
      adminDb.from("project_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    totalReports = reportsCountRes.count ?? 0;
    totalPendingReports = pendingReportsCountRes.count ?? 0;
  } catch (err) {
    console.warn("Could not count project_reports:", err);
  }

  const activeTabTotal =
    currentTab === "staff"
      ? totalStaff
      : currentTab === "reports"
      ? totalReports
      : currentTab === "escalations"
      ? totalEscalations
      : currentTab === "tickets"
      ? totalTickets
      : currentTab === "projects"
      ? totalPublishedProjects
      : currentTab === "youth"
      ? totalYouth
      : totalVerifiedOrgs;

  const totalPages = Math.max(1, Math.ceil(activeTabTotal / PAGE_SIZE));

  // 3. Calculate 0-indexed range bounds for 50 items per page
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = currentPage * PAGE_SIZE - 1;

  // 4. Fetch paginated data slices using adminDb
  const [
    pendingOrgsDataRes,
    verifiedOrgsDataRes,
    youthUsersDataRes,
    pendingProjectsDataRes,
    publishedProjectsDataRes,
    reportsDataRes,
    escalationsDataRes,
    ticketsDataRes,
  ] = await Promise.all([
    adminDb
      .from("users_org")
      .select("*")
      .or("verification_status.eq.pending,verification_status.is.null,verification_status.eq.rejected")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    adminDb
      .from("users_org")
      .select("*")
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false })
      .range(currentTab === "orgs" ? from : 0, currentTab === "orgs" ? to : PAGE_SIZE - 1),
    adminDb
      .from("users_youth")
      .select("*")
      .order("created_at", { ascending: false })
      .range(currentTab === "youth" ? from : 0, currentTab === "youth" ? to : PAGE_SIZE - 1),
    adminDb
      .from("projects")
      .select("*, users_org(id, org_name, contact_email)")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    adminDb
      .from("projects")
      .select("*, users_org(id, org_name, contact_email)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(currentTab === "projects" ? from : 0, currentTab === "projects" ? to : PAGE_SIZE - 1),
    adminDb
      .from("project_reports")
      .select("*, projects(id, title, status, dest_country, project_type), users_org(id, org_name, verification_status, contact_email)")
      .order("created_at", { ascending: false })
      .range(currentTab === "reports" ? from : 0, currentTab === "reports" ? to : PAGE_SIZE - 1),
    adminDb
      .from("admin_escalations")
      .select("*")
      .order("created_at", { ascending: false })
      .range(currentTab === "escalations" ? from : 0, currentTab === "escalations" ? to : PAGE_SIZE - 1),
    adminDb
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .range(currentTab === "tickets" ? from : 0, currentTab === "tickets" ? to : PAGE_SIZE - 1),
  ]);

  const rawPendingOrgs = (pendingOrgsDataRes.data as OrgItem[]) || [];
  const rawVerifiedOrgs = (verifiedOrgsDataRes.data as OrgItem[]) || [];
  const rawYouthUsers = (youthUsersDataRes.data as YouthUserItem[]) || [];
  const rawPendingProjects = (pendingProjectsDataRes.data as ProjectItem[]) || [];
  const rawPublishedProjects = (publishedProjectsDataRes.data as ProjectItem[]) || [];
  const rawReports = (reportsDataRes.data as ReportItem[]) || [];
  const rawEscalations = (escalationsDataRes.data as AdminEscalationItem[]) || [];
  const rawTickets = (ticketsDataRes.data as StaffTicketItem[]) || [];

  // Extract unique organization, youth user, reporter, and reported user IDs for admin email resolution
  const uniqueOrgIds = Array.from(
    new Set([
      ...rawPendingOrgs.map((o) => o.id),
      ...rawVerifiedOrgs.map((o) => o.id),
      ...rawPendingProjects.map((p) => p.org_id).filter((id): id is string => Boolean(id)),
      ...rawPublishedProjects.map((p) => p.org_id).filter((id): id is string => Boolean(id)),
      ...rawYouthUsers.map((y) => y.id),
      ...rawReports.map((r) => r.reporter_id).filter((id): id is string => Boolean(id)),
      ...rawReports.map((r) => r.target_user_id).filter((id): id is string => Boolean(id)),
      ...rawTickets.map((t) => t.user_id).filter((id): id is string => Boolean(id)),
    ])
  );

  const emailsMap = new Map<string, string>();
  if (uniqueOrgIds.length > 0) {
    const { data: emailsData, error: emailsError } = await adminDb.rpc(
      "get_admin_user_emails",
      { user_ids: uniqueOrgIds }
    );

    if (!emailsError && Array.isArray(emailsData)) {
      emailsData.forEach((row: { user_id: string; email: string }) => {
        if (row.user_id && row.email) {
          emailsMap.set(row.user_id, row.email);
        }
      });
    }
  }

  // Resolve reporter & target user full names from users_youth
  const userIdsToLookup = Array.from(
    new Set([
      ...rawReports.map((r) => r.reporter_id).filter((id): id is string => Boolean(id)),
      ...rawReports.map((r) => r.target_user_id).filter((id): id is string => Boolean(id)),
      ...rawTickets.map((t) => t.user_id).filter((id): id is string => Boolean(id)),
      ...rawEscalations.map((e) => e.escalated_by).filter((id): id is string => Boolean(id)),
    ])
  );

  const youthNamesMap = new Map<string, string>();
  if (userIdsToLookup.length > 0) {
    const { data: youthsData } = await adminDb
      .from("users_youth")
      .select("id, full_name")
      .in("id", userIdsToLookup);

    if (youthsData && Array.isArray(youthsData)) {
      youthsData.forEach((y: { id: string; full_name: string | null }) => {
        if (y.id && y.full_name) {
          youthNamesMap.set(y.id, y.full_name);
        }
      });
    }
  }

  // Hydrate login_email into items
  const pendingOrgs: OrgItem[] = rawPendingOrgs.map((org) => ({
    ...org,
    login_email: emailsMap.get(org.id) || null,
  }));

  const verifiedOrgs: OrgItem[] = rawVerifiedOrgs.map((org) => ({
    ...org,
    login_email: emailsMap.get(org.id) || null,
  }));

  const youthUsers: YouthUserItem[] = rawYouthUsers.map((youth) => ({
    ...youth,
    email: emailsMap.get(youth.id) || youth.email || null,
  }));

  const pendingProjects: ProjectItem[] = rawPendingProjects.map((project) => ({
    ...project,
    login_email: project.org_id ? emailsMap.get(project.org_id) || null : null,
  }));

  const publishedProjects: ProjectItem[] = rawPublishedProjects.map((project) => ({
    ...project,
    login_email: project.org_id ? emailsMap.get(project.org_id) || null : null,
  }));

  const reports: ReportItem[] = rawReports.map((report) => ({
    ...report,
    reporter_name: report.reporter_id ? youthNamesMap.get(report.reporter_id) || null : null,
    reporter_email: report.reporter_id ? emailsMap.get(report.reporter_id) || null : null,
    target_user_name: report.target_name || (report.target_user_id ? youthNamesMap.get(report.target_user_id) || null : null),
    target_user_email: report.target_user_id ? emailsMap.get(report.target_user_id) || null : null,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b border-void-border pb-6">
        <div>
          <div className="mb-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-9 h-9 text-nova-flare shrink-0" />
            <span>{t("title")}</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">
            Signed in as [{currentUserRole.toUpperCase()}]
          </span>
          <span className="text-sm font-bold text-plasma-cyan font-mono">
            {user.email}
          </span>
        </div>
      </div>

      <AdminDashboardClient
        currentUserRole={currentUserRole}
        pendingOrgs={pendingOrgs}
        verifiedOrgs={verifiedOrgs}
        youthUsers={youthUsers}
        pendingProjects={pendingProjects}
        publishedProjects={publishedProjects}
        reports={reports}
        escalations={rawEscalations}
        totalEscalations={totalEscalations}
        totalPendingEscalations={totalPendingEscalations}
        tickets={rawTickets}
        totalTickets={totalTickets}
        totalPendingTickets={totalPendingTickets}
        totalProjects={totalProjects}
        totalOrgs={totalOrgs}
        totalYouth={totalYouth}
        totalStaff={totalStaff}
        totalPendingOrgs={totalPendingOrgs}
        totalVerifiedOrgs={totalVerifiedOrgs}
        totalPendingProjects={totalPendingProjects}
        totalPublishedProjects={totalPublishedProjects}
        totalReports={totalReports}
        totalPendingReports={totalPendingReports}
        currentPage={currentPage}
        totalPages={totalPages}
        currentTab={currentTab}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
