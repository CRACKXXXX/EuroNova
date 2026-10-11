import { createClient } from "@/utils/supabase/server";
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

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== "euronovaofficial@gmail.com") {
    redirect("/dashboard");
  }

  const t = await getTranslations("AdminPanel");

  // Parallel data fetching for all 3 categories
  const [
    pendingOrgsResult,
    verifiedOrgsResult,
    youthUsersResult,
    pendingProjectsResult,
    publishedProjectsResult,
  ] = await Promise.all([
    supabase
      .from("users_org")
      .select("*")
      .or("verification_status.eq.pending,verification_status.is.null,verification_status.eq.rejected")
      .order("created_at", { ascending: false }),

    supabase
      .from("users_org")
      .select("*")
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false }),

    supabase
      .from("users_youth")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase
      .from("projects")
      .select("*, users_org(org_name, contact_email)")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false }),

    supabase
      .from("projects")
      .select("*, users_org(org_name, contact_email)")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
  ]);

  const rawPendingOrgs = (pendingOrgsResult.data as OrgItem[]) || [];
  const rawVerifiedOrgs = (verifiedOrgsResult.data as OrgItem[]) || [];
  const rawYouthUsers = (youthUsersResult.data as YouthUserItem[]) || [];
  const rawPendingProjects = (pendingProjectsResult.data as ProjectItem[]) || [];
  const rawPublishedProjects = (publishedProjectsResult.data as ProjectItem[]) || [];

  // Extract all unique organization and user IDs
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
    const { data: emailsData, error: emailsError } = await supabase.rpc(
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

  // Map login_email into items before passing to client
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
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
      />
    </div>
  );
}
