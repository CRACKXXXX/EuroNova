"use client";

import { useState, useTransition } from "react";
import { 
  MapPin, 
  Users, 
  Zap, 
  PlaneTakeoff, 
  AlertTriangle, 
  Building, 
  Clock, 
  Euro, 
  Wallet,
  Heart,
  Briefcase,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";
import { PROJECT_TYPE_COLORS } from "@/lib/constants/projectTypes";
import { toggleProjectFavorite, toggleProjectApplied } from "@/actions/interactions";
import { TermTooltip } from "@/components/TermTooltip";
import { toast } from "sonner";

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
  org_logo_url?: string;
  verification_status?: string;
  exact_location?: string;
  duration_days?: number;
  travel_budget_min?: number | null;
  travel_budget_max?: number | null;
  financing_type?: string;
  is_favorite?: boolean;
  is_applied?: boolean;
  created_at?: string;
}

export function ProjectCard({ project }: { project: ProjectData }) {
  const t = useTranslations("ProjectCard");
  const tTypes = useTranslations("ProjectTypes");
  const format = useFormatter();

  const [isFavorite, setIsFavorite] = useState(project.is_favorite ?? false);
  const [isApplied, setIsApplied] = useState(project.is_applied ?? false);
  const [isPendingFav, startFavTransition] = useTransition();
  const [isPendingApp, startAppTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calcula si el proyecto fue creado en las últimas 24 horas (Pure evaluation)
  const [isNew] = useState(() => {
    if (!project.created_at) return false;
    const createdTime = new Date(project.created_at).getTime();
    return !isNaN(createdTime) && Date.now() - createdTime < 24 * 60 * 60 * 1000;
  });

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const previousState = isFavorite;
    const nextState = !previousState;
    setIsFavorite(nextState);

    startFavTransition(async () => {
      const res = await toggleProjectFavorite(project.id);
      if (res?.error) {
        setIsFavorite(previousState);
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 3500);
      } else if (res?.is_favorite !== undefined) {
        setIsFavorite(res.is_favorite);
      }
    });
  };

  const handleToggleApplied = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const previousState = isApplied;
    const nextState = !previousState;
    setIsApplied(nextState);

    startAppTransition(async () => {
      const res = await toggleProjectApplied(project.id);
      if (res?.error) {
        setIsApplied(previousState);
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 3500);
      } else if (res?.is_applied !== undefined) {
        setIsApplied(res.is_applied);
        if (res.is_applied && res.xpGained) {
          toast.success(t("appLoggedXp", { xp: res.xpGained }), { icon: "🚀" });
          if (res.leveledUp) {
            toast.success(t("appLoggedLevelUp", { level: res.newLevel ?? 1 }), { icon: "⚡" });
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("euronova:xp-updated", { 
              detail: { xpGained: res.xpGained, level: res.newLevel } 
            }));
          }
        } else if (res.is_applied && !res.xpGained) {
          toast.info(t("appLoggedAlreadyClaimed"), { icon: "📋" });
        }
      }
    });
  };

  return (
    <div className="bg-void-surface border border-void-border rounded-2xl overflow-visible hover:border-plasma-cyan/50 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)] transition-all duration-300 group/card flex flex-col h-full relative">
      {/* Badge "NEW" 24h con pulso y brillo neón */}
      {isNew && (
        <span className="absolute top-3 right-3 px-2 py-1 text-[10px] font-bold bg-nova-flare/20 text-nova-flare border border-nova-flare/40 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,46,99,0.3)] z-20">
          NEW
        </span>
      )}

      {/* Notificación de error optimista */}
      {errorMessage && (
        <div className="absolute top-2 left-2 right-2 z-30 bg-nova-flare/95 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-white/20 backdrop-blur-md animate-in fade-in">
          {errorMessage}
        </div>
      )}

      {/* Header section with Badges and Interactive Action Buttons */}
      <div className="p-5 flex-grow relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Badges de estado */}
          <div className="flex flex-wrap gap-2 items-center flex-1">
            {project.verification_status !== "verified" &&
              project.org_name !== "EuroNova Auto-Scraper" &&
              project.org_name !== "EuroNova" && (
                <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t("unverifiedOrgWarning")}
                </span>
              )}

            {(() => {
              const colorClass =
                PROJECT_TYPE_COLORS[project.project_type] ||
                "bg-void-border/80 text-gray-300 border-void-border";
              const fullTitle = tTypes.has(project.project_type)
                ? tTypes(project.project_type)
                : project.project_type;

              const badge = (
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${colorClass}`}
                  title={fullTitle}
                >
                  {project.project_type}
                </span>
              );

              return (
                <TermTooltip key="project-type" term={project.project_type}>
                  {badge}
                </TermTooltip>
              );
            })()}

            {project.is_last_minute && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30 flex items-center gap-1 animate-pulse">
                <Zap className="w-3 h-3" /> {t("lastMinute")}
              </span>
            )}

            {project.covers_rup_flights && (
              <TermTooltip term="ORs">
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
                  <PlaneTakeoff className="w-3 h-3" /> {t("rupFlights")}
                </span>
              </TermTooltip>
            )}

            {/* AI Anti-Scam Shield micro-badge */}
            <div
              title={t("aiSecurityTooltip")}
              className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_12px_rgba(0,230,118,0.25)] flex items-center gap-1 cursor-help shrink-0"
            >
              <ShieldCheck className="w-3 h-3 text-rup-emerald shrink-0" />
              <span>{t("aiSecurityChecked")}</span>
            </div>
          </div>

          {/* Botones de acción interactiva: Guardar (Favorite) y Aplicar (Applied) */}
          <div className={`flex items-center gap-1.5 shrink-0 z-10 transition-all ${isNew ? "mt-6" : ""}`}>
            {/* Botón Favorito */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={isPendingFav}
              title={isFavorite ? t("removeFromFavorites") : t("addToFavorites")}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                isFavorite
                  ? "bg-nova-flare/20 border-nova-flare/60 text-nova-flare shadow-[0_0_12px_rgba(255,46,99,0.35)]"
                  : "bg-void-deep/80 border-void-border text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  isFavorite ? "fill-nova-flare scale-110" : ""
                }`}
              />
            </button>

            {/* Botón Aplicado */}
            <button
              type="button"
              onClick={handleToggleApplied}
              disabled={isPendingApp}
              title={isApplied ? t("applied") : t("markAsApplied")}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                isApplied
                  ? "bg-hyper-violet/25 border-hyper-violet/60 text-hyper-violet shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                  : "bg-void-deep/80 border-void-border text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              <Briefcase
                className={`w-4 h-4 transition-transform ${
                  isApplied ? "fill-hyper-violet/40 scale-110" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover/card:text-plasma-cyan transition-colors min-w-0 break-words hyphens-auto">
          {project.title}
        </h3>

        {/* Fallback de logo o avatar de la organización */}
        {project.org_name && (
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-4 min-w-0">
            {project.org_logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={project.org_logo_url}
                alt={project.org_name}
                className="w-5 h-5 rounded-full object-cover border border-void-border shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-void-surface to-plasma-cyan/20 border border-plasma-cyan/30 flex items-center justify-center shrink-0">
                <Building className="w-3 h-3 text-plasma-cyan" />
              </div>
            )}
            <span className="line-clamp-1 font-medium min-w-0 break-words">{project.org_name}</span>
          </div>
        )}

        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-plasma-cyan" />
            <span className="font-medium text-gray-300 flex items-center gap-1.5 flex-wrap">
              {(() => {
                if (!project.dest_country) return <span>{t("europe")}</span>;
                const c = COUNTRIES.find((x) => x.code === project.dest_country);
                return c ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.flagUrl} alt={c.name} className="w-4 h-auto rounded-[2px]" title={c.name} />
                    <span>{c.name}</span>
                  </>
                ) : (
                  <span>{project.dest_country}</span>
                );
              })()}
              {project.exact_location ? <span>, {project.exact_location}</span> : null}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-hyper-violet" />
            <span>
              {project.min_age} - {project.max_age} {t("yearsCount", { count: project.max_age })}
            </span>
          </div>

          {project.duration_days && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>
                {t("durationDaysCount", { count: project.duration_days })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Euro className="w-4 h-4 text-rup-emerald shrink-0" />
            <span className="truncate">
              {project.travel_budget_min != null || project.travel_budget_max != null
                ? `${project.travel_budget_min != null ? "€" + format.number(project.travel_budget_min) : "€0"} - ${
                    project.travel_budget_max != null ? "€" + format.number(project.travel_budget_max) : t("noLimit")
                  }`
                : t("notSpecified")}
            </span>
          </div>

          {project.financing_type && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-plasma-cyan" />
              <span>
                {t("financingType")}: {project.financing_type}
              </span>
            </div>
          )}
        </div>

        {/* Themes */}
        {project.themes && project.themes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.themes.slice(0, 3).map((theme, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] uppercase font-medium bg-void-deep text-gray-400 rounded-md border border-void-border"
              >
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
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-plasma-cyan/10 text-white font-medium text-sm transition-colors border border-transparent hover:border-plasma-cyan/30 flex justify-center items-center gap-2 text-center break-words min-w-0 px-3"
        >
          {t("viewDetails")}
        </Link>
      </div>
    </div>
  );
}
