import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Euro, MapPin, Building, AlertTriangle, Trash2, ExternalLink, Users, Globe2, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import Image from "next/image";
import type { Metadata } from "next";
import { deleteProjectAction } from "./actions";
import { COUNTRIES } from "@/lib/constants/countries";
import { TermTooltip } from "@/components/TermTooltip";
import { DistanceCalculator } from "@/components/DistanceCalculator";
import { ShareProject } from "@/components/ShareProject";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ReportMissionButton } from "@/components/ReportMissionButton";
import { TrackRecentlyViewed } from "@/components/TrackRecentlyViewed";
import { ProjectForum } from "@/components/ProjectForum";
import { routing } from "@/i18n/routing";

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  props: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
  const { locale, id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("title, description, image_url, dest_country, project_type")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    return {
      title: "Mission Not Found",
    };
  }

  const title = `${project.title} | EuroNova`;
  const cleanDescription = project.description
    ? project.description.slice(0, 160).replace(/\s+/g, " ").trim()
    : "Discover Erasmus+ & ESC youth mobility opportunities across Europe on EuroNova.";
  const imageUrl = project.image_url || "/logo-big.png";

  const languageAlternates: Record<string, string> = {};
  for (const l of routing.locales) {
    languageAlternates[l] = `/${l}/dashboard/projects/${id}`;
  }
  languageAlternates["x-default"] = `/${routing.defaultLocale}/dashboard/projects/${id}`;

  return {
    title,
    description: cleanDescription,
    alternates: {
      canonical: `/${locale}/dashboard/projects/${id}`,
      languages: languageAlternates,
    },
    openGraph: {
      type: "article",
      locale,
      url: `/${locale}/dashboard/projects/${id}`,
      siteName: "EuroNova",
      title,
      description: cleanDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: project.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cleanDescription,
      images: [imageUrl],
    },
  };
}

export default async function ProjectDetailsPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const params = await props.params;
  const t = await getTranslations("ProjectDetails");
  const tGeneral = await getTranslations("NewProject"); // to reuse some generic keys if needed
  const format = await getFormatter();
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user country of residence if logged in, default to ES
  let userCountry = "ES";
  if (user) {
    const { data: youthProfile } = await supabase
      .from("users_youth")
      .select("country_residence")
      .eq("id", user.id)
      .maybeSingle();
    if (youthProfile?.country_residence) {
      userCountry = youthProfile.country_residence;
    }
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*, users_org(org_name, verification_status, avatar_url, oid_number)")
    .eq("id", params.id)
    .single();

  if (error || !project) {
    notFound();
  }

  const isOwner = user?.id === project.org_id;
  const isAdmin = user?.email === "euronovaofficial@gmail.com";
  const canDelete = isOwner || isAdmin;

  const orgData = Array.isArray(project.users_org) ? project.users_org[0] : project.users_org;
  const orgName = orgData?.org_name || "Unknown Organization";
  const orgLogo = orgData?.avatar_url || null;
  const orgOid = orgData?.oid_number || null;
  const isUnverified = orgData?.verification_status !== "verified";

  // Map dest_country and eligible_countries to full names
  const destCountryObj = COUNTRIES.find(c => c.code === (project.dest_country || project.country));
  const destCountryNode = destCountryObj ? (
    <span className="flex items-center gap-1.5">
      <Image src={destCountryObj.flagUrl} alt={destCountryObj.name} width={16} height={12} unoptimized style={{ width: "auto", height: "auto" }} className="w-4 h-auto rounded-[2px]" title={destCountryObj.name} />
      <span>{destCountryObj.name}</span>
    </span>
  ) : (
    <span>{project.dest_country || project.country}</span>
  );

  const eligibleCountriesNodes = project.eligible_countries
    ? project.eligible_countries.map((code: string) => {
        const cObj = COUNTRIES.find(c => c.code === code);
        return cObj ? (
          <span key={code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-void-deep border border-void-border text-sm">
            <Image src={cObj.flagUrl} alt={cObj.name} width={16} height={12} unoptimized style={{ width: "auto", height: "auto" }} className="w-4 h-auto rounded-[2px]" title={cObj.name} />
            <span>{cObj.name}</span>
          </span>
        ) : (
          <span key={code} className="inline-flex items-center px-2.5 py-1 rounded-md bg-void-deep border border-void-border text-sm">
            {code}
          </span>
        );
      })
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Telemetry tracker for recently viewed missions */}
      <TrackRecentlyViewed
        userId={user?.id}
        project={{
          id: project.id,
          title: project.title,
          dest_country: project.dest_country || project.country,
          project_type: project.project_type || project.mission_type,
          duration_days: project.duration_days,
          org_name: orgName,
          image_url: project.image_url,
        }}
      />

      {/* Top Header: Breadcrumbs & Report Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Breadcrumbs
          items={[
            { label: "Missions", href: "/dashboard/projects" },
            { label: project.title },
          ]}
        />
        <div className="flex items-center gap-3">
          <ReportMissionButton projectId={project.id} projectTitle={project.title} />
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("backToProjects")}</span>
          </Link>
        </div>
      </div>

      <div className="bg-void-surface border border-void-border rounded-3xl overflow-visible relative shadow-2xl">
        
        {/* HERO IMAGE */}
        {project.image_url ? (
          <div className="w-full h-64 md:h-80 relative bg-void-deep rounded-t-3xl overflow-hidden">
            {/* Shimmer skeleton behind the image while it loads */}
            <div className="absolute inset-0 bg-void-border/30 animate-pulse pointer-events-none" />
            <Image
              src={project.image_url}
              alt={project.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void-surface to-transparent" />
          </div>
        ) : (
          <div className="w-full h-32 md:h-48 bg-gradient-to-r from-void-deep to-void-surface relative rounded-t-3xl overflow-hidden" />
        )}

        <div className="p-6 sm:p-8 md:p-12 relative -mt-20 md:-mt-32 z-10">
          
          {/* BADGES */}
          <div className="flex flex-wrap gap-2 mb-6">
            <TermTooltip term={project.project_type || project.mission_type || "Erasmus+"}>
              <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-void-border text-gray-200 uppercase tracking-wider shadow-lg">
                {project.project_type || project.mission_type}
              </span>
            </TermTooltip>
            {project.is_last_minute && (
              <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30 shadow-lg">
                LAST MINUTE
              </span>
            )}
            {project.covers_rup_flights && (
              <TermTooltip term="ORs">
                <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30 shadow-lg">
                  ORs FLIGHTS
                </span>
              </TermTooltip>
            )}
            {/* AI Anti-Scam Shield micro-badge */}
            <div 
              title="Verified by EuroNova AI & Moderation Team"
              className="px-3 py-1.5 text-xs font-bold rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_15px_rgba(0,230,118,0.25)] flex items-center gap-1.5 cursor-help"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rup-emerald" />
              <span>AI Anti-Scam Verified</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-md">
            {project.title}
          </h1>

          {/* PUBLISHER PROFILE CARD */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-void-deep/80 border border-void-border backdrop-blur-sm mb-10 w-full sm:w-fit">
            {orgLogo ? (
              <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden border border-void-border bg-void-deep shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                <div className="absolute inset-0 bg-void-border/50 animate-pulse pointer-events-none" />
                <Image
                  src={orgLogo}
                  alt={orgName}
                  width={48}
                  height={48}
                  unoptimized
                  className="relative w-12 h-12 rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-void-surface to-plasma-cyan/20 flex items-center justify-center border border-plasma-cyan/30 shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                <Building className="w-6 h-6 text-plasma-cyan" />
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{t("publisherProfile")}</p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-white font-bold text-lg">
                  {orgName}
                </h3>
                {orgOid && (
                  <TermTooltip term="OID">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-plasma-cyan/15 border border-plasma-cyan/30 text-plasma-cyan uppercase tracking-wider">
                      OID: {orgOid}
                    </span>
                  </TermTooltip>
                )}
              </div>
            </div>
            {isUnverified && (
              <div className="ml-0 sm:ml-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {t("unverifiedOrg")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* MAIN CONTENT - 2 COLUMNS */}
            <div className="lg:col-span-2 space-y-10">

              <div className="prose prose-invert max-w-none">
                <h3 className="text-2xl font-bold text-white mb-4">{t("projectDescription")}</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg">{project.description}</p>
              </div>

              {project.themes && project.themes.length > 0 && (
                <div>
                  <h4 className="text-gray-400 font-bold mb-4 uppercase text-sm tracking-wider">{t("themes")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.themes.map((theme: string) => (
                      <span key={theme} className="px-4 py-1.5 bg-hyper-violet/10 text-hyper-violet rounded-lg text-sm font-bold border border-hyper-violet/20">{theme}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Auto-Moderated Q&A Forum */}
              <ProjectForum projectId={project.id} projectTitle={project.title} />
            </div>

            {/* SIDEBAR DETAILS - 1 COLUMN */}
            <div className="space-y-6">
              
              {/* Distance Calculator */}
              <DistanceCalculator
                userCountryCode={userCountry}
                destCountryCode={project.dest_country || project.country}
              />

              <div className="bg-void-deep p-6 rounded-2xl border border-void-border space-y-5">
                <h4 className="text-gray-400 font-bold uppercase text-xs tracking-wider border-b border-void-border pb-3">{t("missionDetails")}</h4>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{tGeneral("exactLocation")}</p>
                    <p className="text-white font-semibold">{project.exact_location || t("notSpecified")}</p>
                    <div className="text-gray-400 text-sm">{destCountryNode}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{t("ageRange")}</p>
                    <p className="text-white font-semibold">{project.min_age} - {project.max_age} {t("yearsCount", { count: project.max_age })}</p>
                    {project.target_profile && <p className="text-gray-400 text-sm">{project.target_profile}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{t("duration")}</p>
                    <p className="text-white font-semibold">{project.duration_days ? t("durationDaysCount", { count: project.duration_days }) : t("notSpecified")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Euro className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{t("budget")}</p>
                    {project.travel_budget_min || project.travel_budget_max ? (
                      <p className="text-white font-semibold">
                        {project.travel_budget_min ? `${format.number(project.travel_budget_min)}€` : "0€"} - {project.travel_budget_max ? `${format.number(project.travel_budget_max)}€` : t("noLimit")}
                      </p>
                    ) : (
                      <p className="text-white font-semibold">{project.travel_budget ? `${format.number(project.travel_budget)}€` : t("variableBudget")}</p>
                    )}
                    {project.participation_fee > 0 && <p className="text-gray-400 text-sm">{t("fee")} {format.number(project.participation_fee)}€</p>}
                  </div>
                </div>

                {eligibleCountriesNodes.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Globe2 className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400 font-medium">{tGeneral("eligibleCountries")}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {eligibleCountriesNodes}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-4 pt-4">
                {project.official_url ? (
                  <a 
                    href={project.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-6 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-void-deep bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-[0.98] text-lg cursor-pointer group"
                  >
                    <ExternalLink className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    {t("applyToMission")}
                  </a>
                ) : (
                  <button disabled className="w-full px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-gray-500 bg-void-deep border border-void-border text-lg cursor-not-allowed">
                    {t("urlNotAvailable")}
                  </button>
                )}

                {/* Omnichannel Share Component */}
                <ShareProject
                  project={{
                    id: project.id,
                    title: project.title,
                    dest_country: project.dest_country || project.country,
                    project_type: project.project_type || project.mission_type,
                    exact_location: project.exact_location,
                    duration_days: project.duration_days,
                    min_age: project.min_age,
                    max_age: project.max_age,
                    image_url: project.image_url,
                    org_name: orgName,
                  }}
                />

                {canDelete && (
                  <form action={async () => {
                    "use server";
                    await deleteProjectAction(project.id);
                  }}>
                    <button type="submit" className="w-full px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-sm cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                      {t("deleteProject")}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
