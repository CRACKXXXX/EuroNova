import { Link } from "@/i18n/routing";
import { Search, Building, User, Briefcase, Globe, Users, Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardGridContainer, DashboardCardMotion } from "@/components/DashboardGridMotion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardHome({
  searchParams,
}: {
  searchParams?: Promise<{ uat_error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (resolvedSearchParams?.uat_error === "500") {
    throw new Error("[UAT Simulation] Deliberate test error triggered by architect parameter ?uat_error=500.");
  }

  const t = await getTranslations("Dashboard");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          {t("welcome")} <span className="text-plasma-cyan">EuroNova</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto">
          {t("mission")}
        </p>
      </div>

      {/* Symmetrical 3-1-3 Responsive Grid with Coordinated Animations */}
      <DashboardGridContainer>
        
        {/* ============================================================== */}
        {/* ROW 1: ITEM 1 — Search Projects (Cyan / plasma-cyan)           */}
        {/* ============================================================== */}
        <DashboardCardMotion className="col-span-1">
          <Link
            href="/dashboard/projects"
            className="group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-plasma-cyan transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(0,229,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col items-center text-center overflow-hidden h-full block"
          >
            {/* Shimmer Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-plasma-cyan/10 to-transparent pointer-events-none" />
            
            {/* Ambient Nebula Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-plasma-cyan/15 transition-colors duration-500" />
            
            {/* Icon Container with Orbital Ring */}
            <div className="relative mb-6">
              <span className="absolute -inset-2 rounded-full border border-plasma-cyan/30 scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500 pointer-events-none" />
              <div className="w-16 h-16 bg-plasma-cyan/10 border border-plasma-cyan/25 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:border-plasma-cyan transition-all duration-300 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                <Search className="w-8 h-8 text-plasma-cyan" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-plasma-cyan transition-colors mb-2">
              {t("searchProjects")}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("searchProjectsDesc")}
            </p>
          </Link>
        </DashboardCardMotion>

        {/* ============================================================== */}
        {/* ROW 1: ITEM 2 — Mission Radar (Deep Blue / blue-600)           */}
        {/* ============================================================== */}
        <DashboardCardMotion className="col-span-1">
          <Link
            href="/map"
            className="group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(37,99,235,0.28),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col items-center text-center overflow-hidden h-full block"
          >
            {/* Shimmer Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent pointer-events-none" />
            
            {/* Ambient Nebula Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-blue-600/15 transition-colors duration-500" />
            
            {/* Icon Container with Orbital Ring */}
            <div className="relative mb-6">
              <span className="absolute -inset-2 rounded-full border border-blue-500/30 scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500 pointer-events-none" />
              <div className="w-16 h-16 bg-blue-600/10 border border-blue-600/30 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:border-blue-500 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                <Globe className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-blue-400 transition-colors mb-2">
              {t("missionRadar")}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("missionRadarDesc")}
            </p>
          </Link>
        </DashboardCardMotion>

        {/* ============================================================== */}
        {/* ROW 1: ITEM 3 — Ecosystem (Warm Amber)                        */}
        {/* ============================================================== */}
        <DashboardCardMotion className="col-span-1">
          <Link
            href="/ecosystem"
            className="group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-amber-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col items-center text-center overflow-hidden h-full block"
          >
            {/* Shimmer Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent pointer-events-none" />
            
            {/* Ambient Nebula Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-amber-500/15 transition-colors duration-500" />
            
            {/* Icon Container with Orbital Ring */}
            <div className="relative mb-6">
              <span className="absolute -inset-2 rounded-full border border-amber-500/30 scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500 pointer-events-none" />
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:border-amber-500 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Compass className="w-8 h-8 text-amber-500" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
              {t("ecosystemHub")}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("ecosystemHubDesc")}
            </p>
          </Link>
        </DashboardCardMotion>

        {/* ============================================================== */}
        {/* ROW 2: CENTERPIECE — My Profile (Metallic Slate Grey)          */}
        {/* ============================================================== */}
        <DashboardCardMotion isCenterpiece className="col-span-1 md:col-span-2 lg:col-span-3">
          <Link
            href="/dashboard/profile"
            className="group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-slate-300 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(148,163,184,0.25),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left overflow-hidden h-full block"
          >
            {/* Shimmer Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-slate-400/10 to-transparent pointer-events-none" />

            {/* Ambient Nebula Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-slate-400/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-slate-400/15 transition-colors duration-500" />
            <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-zinc-400/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-zinc-400/15 transition-colors duration-500" />

            {/* Icon Container with Orbital Ring */}
            <div className="relative shrink-0">
              <span className="absolute -inset-2 rounded-2xl border border-slate-400/30 scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500 pointer-events-none" />
              <div className="w-16 h-16 bg-slate-400/10 border border-slate-400/25 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:border-slate-300 transition-all duration-300 shadow-[0_0_15px_rgba(148,163,184,0.15)]">
                <User className="w-8 h-8 text-slate-300" />
              </div>
            </div>

            {/* Profile Text Header & Description */}
            <div className="relative z-10 space-y-1.5 max-w-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-slate-200 transition-colors">
                {t("myProfile")}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t("myProfileDesc")}
              </p>
            </div>
          </Link>
        </DashboardCardMotion>

        {/* ============================================================== */}
        {/* ROW 3: ITEM 1 — Search Organizations (Hyper Violet)            */}
        {/* ============================================================== */}
        <DashboardCardMotion className="col-span-1">
          <Link
            href="/dashboard/organizations"
            className="group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-hyper-violet transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(99,102,241,0.25),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col items-center text-center overflow-hidden h-full block"
          >
            {/* Shimmer Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-hyper-violet/10 to-transparent pointer-events-none" />
            
            {/* Ambient Nebula Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-hyper-violet/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-hyper-violet/15 transition-colors duration-500" />
            
            {/* Icon Container with Orbital Ring */}
            <div className="relative mb-6">
              <span className="absolute -inset-2 rounded-full border border-hyper-violet/30 scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500 pointer-events-none" />
              <div className="w-16 h-16 bg-hyper-violet/10 border border-hyper-violet/25 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:border-hyper-violet transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <Building className="w-8 h-8 text-hyper-violet" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-hyper-violet transition-colors mb-2">
              {t("searchOrgs")}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("searchOrgsDesc")}
            </p>
          </Link>
        </DashboardCardMotion>

        {/* ============================================================== */}
        {/* ROW 3: ITEM 2 — My Missions (Crimson Red / red-500)            */}
        {/* ============================================================== */}
        <DashboardCardMotion className="col-span-1">
          <Link
            href="/dashboard/my-missions"
            className="group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-red-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(239,68,68,0.28),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col items-center text-center overflow-hidden h-full block"
          >
            {/* Shimmer Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-red-500/10 to-transparent pointer-events-none" />
            
            {/* Ambient Nebula Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-red-500/15 transition-colors duration-500" />
            
            {/* Icon Container with Orbital Ring */}
            <div className="relative mb-6">
              <span className="absolute -inset-2 rounded-full border border-red-500/30 scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500 pointer-events-none" />
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:border-red-500 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Briefcase className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-red-400 transition-colors mb-2">
              {t("myMissions")}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("myMissionsDesc")}
            </p>
          </Link>
        </DashboardCardMotion>

        {/* ============================================================== */}
        {/* ROW 3: ITEM 3 — Community Hub (Emerald / rup-emerald)          */}
        {/* ============================================================== */}
        <DashboardCardMotion className="col-span-1">
          <Link
            href="/community"
            className="group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-rup-emerald transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(0,230,118,0.25),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col items-center text-center overflow-hidden h-full block"
          >
            {/* Shimmer Sheen */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-rup-emerald/10 to-transparent pointer-events-none" />
            
            {/* Ambient Nebula Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-rup-emerald/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-rup-emerald/15 transition-colors duration-500" />
            
            {/* Icon Container with Orbital Ring */}
            <div className="relative mb-6">
              <span className="absolute -inset-2 rounded-full border border-rup-emerald/30 scale-75 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500 pointer-events-none" />
              <div className="w-16 h-16 bg-rup-emerald/10 border border-rup-emerald/25 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:border-rup-emerald transition-all duration-300 shadow-[0_0_15px_rgba(0,230,118,0.15)]">
                <Users className="w-8 h-8 text-rup-emerald" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-rup-emerald transition-colors mb-2">
              {t("communityHub")}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("communityHubDesc")}
            </p>
          </Link>
        </DashboardCardMotion>

      </DashboardGridContainer>
    </div>
  );
}
