import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Euro, MapPin, AlertTriangle, Trash2, ExternalLink, Users, Globe2, Clock, ShieldCheck, Calendar } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import Image from "next/image";
import type { Metadata } from "next";
import { deleteProjectAction } from "./actions";
import { getUserRole } from "@/lib/roles";
import { COUNTRIES } from "@/lib/constants/countries";
import { TermTooltip } from "@/components/TermTooltip";
import { DistanceCalculator } from "@/components/DistanceCalculator";
import { ShareProject } from "@/components/ShareProject";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ReportMissionButton } from "@/components/ReportMissionButton";
import { TrackRecentlyViewed } from "@/components/TrackRecentlyViewed";
import { ProjectForum } from "@/components/ProjectForum";
import { routing } from "@/i18n/routing";
import { AvatarFallback } from "@/components/AvatarFallback";
import { cleanProjectDescription } from "@/lib/formatters/projectDescription";
import { ProjectDossierApplyModal } from "@/components/ProjectDossierApplyModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import type { DossierTemplate, DossierSubmission } from "@/actions/dossier";

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  props: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
  const [{ locale, id }, supabase] = await Promise.all([
    props.params,
    createClient(),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://euronova.space";

  const { data: project } = await supabase
    .from("projects")
    .select("title, description, dest_country, project_type, org_id, users_org(org_name, avatar_url)")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    return {
      title: "Mission Not Found",
      description: "The requested Erasmus+ or ESC mobility project could not be found.",
    };
  }

  const projectTitle = project.title ? project.title.trim() : "EuroNova Mobility Mission";
  const rawDescription = project.description || "";
  // Strip markdown formatting, headers, brackets, and excessive whitespace for SEO snippet
  const cleanDescription =
    rawDescription
      .replace(/[#*_`~>\[\]\(\)]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "Discover verified Erasmus+ and European Solidarity Corps youth mobility missions on EuroNova.";

  // Safe cover image resolution with fallback to EuroNova brand assets
  const orgData = Array.isArray(project.users_org) ? project.users_org[0] : project.users_org;
  const candidateImage =
    (project as { cover_image_url?: string; image_url?: string }).cover_image_url ||
    (project as { cover_image_url?: string; image_url?: string }).image_url ||
    orgData?.avatar_url ||
    "/logo-big.png";

  const absoluteImageUrl = candidateImage.startsWith("http")
    ? candidateImage
    : `${siteUrl.replace(/\/$/, "")}${candidateImage.startsWith("/") ? "" : "/"}${candidateImage}`;

  const languageAlternates: Record<string, string> = {};
  for (const l of routing.locales) {
    languageAlternates[l] = `/${l}/dashboard/projects/${id}`;
  }
  languageAlternates["x-default"] = `/${routing.defaultLocale}/dashboard/projects/${id}`;

  const canonicalUrl = `${siteUrl.replace(/\/$/, "")}/${locale}/dashboard/projects/${id}`;

  return {
    title: projectTitle,
    description: cleanDescription,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      type: "article",
      locale,
      url: canonicalUrl,
      siteName: "EuroNova",
      title: projectTitle,
      description: cleanDescription,
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: projectTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: projectTitle,
      description: cleanDescription,
      images: [absoluteImageUrl],
    },
  };
}

export default async function ProjectDetailsPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const [params, t, tGeneral, format, supabase] = await Promise.all([
    props.params,
    getTranslations("ProjectDetails"),
    getTranslations("NewProject"),
    getFormatter(),
    createClient(),
  ]);
  
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
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  const isOwner = user?.id === project.org_id;
  const userRole = user ? await getUserRole(user.id, user.email) : "user";
  const isAdmin =
    userRole === "admin" ||
    userRole === "root" ||
    user?.email === "euronovaofficial@gmail.com";
  const canDelete = isOwner || isAdmin;

  // Fetch attached dossier template if defined
  let attachedTemplate: DossierTemplate | null = null;
  let volunteerSubmission: DossierSubmission | null = null;

  if (project.application_form_id) {
    const { data: tplData } = await supabase
      .from("org_surveys")
      .select("id, org_id, title, description, questions, created_at, updated_at")
      .eq("id", project.application_form_id)
      .maybeSingle();

    if (tplData) {
      attachedTemplate = {
        id: tplData.id,
        org_id: tplData.org_id,
        title: tplData.title || "Candidate Application Dossier",
        description: tplData.description || null,
        questions: Array.isArray(tplData.questions) ? (tplData.questions as unknown as DossierTemplate["questions"]) : [],
        created_at: tplData.created_at || new Date().toISOString(),
        updated_at: tplData.updated_at || new Date().toISOString(),
      };
    }

    if (user) {
      const { data: subData } = await supabase
        .from("project_dossier_submissions")
        .select("id, project_id, survey_id, user_id, answers, status, created_at, updated_at")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (subData) {
        volunteerSubmission = {
          id: subData.id,
          project_id: subData.project_id,
          survey_id: subData.survey_id,
          user_id: subData.user_id,
          answers: (subData.answers as Record<string, unknown>) || {},
          status: subData.status as "submitted" | "shortlisted" | "accepted" | "rejected",
          created_at: subData.created_at,
          updated_at: subData.updated_at,
        };
      }
    }
  }

  // Load org templates if owner or admin for EditProjectModal
  let orgTemplates: { id: string; title: string }[] = [];
  if (canDelete && project.org_id) {
    const { data: tpls } = await supabase
      .from("org_surveys")
      .select("id, title")
      .eq("org_id", project.org_id)
      .order("updated_at", { ascending: false });
    if (tpls && Array.isArray(tpls)) {
      orgTemplates = tpls.map((t) => ({ id: t.id, title: t.title || "Application Dossier" }));
    }
  }

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
              title={t("antiScamVerifiedTitle")}
              className="px-3 py-1.5 text-xs font-bold rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_15px_rgba(0,230,118,0.25)] flex items-center gap-1.5 select-none"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rup-emerald" />
              <span>{t("antiScamVerified")}</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-md">
            {project.title}
          </h1>

          {/* PUBLISHER PROFILE CARD */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-void-deep/80 border border-void-border backdrop-blur-sm mb-10 w-full sm:w-fit">
            <AvatarFallback
              src={orgLogo}
              alt={orgName}
              fallbackType="org"
              name={orgName}
              sizeClassName="w-12 h-12"
              className="border border-void-border bg-void-deep shadow-[0_0_15px_rgba(0,229,255,0.15)]"
              iconClassName="w-6 h-6 text-plasma-cyan"
            />
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
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg">
                  {cleanProjectDescription(
                    project.description,
                    {
                      title: project.title,
                      startDate: project.start_date,
                      endDate: project.end_date,
                      location: project.exact_location,
                      country: project.dest_country,
                      eligibleCountries: project.eligible_countries,
                      accommodationCovered: project.accommodation_covered,
                    },
                    t("exploreVerifiedOpportunity")
                  )}
                </p>
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

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{t("dates")}</p>
                    <p className="text-white font-semibold">
                      {project.start_date && project.end_date
                        ? `${project.start_date} — ${project.end_date}`
                        : project.start_date
                        ? `${project.start_date} (${t("datesTba")})`
                        : t("datesTba")}
                    </p>
                  </div>
                </div>

                {project.application_deadline && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-nova-flare shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400 font-medium">{t("deadline")}</p>
                      <p className="text-nova-flare font-bold">{project.application_deadline}</p>
                    </div>
                  </div>
                )}

                {project.participant_count && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400 font-medium">{t("participants")}</p>
                      <p className="text-white font-semibold">{project.participant_count}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-4 pt-4">
                {attachedTemplate ? (
                  <div className="space-y-3">
                    <ProjectDossierApplyModal
                      projectId={project.id}
                      projectTitle={project.title}
                      orgName={orgName}
                      template={attachedTemplate}
                      initialSubmission={volunteerSubmission}
                      isLoggedIn={!!user}
                      userEmail={user?.email}
                      locale={params.locale}
                    />
                    {project.official_url && (
                      <a
                        href={project.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-gray-400 hover:text-white bg-void-deep hover:bg-void-surface border border-void-border text-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t("externalPortalInfopack")}</span>
                      </a>
                    )}
                  </div>
                ) : project.official_url ? (
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

                {/* Owner / Staff Management Controls: Edit Mission & Delete */}
                {canDelete && (
                  <div className="pt-2 space-y-2 border-t border-void-border/70">
                    <EditProjectModal
                      project={{
                        id: project.id,
                        title: project.title,
                        description: project.description,
                        project_type: project.project_type || "ESC",
                        dest_country: project.dest_country || project.country || "ES",
                        exact_location: project.exact_location,
                        official_url: project.official_url,
                        target_profile: project.target_profile,
                        min_age: project.min_age ?? 18,
                        max_age: project.max_age ?? 30,
                        duration_days: project.duration_days,
                        travel_budget_min: project.travel_budget_min,
                        travel_budget_max: project.travel_budget_max,
                        participation_fee: project.participation_fee,
                        financing_type: project.financing_type,
                        covers_rup_flights: !!project.covers_rup_flights,
                        is_last_minute: !!project.is_last_minute,
                        accommodation_covered: !!project.accommodation_covered,
                        themes: project.themes || [],
                        eligible_countries: project.eligible_countries || [],
                        start_date: project.start_date,
                        end_date: project.end_date,
                        application_deadline: project.application_deadline,
                        participant_count: project.participant_count,
                        application_form_id: project.application_form_id,
                        image_url: project.image_url,
                      }}
                      dossierTemplates={orgTemplates}
                    />
                    <form action={async () => {
                      "use server";
                      await deleteProjectAction(project.id);
                    }}>
                      <button type="submit" className="w-full px-6 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                        <span>{t("deleteProject")}</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
