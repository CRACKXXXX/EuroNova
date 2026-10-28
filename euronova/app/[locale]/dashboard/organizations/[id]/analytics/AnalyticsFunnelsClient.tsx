"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  Send, 
  CheckCircle2, 
  ArrowDown, 
  TrendingUp, 
  ShieldCheck, 
  Bookmark,
  Sparkles,
  Layers,
  AlertCircle,
  Globe,
  Star,
  RefreshCw,
  ExternalLink,
  MapPin
} from "lucide-react";
import { OrganizationNavTabs } from "@/components/OrganizationNavTabs";
import { useTranslations, useFormatter } from "next-intl";
import {
  getOrgVerifiableAnalyticsAction,
  type OrgVerifiableAnalytics,
} from "@/actions/analytics";

interface AnalyticsFunnelsClientProps {
  orgId: string;
  orgName?: string;
}

export function AnalyticsFunnelsClient({ orgId }: AnalyticsFunnelsClientProps) {
  const t = useTranslations("OrgAnalytics");
  const format = useFormatter();
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<OrgVerifiableAnalytics>({
    timeRange: "all",
    totalProjects: 0,
    activePublishedProjects: 0,
    archivedProjects: 0,
    pendingProjects: 0,
    totalFavorites: 0,
    totalApplications: 0,
    totalDossierSubmissions: 0,
    applicationConversionRate: 0,
    dossierConversionRate: 0,
    missions: [],
    totalReviews: 0,
    averageRating: 5.0,
    ratingBreakdown: [
      { stars: 5, count: 0, percentage: 0 },
      { stars: 4, count: 0, percentage: 0 },
      { stars: 3, count: 0, percentage: 0 },
      { stars: 2, count: 0, percentage: 0 },
      { stars: 1, count: 0, percentage: 0 },
    ],
    communitySurveysCount: 0,
    communitySurveyVotesCount: 0,
    totalInteractedVolunteers: 0,
    rupVolunteersCount: 0,
    rupPercentage: 0,
    topCountries: [],
  });

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const res = await getOrgVerifiableAnalyticsAction(orgId, timeRange);
        if (!ignore) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.error || "Failed to load telemetry.");
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Error querying analytics.";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      ignore = true;
    };
  }, [orgId, timeRange]);

  const handleSelectRange = (range: "30d" | "90d" | "all") => {
    if (range === timeRange) return;
    setIsLoading(true);
    setError(null);
    setTimeRange(range);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const res = await getOrgVerifiableAnalyticsAction(orgId, timeRange);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || "Failed to load telemetry.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error querying analytics.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const funnelMax = Math.max(data.totalProjects, 1);
  const funnelSteps = [
    {
      title: t("funnelStep1"),
      count: data.totalProjects,
      percentage: 100,
      desc: t("funnelStep1Desc"),
      icon: Layers,
      colorClass: "from-blue-600/30 to-blue-500/10 border-blue-500/40 text-blue-400",
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
    {
      title: t("funnelStep2"),
      count: data.totalFavorites,
      percentage:
        data.totalProjects > 0
          ? Math.round((data.totalFavorites / funnelMax) * 100)
          : 0,
      desc: t("funnelStep2Desc"),
      icon: Bookmark,
      colorClass: "from-purple-600/30 to-purple-500/10 border-purple-500/40 text-purple-400",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    },
    {
      title: t("funnelStep3"),
      count: data.totalApplications,
      percentage:
        data.totalProjects > 0
          ? Math.round((data.totalApplications / funnelMax) * 100)
          : 0,
      desc: t("funnelStep3Desc"),
      icon: Send,
      colorClass: "from-plasma-cyan/30 to-plasma-cyan/10 border-plasma-cyan/40 text-plasma-cyan",
      badgeClass: "bg-plasma-cyan/10 text-plasma-cyan border-plasma-cyan/30",
    },
    {
      title: t("funnelStep4"),
      count: data.totalDossierSubmissions,
      percentage:
        data.totalProjects > 0
          ? Math.round((data.totalDossierSubmissions / funnelMax) * 100)
          : 0,
      desc: t("funnelStep4Desc"),
      icon: CheckCircle2,
      colorClass: "from-rup-emerald/30 to-rup-emerald/10 border-rup-emerald/40 text-rup-emerald",
      badgeClass: "bg-rup-emerald/10 text-rup-emerald border-rup-emerald/30",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <OrganizationNavTabs orgId={orgId} />

      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-void-surface/80 p-6 rounded-2xl border border-void-border backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {t("title")}
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-plasma-cyan animate-pulse" />
              {t("liveDbSync")}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>

        {/* Time Range Selector & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center bg-void-deep/80 rounded-xl p-1 border border-void-border">
            <button
              onClick={() => handleSelectRange("all")}
              disabled={isPending || isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === "all"
                  ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t("timeRangeAll")}
            </button>
            <button
              onClick={() => handleSelectRange("30d")}
              disabled={isPending || isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === "30d"
                  ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t("timeRange30d")}
            </button>
            <button
              onClick={() => handleSelectRange("90d")}
              disabled={isPending || isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === "90d"
                  ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t("timeRange90d")}
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isPending || isLoading}
            title={t("refreshData")}
            className="p-2 rounded-xl bg-void-deep border border-void-border hover:border-plasma-cyan/40 text-gray-400 hover:text-plasma-cyan transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isPending || isLoading ? "animate-spin text-plasma-cyan" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-nova-flare/10 border border-nova-flare/30 flex items-center gap-3 text-sm text-nova-flare">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 4 Real KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Mission Inventory */}
        <div className="p-5 rounded-2xl bg-void-surface/90 border border-void-border hover:border-plasma-cyan/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("missionInventory")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">
              {isLoading ? "..." : format.number(data.totalProjects)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-rup-emerald/15 text-rup-emerald font-bold border border-rup-emerald/30">
                {data.activePublishedProjects} {t("activePublished")}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-void-deep text-gray-400 font-bold border border-void-border">
                {data.archivedProjects} {t("archived")}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Real Engagement Conversion Rate */}
        <div className="p-5 rounded-2xl bg-void-surface/90 border border-void-border hover:border-plasma-cyan/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("bookmarkConversion")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-plasma-cyan tracking-tight flex items-baseline gap-1">
              {isLoading ? "..." : `${data.applicationConversionRate}%`}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {format.number(data.totalApplications)} apps / {format.number(data.totalFavorites)} favs
            </p>
          </div>
        </div>

        {/* KPI 3: Verified Organization Reputation */}
        <div className="p-5 rounded-2xl bg-void-surface/90 border border-void-border hover:border-plasma-cyan/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("reputationTitle")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rup-emerald/10 border border-rup-emerald/30 flex items-center justify-center text-rup-emerald">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white flex items-center gap-2">
              {isLoading ? "..." : data.averageRating.toFixed(1)}
              <div className="flex items-center text-amber-400 text-sm">
                <Star className="w-5 h-5 fill-amber-400 stroke-amber-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {data.totalReviews} {t("reputationDesc").split(".")[0]}
            </p>
          </div>
        </div>

        {/* KPI 4: Community Engagement */}
        <div className="p-5 rounded-2xl bg-void-surface/90 border border-void-border hover:border-plasma-cyan/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("surveyVotesCollected")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-hyper-violet/10 border border-hyper-violet/30 flex items-center justify-center text-hyper-violet">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-hyper-violet">
              {isLoading ? "..." : format.number(data.communitySurveyVotesCount)}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {data.communitySurveysCount} {t("surveysCreated")}
            </p>
          </div>
        </div>
      </div>

      {/* Real Candidate Conversion Funnel */}
      <div className="p-6 rounded-2xl bg-void-surface/90 border border-void-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-void-border">
          <div className="flex items-center gap-3">
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
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 self-start sm:self-center">
            {t("verifiedTelemetry")}
          </span>
        </div>

        {data.totalProjects === 0 ? (
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
            {funnelSteps.map((step, idx) => {
              const Icon = step.icon;
              const isLast = idx === funnelSteps.length - 1;
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
                        {format.number(step.count)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-400 font-mono text-[11px]">
                      <span>{step.percentage}% relative</span>
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

                  {/* Insight Subtitle */}
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

      {/* Per-Mission Performance Breakdown Table */}
      <div className="p-6 rounded-2xl bg-void-surface/90 border border-void-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-void-border">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              {t("perMissionTableTitle")}
            </h3>
            <p className="text-xs text-gray-400">
              {t("perMissionTableDesc")}
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-void-deep border border-void-border text-gray-300 self-start sm:self-center">
            {data.missions.length} {t("activePublished")}
          </span>
        </div>

        {data.missions.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            {t("noMissionsFound")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-void-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-void-deep/90 text-gray-400 font-bold border-b border-void-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">{t("colTitle")}</th>
                  <th className="px-3 py-3">{t("colType")}</th>
                  <th className="px-3 py-3">{t("colStatus")}</th>
                  <th className="px-3 py-3 text-center">{t("colFavorites")}</th>
                  <th className="px-3 py-3 text-center">{t("colApplications")}</th>
                  <th className="px-3 py-3 text-center">{t("colDossiers")}</th>
                  <th className="px-3 py-3 text-center">{t("colForum")}</th>
                  <th className="px-3 py-3">{t("colDate")}</th>
                  <th className="px-4 py-3 text-right">{t("colAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-void-border/60 bg-void-surface/50">
                {data.missions.map((m) => {
                  const isArchived = m.status === "archived";
                  const isPublished = m.status === "published" || m.status === "open";

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-void-deep/60 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-bold text-white max-w-[240px] truncate">
                        <div className="truncate" title={m.title}>
                          {m.title}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-plasma-cyan" />
                          <span>{m.destCountry || "EU"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-void-deep border border-void-border text-gray-300">
                          {m.projectType}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPublished
                              ? "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/40"
                              : isArchived
                              ? "bg-gray-500/15 text-gray-400 border-gray-500/40"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/40"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center font-bold text-purple-400">
                        {m.favoritesCount}
                      </td>
                      <td className="px-3 py-3.5 text-center font-bold text-plasma-cyan">
                        {m.applicationsCount}
                      </td>
                      <td className="px-3 py-3.5 text-center font-bold text-rup-emerald">
                        {m.dossiersCount}
                      </td>
                      <td className="px-3 py-3.5 text-center font-bold text-gray-300">
                        {m.forumMessagesCount}
                      </td>
                      <td className="px-3 py-3.5 text-gray-400 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/dashboard/projects/${m.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-plasma-cyan hover:underline"
                        >
                          <span>{t("viewMission")}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Secondary Dual Column Grid: Reputation & Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Reviews & Star Distribution */}
        <div className="p-6 rounded-2xl bg-void-surface/90 border border-void-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-void-border">
            <div>
              <h3 className="text-base font-black text-white tracking-tight">
                {t("reputationTitle")}
              </h3>
              <p className="text-xs text-gray-400">
                {t("reputationDesc")}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>

          <div className="flex items-center gap-6 p-4 rounded-xl bg-void-deep/70 border border-void-border">
            <div className="text-center">
              <div className="text-4xl font-black text-white">
                {data.averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-0.5 text-amber-400 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(data.averageRating)
                        ? "fill-amber-400 stroke-amber-400"
                        : "text-gray-600 stroke-gray-600"
                    }`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-gray-400">
                {data.totalReviews} reviews
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              {data.ratingBreakdown.map((r) => (
                <div key={r.stars} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-[10px] font-bold text-gray-400 font-mono">
                    {r.stars}★
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-void-border overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[10px] font-mono text-gray-500">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-void-deep/40 border border-void-border text-xs text-gray-400">
            <span>{t("surveysCreated")}: <strong className="text-white font-mono">{data.communitySurveysCount}</strong></span>
            <span>{t("surveyVotesCollected")}: <strong className="text-hyper-violet font-mono">{data.communitySurveyVotesCount}</strong></span>
          </div>
        </div>

        {/* Right Column: Applicant Demographics & RUP Breakdown */}
        <div className="p-6 rounded-2xl bg-void-surface/90 border border-void-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-void-border">
            <div>
              <h3 className="text-base font-black text-white tracking-tight">
                {t("demographicsTitle")}
              </h3>
              <p className="text-xs text-gray-400">
                {t("demographicsDesc")}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rup-emerald/15 border border-rup-emerald/30 flex items-center justify-center text-rup-emerald">
              <Globe className="w-4 h-4" />
            </div>
          </div>

          {/* RUP Region Priority Banner */}
          <div className="p-4 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rup-emerald uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse" />
                {t("rupBadge")}
              </span>
              <span className="text-xs font-mono font-black text-rup-emerald">
                {data.rupPercentage}%
              </span>
            </div>
            <p className="text-xs text-gray-300">
              {t("rupRatioDesc", {
                count: data.rupVolunteersCount,
                total: data.totalInteractedVolunteers,
                percent: data.rupPercentage,
              })}
            </p>
          </div>

          {/* Top Applicant Nationalities */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("topApplicantCountries")}
            </h4>
            {data.topCountries.length === 0 ? (
              <div className="p-4 rounded-xl bg-void-deep/50 border border-void-border text-center text-xs text-gray-500">
                {t("noApplicantsYet")}
              </div>
            ) : (
              <div className="space-y-2">
                {data.topCountries.map((c) => (
                  <div
                    key={c.countryCode}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-void-deep/60 border border-void-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-5 rounded bg-void-surface border border-void-border font-mono font-bold text-[10px] flex items-center justify-center text-plasma-cyan">
                        {c.countryCode}
                      </span>
                      <span className="text-white font-medium">
                        {c.countryCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono text-[11px]">
                        {c.count} volunteers
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30">
                        {c.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsFunnelsClient;
