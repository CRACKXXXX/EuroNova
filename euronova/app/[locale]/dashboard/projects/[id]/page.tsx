import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Calendar, Euro, MapPin, CheckCircle2, Rocket, Building, AlertTriangle, Trash2, ExternalLink, Users, Globe2, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { deleteProjectAction } from "./actions";
import { COUNTRIES } from "@/components/CountrySelect";

export const dynamic = 'force-dynamic';

export default async function ProjectDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = await getTranslations("ProjectDetails");
  const tGeneral = await getTranslations("NewProject"); // to reuse some generic keys if needed
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*, users_org(org_name, verification_status)")
    .eq("id", params.id)
    .single();

  if (error || !project) {
    notFound();
  }

  const isOwner = user?.id === project.org_id;
  const isAdmin = user?.email === "euronovaofficial@gmail.com";
  const canDelete = isOwner || isAdmin;

  const orgName = project.users_org?.org_name || "Unknown Organization";
  const isUnverified = project.users_org?.verification_status !== "verified";

  // Map dest_country and eligible_countries to full names
  const destCountryObj = COUNTRIES.find(c => c.code === (project.dest_country || project.country));
  const destCountryName = destCountryObj ? `${destCountryObj.flag} ${destCountryObj.name}` : (project.dest_country || project.country);

  const eligibleCountriesNames = project.eligible_countries
    ? project.eligible_countries.map((code: string) => {
        const cObj = COUNTRIES.find(c => c.code === code);
        return cObj ? `${cObj.flag} ${cObj.name}` : code;
      })
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-2">
        <Link href="/dashboard/projects" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t("backToProjects")}</span>
        </Link>
      </div>

      <div className="bg-void-surface border border-void-border rounded-3xl overflow-hidden shadow-2xl">
        
        {/* HERO IMAGE */}
        {project.image_url ? (
          <div className="w-full h-64 md:h-80 relative bg-void-deep">
            <Image src={project.image_url} alt={project.title} fill className="object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-void-surface to-transparent" />
          </div>
        ) : (
          <div className="w-full h-32 md:h-48 bg-gradient-to-r from-void-deep to-void-surface relative" />
        )}

        <div className="p-8 md:p-12 relative -mt-20 md:-mt-32 z-10">
          
          {/* BADGES */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-void-border text-gray-200 uppercase tracking-wider shadow-lg">
              {project.project_type || project.mission_type}
            </span>
            {project.is_last_minute && (
              <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30 shadow-lg">
                ÚLTIMA HORA
              </span>
            )}
            {project.covers_rup_flights && (
              <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30 shadow-lg">
                VUELOS RUP
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-md">
            {project.title}
          </h1>

          {/* PUBLISHER PROFILE CARD */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-void-deep/80 border border-void-border backdrop-blur-sm mb-10 w-fit">
            <div className="w-12 h-12 rounded-full bg-plasma-cyan/10 flex items-center justify-center border border-plasma-cyan/20 shrink-0">
              <Building className="w-6 h-6 text-plasma-cyan" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{t("publisherProfile")}</p>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                {orgName}
              </h3>
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
            </div>

            {/* SIDEBAR DETAILS - 1 COLUMN */}
            <div className="space-y-6">
              
              <div className="bg-void-deep p-6 rounded-2xl border border-void-border space-y-5">
                <h4 className="text-gray-400 font-bold uppercase text-xs tracking-wider border-b border-void-border pb-3">{t("missionDetails")}</h4>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{tGeneral("exactLocation")}</p>
                    <p className="text-white font-semibold">{project.exact_location || t("notSpecified")}</p>
                    <p className="text-gray-400 text-sm">{destCountryName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{t("ageRange")}</p>
                    <p className="text-white font-semibold">{project.min_age} - {project.max_age} {t("years")}</p>
                    {project.target_profile && <p className="text-gray-400 text-sm">{project.target_profile}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{t("duration")}</p>
                    <p className="text-white font-semibold">{project.duration_days ? `${project.duration_days} ${t("days")}` : t("notSpecified")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Euro className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{t("budget")}</p>
                    {project.travel_budget_min || project.travel_budget_max ? (
                      <p className="text-white font-semibold">
                        {project.travel_budget_min ? `${project.travel_budget_min}€` : "0€"} - {project.travel_budget_max ? `${project.travel_budget_max}€` : "No limit"}
                      </p>
                    ) : (
                      <p className="text-white font-semibold">{project.travel_budget ? `${project.travel_budget}€` : t("variableBudget")}</p>
                    )}
                    {project.participation_fee > 0 && <p className="text-gray-400 text-sm">{t("fee")} {project.participation_fee}€</p>}
                  </div>
                </div>

                {eligibleCountriesNames.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Globe2 className="w-5 h-5 text-plasma-cyan shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Países Elegibles</p>
                      <p className="text-white font-semibold text-sm leading-relaxed">
                        {eligibleCountriesNames.join(", ")}
                      </p>
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
                    className="w-full px-6 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-void-deep bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] text-lg"
                  >
                    <ExternalLink className="w-5 h-5" />
                    {t("applyToMission")}
                  </a>
                ) : (
                  <button disabled className="w-full px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-gray-500 bg-void-deep border border-void-border text-lg cursor-not-allowed">
                    {t("urlNotAvailable")}
                  </button>
                )}

                {canDelete && (
                  <form action={deleteProjectAction.bind(null, project.id)}>
                    <button type="submit" className="w-full px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-sm">
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
