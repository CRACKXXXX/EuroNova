import { createClient } from "@/utils/supabase/server";
import { Rocket, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Suspense } from "react";
import { RandomMissionButton } from "@/components/RandomMissionButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProjectsViewManager } from "@/components/ProjectsViewManager";
import { ScrollRestorationHelper } from "@/components/ScrollRestorationHelper";

export const dynamic = "force-dynamic";

export default async function ProjectsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const t = await getTranslations("DashboardContent");
  const supabase = await createClient();

  const q = searchParams.q as string | undefined;
  const dest = searchParams.dest as string | undefined;
  const eligible = searchParams.eligible as string | undefined;
  const types = searchParams.types as string | undefined;
  const targetProfile = searchParams.target_profile as string | undefined;
  const themes = searchParams.themes as string | undefined;
  const duration = searchParams.duration as string | undefined;
  const minBudget = searchParams.min_budget as string | undefined;
  const maxBudget = searchParams.max_budget as string | undefined;
  const maxFee = searchParams.max_fee as string | undefined;
  const accommodation = searchParams.accommodation === "true";
  const rup = searchParams.rup === "true";
  const lastMinute = searchParams.last_minute === "true";
  const favorites = searchParams.favorites === "true";

  // Check authentication if favorites filter is requested
  const { data: { user } } = await supabase.auth.getUser();
  if (favorites && !user) {
    redirect("/login");
  }

  const minAge = searchParams.min_age as string | undefined;
  const maxAge = searchParams.max_age as string | undefined;
  const startDate = searchParams.start_date as string | undefined;
  const endDate = searchParams.end_date as string | undefined;
  const funding = searchParams.funding as string | undefined;

  // Pagination & Sorting parameters
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const parsedPage = parseInt(pageParam || "1", 10);
  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const sortParam = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;
  const sort = sortParam || "newest";

  const limit = 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = favorites && user
    ? supabase
        .from("projects")
        .select("*, users_org(org_name, verification_status, avatar_url), user_project_interactions!inner(is_favorite, user_id)", { count: "exact" })
        .eq("status", "published")
        .eq("user_project_interactions.user_id", user.id)
        .eq("user_project_interactions.is_favorite", true)
    : supabase
        .from("projects")
        .select("*, users_org(org_name, verification_status, avatar_url)", { count: "exact" })
        .eq("status", "published");

  if (q) query = query.ilike("title", `%${q}%`);

  // Array filters (if they are passed as comma-separated strings)
  if (dest) {
    const destArr = dest.split(",");
    query = query.in("dest_country", destArr);
  }

  if (eligible) {
    const eligibleArr = eligible.split(",");
    query = query.overlaps("eligible_countries", eligibleArr);
  }

  if (types) {
    const typesArr = types.split(",");
    query = query.in("project_type", typesArr);
  }

  if (targetProfile) {
    query = query.eq("target_profile", targetProfile);
  }

  if (themes) {
    const themesArr = themes.split(",");
    query = query.overlaps("themes", themesArr);
  }

  if (duration) query = query.lte("duration_days", parseInt(duration));
  if (minBudget) query = query.gte("travel_budget_min", parseInt(minBudget));
  if (maxBudget) query = query.lte("travel_budget_max", parseInt(maxBudget));
  if (maxFee) query = query.lte("participation_fee", parseInt(maxFee));
  if (accommodation) query = query.eq("accommodation_covered", true);
  if (rup) query = query.eq("covers_rup_flights", true);
  if (lastMinute) query = query.eq("is_last_minute", true);
  if (minAge) query = query.lte("min_age", parseInt(minAge));
  if (maxAge) query = query.gte("max_age", parseInt(maxAge));
  if (startDate) query = query.gte("start_date", startDate);
  if (endDate) query = query.lte("end_date", endDate);
  if (funding) query = query.eq("financing_type", funding);

  // Apply sorting logic
  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "urgent":
      query = query
        .order("is_last_minute", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "rup_first":
      query = query
        .order("covers_rup_flights", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "longest":
      query = query.order("duration_days", { ascending: false, nullsFirst: false });
      break;
    case "shortest":
      query = query.order("duration_days", { ascending: true, nullsFirst: false });
      break;
    case "a_z":
      query = query.order("title", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Apply pagination range (max 50 per page)
  query = query.range(from, to);

  const { data: projects, count, error } = await query;

  if (error) {
    console.error("Error al obtener proyectos:", error);
  }

  // Hydrate user interactions (is_favorite & is_applied)
  let userInteractions: { project_id: string; is_favorite: boolean; is_applied: boolean }[] = [];
  if (user) {
    const { data: interactions } = await supabase
      .from("user_project_interactions")
      .select("project_id, is_favorite, is_applied")
      .eq("user_id", user.id);

    if (interactions) {
      userInteractions = interactions;
    }
  }

  const interactionsMap = new Map(
    userInteractions.map((item) => [item.project_id, item])
  );

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  function buildPageUrl(targetPage: number): string {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(searchParams)) {
      if (val === undefined || val === null || key === "page") continue;
      if (Array.isArray(val)) {
        val.forEach((v) => params.append(key, v));
      } else {
        params.set(key, val);
      }
    }
    params.set("page", targetPage.toString());
    return `/dashboard/projects?${params.toString()}`;
  }

  const formattedProjects = (projects || []).map((project) => {
    const org = project.users_org || {};
    const interaction = interactionsMap.get(project.id);
    return {
      ...project,
      org_name: org.org_name,
      org_logo_url: org.logo_url || org.avatar_url,
      created_at: project.created_at,
      verification_status: org.verification_status,
      is_favorite: interaction?.is_favorite ?? false,
      is_applied: interaction?.is_applied ?? false,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <ScrollRestorationHelper storageKey="euronova_projects_scroll_position" />
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Breadcrumbs />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 text-white">
            <Rocket className="w-8 h-8 text-plasma-cyan" /> 
            {t("transmissionsReceived")}
          </h2>
          <p className="text-gray-400 mt-2">{t("exploreMissions")}</p>
        </div>
        <div className="shrink-0">
          <RandomMissionButton projectIds={projects?.map((p) => p.id) || []} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-8">
        {/* Filtros a la izquierda */}
        <div className="w-full lg:w-72 shrink-0">
          <Suspense fallback={<div className="h-96 rounded-xl bg-void-surface animate-pulse" />}>
            <DashboardSidebar />
          </Suspense>
        </div>

        {/* Resultados con toggle Grid/List y Paginación a la derecha */}
        <div className="flex-1 flex flex-col">
          <ProjectsViewManager projects={formattedProjects} />

          {/* Sección de Paginación */}
          {projects && projects.length > 0 && (
            <div className="mt-10 pt-6 border-t border-void-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-gray-400 font-medium">
                {t("showingResults", {
                  from: totalCount === 0 ? 0 : from + 1,
                  to: Math.min(to + 1, totalCount),
                  total: totalCount,
                })}
              </div>

              <div className="flex items-center gap-3">
                {page <= 1 ? (
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface/40 text-gray-600 text-sm font-medium cursor-not-allowed select-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t("previous")}</span>
                  </button>
                ) : (
                  <Link
                    href={buildPageUrl(page - 1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-plasma-cyan" />
                    <span>{t("previous")}</span>
                  </Link>
                )}

                <div className="px-4 py-2 rounded-lg border border-void-border bg-void-deep text-xs font-semibold text-plasma-cyan tracking-wider">
                  {t("pageOf", {
                    current: page,
                    total: totalPages,
                  })}
                </div>

                {page >= totalPages || projects.length === 0 ? (
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface/40 text-gray-600 text-sm font-medium cursor-not-allowed select-none"
                  >
                    <span>{t("next")}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href={buildPageUrl(page + 1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all"
                  >
                    <span>{t("next")}</span>
                    <ChevronRight className="w-4 h-4 text-plasma-cyan" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
