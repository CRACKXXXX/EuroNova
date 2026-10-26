"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  Send, 
  CheckCircle2, 
  ArrowDown, 
  TrendingUp, 
  ShieldCheck, 
  Calendar,
  Bookmark,
  Sparkles,
  Layers,
  AlertCircle
} from "lucide-react";
import { OrganizationNavTabs } from "@/components/OrganizationNavTabs";
import { createClient } from "@/utils/supabase/client";
import { useTranslations, useFormatter } from "next-intl";

interface AnalyticsFunnelsClientProps {
  orgId: string;
  orgName?: string;
}

interface OrgMetrics {
  totalProjects: number;
  openProjects: number;
  closedProjects: number;
  totalFavorites: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  totalReviews: number;
  averageRating: number;
}

export function AnalyticsFunnelsClient({ orgId }: AnalyticsFunnelsClientProps) {
  const t = useTranslations("OrgAnalytics");
  const format = useFormatter();
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<OrgMetrics>({
    totalProjects: 0,
    openProjects: 0,
    closedProjects: 0,
    totalFavorites: 0,
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    totalReviews: 0,
    averageRating: 5.0,
  });

  useEffect(() => {
    let ignore = false;

    async function loadTelemetry() {
      try {
        const supabase = createClient();

        // 1. Fetch real projects owned by this organization
        const { data: projects, error: projectsError } = await supabase
          .from("projects")
          .select("id, status, created_at")
          .eq("org_id", orgId);

        if (projectsError) {
          throw new Error(projectsError.message);
        }

        const allProjects = projects || [];
        const now = new Date();
        const cutoff = new Date();
        if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);
        else if (timeRange === "90d") cutoff.setDate(now.getDate() - 90);
        else cutoff.setTime(0);

        const filteredProjects = timeRange === "all" 
          ? allProjects 
          : allProjects.filter((p) => new Date(p.created_at) >= cutoff);

        const totalProjects = filteredProjects.length;
        const openProjects = filteredProjects.filter((p) => p.status === "open").length;
        const closedProjects = filteredProjects.filter((p) => p.status !== "open").length;

        const projectIds = filteredProjects.map((p) => p.id);

        let totalFavorites = 0;
        let totalApplications = 0;
        let pendingApplications = 0;
        let acceptedApplications = 0;
        let rejectedApplications = 0;

        if (projectIds.length > 0) {
          // 2. Fetch real user favorites from user_project_interactions
          const { data: interactions, error: interactionsError } = await supabase
            .from("user_project_interactions")
            .select("project_id, is_favorite, is_applied")
            .in("project_id", projectIds);

          if (!interactionsError && interactions) {
            totalFavorites = interactions.filter((i) => i.is_favorite).length;
          }

          // 3. Fetch real applications from applications table
          const { data: apps, error: appsError } = await supabase
            .from("applications")
            .select("id, status, created_at")
            .in("project_id", projectIds);

          if (!appsError && apps) {
            const filteredApps = timeRange === "all"
              ? apps
              : apps.filter((a) => new Date(a.created_at) >= cutoff);

            totalApplications = filteredApps.length;
            pendingApplications = filteredApps.filter((a) => a.status === "pending").length;
            acceptedApplications = filteredApps.filter((a) => a.status === "accepted").length;
            rejectedApplications = filteredApps.filter((a) => a.status === "rejected").length;
          }
        }

        // 4. Fetch real organization reviews
        const { data: reviews } = await supabase
          .from("org_reviews")
          .select("rating")
          .eq("org_id", orgId);

        let totalReviews = 0;
        let averageRating = 5.0;
        if (reviews && reviews.length > 0) {
          totalReviews = reviews.length;
          const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
          averageRating = Number((sum / reviews.length).toFixed(1));
        }

        if (!ignore) {
          setMetrics({
            totalProjects,
            openProjects,
            closedProjects,
            totalFavorites,
            totalApplications,
            pendingApplications,
            acceptedApplications,
            rejectedApplications,
            totalReviews,
            averageRating,
          });
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Error fetching real organization analytics:", err);
          const msg = err instanceof Error ? err.message : "Failed to load telemetry from database";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadTelemetry();

    return () => {
      ignore = true;
    };
  }, [orgId, timeRange]);

  // Real Calculated Conversion Rates
  const conversionRate = metrics.totalFavorites > 0
    ? `${((metrics.totalApplications / metrics.totalFavorites) * 100).toFixed(1)}%`
    : metrics.totalApplications > 0
    ? "100%"
    : "0.0%";

  const acceptanceRate = metrics.totalApplications > 0
    ? `${((metrics.acceptedApplications / metrics.totalApplications) * 100).toFixed(1)}%`
    : "0.0%";

  const activeRatio = metrics.totalProjects > 0
    ? `${Math.round((metrics.openProjects / metrics.totalProjects) * 100)}%`
    : "0%";

  // Real Telemetry Steps
  const maxVolume = Math.max(metrics.totalProjects, metrics.totalFavorites, metrics.totalApplications, metrics.acceptedApplications, 1);

  const steps = [
    {
      title: "Published Mobility Missions",
      count: metrics.totalProjects,
      percentage: Math.round((metrics.totalProjects / maxVolume) * 100),
      desc: `${metrics.openProjects} currently active & accepting candidates in feed`,
      colorClass: "from-plasma-cyan/30 to-plasma-cyan/10 border-plasma-cyan/60 text-plasma-cyan",
      badgeClass: "bg-plasma-cyan/20 text-plasma-cyan border-plasma-cyan/40",
      icon: Layers,
    },
    {
      title: "Participant Saves & Bookmarks",
      count: metrics.totalFavorites,
      percentage: Math.round((metrics.totalFavorites / maxVolume) * 100),
      desc: "Youth volunteers who saved your missions to their priority list",
      colorClass: "from-hyper-violet/30 to-hyper-violet/10 border-hyper-violet/60 text-hyper-violet",
      badgeClass: "bg-hyper-violet/20 text-hyper-violet border-hyper-violet/40",
      icon: Bookmark,
    },
    {
      title: "Applications Dispatched",
      count: metrics.totalApplications,
      percentage: Math.round((metrics.totalApplications / maxVolume) * 100),
      desc: `${metrics.pendingApplications} dossiers awaiting review in your pipeline`,
      colorClass: "from-rup-emerald/30 to-rup-emerald/10 border-rup-emerald/60 text-rup-emerald",
      badgeClass: "bg-rup-emerald/20 text-rup-emerald border-rup-emerald/40",
      icon: Send,
    },
    {
      title: "Accepted Mobility Candidates",
      count: metrics.acceptedApplications,
      percentage: Math.round((metrics.acceptedApplications / maxVolume) * 100),
      desc: `${metrics.rejectedApplications} non-selected / archived submissions`,
      colorClass: "from-nova-flare/30 to-nova-flare/10 border-nova-flare/60 text-nova-flare shadow-[0_0_20px_rgba(255,46,99,0.25)]",
      badgeClass: "bg-nova-flare/20 text-nova-flare border-nova-flare/40",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      <OrganizationNavTabs orgId={orgId} isOwner={true} />

      {/* Selector de Rango Temporal & Quick Insights */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-void-surface/80 border border-void-border p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-plasma-cyan" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            {t("verifiedTelemetry")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-void-deep p-1 rounded-xl border border-void-border">
          {(["30d", "90d", "all"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => {
                if (timeRange !== range) {
                  setTimeRange(range);
                  setIsLoading(true);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === range
                  ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {range === "30d" ? "Last 30 Days" : range === "90d" ? "Last 90 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-nova-flare/15 border border-nova-flare/40 flex items-center gap-3 text-nova-flare text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-void-surface/50 border border-void-border animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-void-surface/50 border border-void-border animate-pulse" />
        </div>
      ) : (
        <>
          {/* Tarjetas KPI Superiores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-void-surface/90 border border-void-border backdrop-blur-xl relative overflow-hidden group hover:border-plasma-cyan/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("bookmarkConversion")}
                </span>
                <div className="w-8 h-8 rounded-lg bg-plasma-cyan/10 text-plasma-cyan flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  {conversionRate}
                </span>
                <span className="text-xs font-bold text-rup-emerald">
                  {metrics.totalApplications} total
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {t("bookmarkConversionDesc")}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-void-surface/90 border border-void-border backdrop-blur-xl relative overflow-hidden group hover:border-hyper-violet/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("acceptanceYield")}
                </span>
                <div className="w-8 h-8 rounded-lg bg-hyper-violet/10 text-hyper-violet flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  {acceptanceRate}
                </span>
                <span className="text-xs font-bold text-plasma-cyan">
                  {metrics.acceptedApplications} approved
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {t("acceptanceYieldDesc")}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-void-surface/90 border border-void-border backdrop-blur-xl relative overflow-hidden group hover:border-rup-emerald/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {t("activeDeployment")}
                </span>
                <div className="w-8 h-8 rounded-lg bg-rup-emerald/10 text-rup-emerald flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  {metrics.openProjects} / {metrics.totalProjects}
                </span>
                <span className="text-xs font-bold text-rup-emerald">
                  {activeRatio} active
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {metrics.totalReviews > 0 ? `Community Rating: ${metrics.averageRating}/5.0 (${metrics.totalReviews} reviews)` : "Verified organization missions"}
              </p>
            </div>
          </div>

          {/* Visualización del Embudo de Conversión */}
          <div className="bg-void-surface/80 border border-void-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-void-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/40 flex items-center justify-center text-plasma-cyan shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {t("funnelTitle")}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {t("funnelDesc")}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 hidden sm:inline-block">
                {t("liveDbSync")}
              </span>
            </div>

            {metrics.totalProjects === 0 ? (
              <div className="p-8 rounded-2xl bg-void-deep/60 border border-void-border text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-plasma-cyan/10 text-plasma-cyan flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">{t("noMissionsFound")}</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {t("noMissionsFoundDesc")}
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isLast = idx === steps.length - 1;
                  const barWidthPercent = Math.max(step.percentage, 8);

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-void-deep border border-void-border text-[10px] font-mono font-bold flex items-center justify-center text-gray-400">
                            0{idx + 1}
                          </span>
                          <span className="font-bold text-white text-sm">
                            {step.title}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${step.badgeClass}`}>
                            {t("registeredCount", { count: step.count })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-gray-400 font-mono text-[11px]">
                          <span>{step.percentage}% relative scale</span>
                        </div>
                      </div>

                      {/* Funnel Bar Container */}
                      <div className="w-full bg-void-deep/80 rounded-2xl p-1.5 border border-void-border overflow-hidden">
                        <div
                          className={`h-12 rounded-xl bg-gradient-to-r ${step.colorClass} border flex items-center justify-between px-4 transition-all duration-700 ease-out`}
                          style={{ width: `${barWidthPercent}%` }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-bold text-white truncate">
                              {format.number(step.count)}
                            </span>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider text-white/80 hidden sm:inline-block shrink-0">
                            {step.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Subtitle / Insight */}
                      <div className="flex items-center justify-between px-2 text-[11px] text-gray-500">
                        <span>{step.desc}</span>
                        {!isLast && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <ArrowDown className="w-3 h-3 text-gray-500" />
                            <span>{t("progression")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsFunnelsClient;
