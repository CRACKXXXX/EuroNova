import { Link } from "@/i18n/routing";
import { Search, Building, User, Briefcase, Globe, Users, Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";

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

      {/* Symmetrical 3-1-3 Responsive Grid (Desktop: 3-1-3, Tablet: 2-2-2-2, Mobile: 1-col) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Row 1 / Item 1: Search Projects (Color: Blue / plasma-cyan) */}
        <Link
          href="/dashboard/projects"
          className="order-1 md:order-1 lg:order-1 col-span-1 group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-plasma-cyan transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-plasma-cyan/10 transition-colors" />
          <div className="w-16 h-16 bg-plasma-cyan/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Search className="w-8 h-8 text-plasma-cyan" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t("searchProjects")}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{t("searchProjectsDesc")}</p>
        </Link>

        {/* Row 1 / Item 2: Mission Radar (Color: Dark Blue / blue-600) */}
        <Link
          href="/map"
          className="order-2 md:order-2 lg:order-2 col-span-1 group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-blue-600 transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-blue-600/10 transition-colors" />
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-600/30 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t("missionRadar")}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{t("missionRadarDesc")}</p>
        </Link>

        {/* Row 1 / Item 3: Ecosystem (Color: Soft Yellow / amber-200 background, amber-500 accents) */}
        <Link
          href="/ecosystem"
          className="order-3 md:order-4 lg:order-3 col-span-1 group relative bg-gradient-to-br from-amber-200/5 via-void-surface to-void-deep border border-amber-500/30 hover:border-amber-500 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-amber-500/15 transition-colors" />
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Compass className="w-8 h-8 text-amber-500" />
          </div>
          <span className="mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-200 border border-amber-500/30">
            {t("ecosystemBadge")}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-300 transition-colors mb-2">
            {t("ecosystemHub")}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">{t("ecosystemHubDesc")}</p>
        </Link>

        {/* Row 2 (Centerpiece): My Profile (Color: nova-flare, centered centerpiece, massive glow) */}
        <Link
          href="/dashboard/profile"
          className="order-4 md:order-3 lg:order-4 col-span-1 md:col-span-2 lg:col-span-3 group relative bg-gradient-to-r from-void-surface/95 via-void-surface/85 to-void-deep/95 border border-nova-flare/40 hover:border-nova-flare rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 transition-all duration-500 shadow-[0_0_50px_rgba(255,46,99,0.3)] hover:shadow-[0_0_70px_rgba(255,46,99,0.45)] flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left overflow-hidden"
        >
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-nova-flare/10 rounded-full blur-[90px] pointer-events-none group-hover:bg-nova-flare/20 transition-all duration-700" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-hyper-violet/10 rounded-full blur-[90px] pointer-events-none group-hover:bg-hyper-violet/20 transition-all duration-700" />

          {/* Glowing Avatar / Icon Container */}
          <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-nova-flare/15 border border-nova-flare/40 flex items-center justify-center text-nova-flare shadow-[0_0_30px_rgba(255,46,99,0.35)] group-hover:scale-110 transition-transform duration-300 shrink-0">
            <User className="w-8 h-8 sm:w-10 sm:h-10 text-nova-flare" />
          </div>

          {/* Profile Text Header & Description */}
          <div className="relative z-10 space-y-1.5 max-w-2xl">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white group-hover:text-nova-flare transition-colors">
              {t("myProfile")}
            </h2>
            <p className="text-gray-300 text-sm sm:text-base font-light leading-relaxed">
              {t("myProfileDesc")}
            </p>
          </div>
        </Link>

        {/* Row 3 / Item 1: Search Organizations (Color: Hyper Violet) */}
        <Link
          href="/dashboard/organizations"
          className="order-5 md:order-5 lg:order-5 col-span-1 group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-hyper-violet transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-hyper-violet/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-hyper-violet/10 transition-colors" />
          <div className="w-16 h-16 bg-hyper-violet/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Building className="w-8 h-8 text-hyper-violet" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t("searchOrgs")}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{t("searchOrgsDesc")}</p>
        </Link>

        {/* Row 3 / Item 2: My Missions (Color: Strong Red / red-500) */}
        <Link
          href="/dashboard/my-missions"
          className="order-6 md:order-6 lg:order-6 col-span-1 group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-red-500 transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-red-500/10 transition-colors" />
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Briefcase className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t("myMissions")}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{t("myMissionsDesc")}</p>
        </Link>

        {/* Row 3 / Item 3: Community Hub (Color: Emerald / rup-emerald) */}
        <Link
          href="/community"
          className="order-7 md:order-7 lg:order-7 col-span-1 group relative bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 hover:border-rup-emerald transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,230,118,0.15)] flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rup-emerald/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-rup-emerald/10 transition-colors" />
          <div className="w-16 h-16 bg-rup-emerald/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Users className="w-8 h-8 text-rup-emerald" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t("communityHub")}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{t("communityHubDesc")}</p>
        </Link>

      </div>
    </div>
  );
}
