import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  AdminDashboardClient,
  OrgItem,
  YouthUserItem,
  ProjectItem,
} from "./AdminDashboardClient";

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

  if (!user || user.email !== "euronovaofficial@gmail.com") {
    redirect("/dashboard");
  }

  const adminDb = getAdminDb();

  const searchParams = await props.searchParams;
  const t = await getTranslations("AdminPanel");

  const currentTab = (searchParams.tab as "orgs" | "youth" | "projects") || "orgs";
  const currentPage = parsePage(searchParams.page);

  // 1. Dedicated count queries BEFORE fetching paginated data
  const [
    totalProjectsCountRes,
    totalPublishedProjectsCountRes,
    totalPendingProjectsCountRes,
    totalOrgsCountRes,
    totalPendingOrgsCountRes,
    totalVerifiedOrgsCountRes,
    totalYouthCountRes,
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
  ]);

  const totalProjects = totalProjectsCountRes.count ?? 0;
  const totalPublishedProjects = totalPublishedProjectsCountRes.count ?? 0;
  const totalPendingProjects = totalPendingProjectsCountRes.count ?? 0;
  const totalOrgs = totalOrgsCountRes.count ?? 0;
  const totalPendingOrgs = totalPendingOrgsCountRes.count ?? 0;
  const totalVerifiedOrgs = totalVerifiedOrgsCountRes.count ?? 0;
  const totalYouth = totalYouthCountRes.count ?? 0;

  const activeTabTotal =
    currentTab === "projects"
      ? totalPublishedProjects
      : currentTab === "youth"
      ? totalYouth
      : totalVerifiedOrgs;

  const totalPages = Math.max(1, Math.ceil(activeTabTotal / PAGE_SIZE));

  // 2. Calculate 0-indexed range bounds for 50 items per page
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = currentPage * PAGE_SIZE - 1;

  // 3. Fetch paginated data slices using adminDb
  const [
    pendingOrgsDataRes,
    verifiedOrgsDataRes,
    youthUsersDataRes,
    pendingProjectsDataRes,
    publishedProjectsDataRes,
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
      .select("*, users_org(org_name, contact_email)")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    adminDb
      .from("projects")
      .select("*, users_org(org_name, contact_email)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(currentTab === "projects" ? from : 0, currentTab === "projects" ? to : PAGE_SIZE - 1),
  ]);

  const rawPendingOrgs = (pendingOrgsDataRes.data as OrgItem[]) || [];
  const rawVerifiedOrgs = (verifiedOrgsDataRes.data as OrgItem[]) || [];
  const rawYouthUsers = (youthUsersDataRes.data as YouthUserItem[]) || [];
  const rawPendingProjects = (pendingProjectsDataRes.data as ProjectItem[]) || [];
  const rawPublishedProjects = (publishedProjectsDataRes.data as ProjectItem[]) || [];

  // Extract unique organization and youth user IDs for admin email resolution
  const uniqueOrgIds = Array.from(
    new Set([
      ...rawPendingOrgs.map((o) => o.id),
      ...rawVerifiedOrgs.map((o) => o.id),
      ...rawPendingProjects.map((p) => p.org_id).filter((id): id is string => Boolean(id)),
      ...rawPublishedProjects.map((p) => p.org_id).filter((id): id is string => Boolean(id)),
      ...rawYouthUsers.map((y) => y.id),
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
            Signed in as Admin
          </span>
          <span className="text-sm font-bold text-plasma-cyan font-mono">
            {user.email}
          </span>
        </div>
      </div>

      <AdminDashboardClient
        pendingOrgs={pendingOrgs}
        verifiedOrgs={verifiedOrgs}
        youthUsers={youthUsers}
        pendingProjects={pendingProjects}
        publishedProjects={publishedProjects}
        totalProjects={totalProjects}
        totalOrgs={totalOrgs}
        totalYouth={totalYouth}
        totalPendingOrgs={totalPendingOrgs}
        totalVerifiedOrgs={totalVerifiedOrgs}
        totalPendingProjects={totalPendingProjects}
        totalPublishedProjects={totalPublishedProjects}
        currentPage={currentPage}
        totalPages={totalPages}
        currentTab={currentTab}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
