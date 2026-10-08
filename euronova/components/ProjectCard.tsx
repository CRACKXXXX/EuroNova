import { MapPin, Users, Zap, PlaneTakeoff, AlertTriangle, Building, Clock, Euro, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";

export interface ProjectData {
  id: string;
  title: string;
  project_type: string;
  dest_country: string;
  min_age: number;
  max_age: number;
  covers_rup_flights: boolean;
  is_last_minute: boolean;
  themes: string[] | null;
  org_name?: string;
  verification_status?: string;
  exact_location?: string;
  duration_days?: number;
  travel_budget_min?: number;
  travel_budget_max?: number;
  financing_type?: string;
}

export function ProjectCard({ project }: { project: ProjectData }) {
  const t = useTranslations("ProjectCard");
  return (
    <div className="bg-void-surface border border-void-border rounded-2xl overflow-hidden hover:border-plasma-cyan/50 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)] transition-all duration-300 group flex flex-col h-full">
      
      {/* Header section with Badges */}
      <div className="p-5 flex-grow relative">
        <div className="flex flex-wrap gap-2 mb-3">
          {project.verification_status !== 'verified' && (
            <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t('unverifiedOrgWarning') || "Unverified Organization"}
            </span>
          )}
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-void-border text-gray-300 uppercase tracking-wider">
            {project.project_type}
          </span>
          {project.is_last_minute && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30 flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3" /> {t("lastMinute")}
            </span>
          )}
          {project.covers_rup_flights && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
              <PlaneTakeoff className="w-3 h-3" /> {t("rupFlights")}
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-plasma-cyan transition-colors">
          {project.title}
        </h3>

        {project.org_name && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
            <Building className="w-4 h-4" />
            <span className="line-clamp-1">{project.org_name}</span>
          </div>
        )}

        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-plasma-cyan" />
            <span className="font-medium text-gray-300 flex items-center gap-1.5 flex-wrap">
              {(() => {
                if (!project.dest_country) return <span>{t("europe")}</span>;
                const c = COUNTRIES.find(x => x.code === project.dest_country);
                return c ? (
                  <>
                    <img src={c.flagUrl} alt={c.name} className="w-4 h-auto rounded-[2px]" title={c.name} />
                    <span>{c.name}</span>
                  </>
                ) : <span>{project.dest_country}</span>;
              })()}
              {project.exact_location ? <span>, {project.exact_location}</span> : null}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-hyper-violet" />
            <span>{project.min_age} - {project.max_age} {t("years")}</span>
          </div>
          {(project.duration_days) && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{project.duration_days} {t("days", { defaultValue: "days" })}</span>
            </div>
          )}
          {(project.travel_budget_min !== undefined || project.travel_budget_max !== undefined) && (
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-rup-emerald" />
              <span>
                {project.travel_budget_min !== undefined ? `€${project.travel_budget_min}` : "€0"} - {project.travel_budget_max !== undefined ? `€${project.travel_budget_max}` : "No limit"}
              </span>
            </div>
          )}
          {project.financing_type && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-plasma-cyan" />
              <span>{t("financingType", { defaultValue: "Financing" })}: {t(project.financing_type.toLowerCase(), { defaultValue: project.financing_type })}</span>
            </div>
          )}
        </div>

        {/* Themes */}
        {project.themes && project.themes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.themes.slice(0, 3).map((theme, i) => (
              <span key={i} className="px-2 py-0.5 text-[10px] uppercase font-medium bg-void-deep text-gray-400 rounded-md border border-void-border">
                {theme}
              </span>
            ))}
            {project.themes.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] uppercase font-medium bg-void-deep text-gray-500 rounded-md border border-void-border">
                +{project.themes.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-void-border bg-void-deep/50 mt-auto">
        <Link href={`/dashboard/projects/${project.id}`} className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-plasma-cyan/10 text-white font-medium text-sm transition-colors border border-transparent hover:border-plasma-cyan/30 flex justify-center items-center gap-2">
          {t('viewDetails') || "View Details"}
        </Link>
      </div>
    </div>
  );
}
