"use client";

import { useState, useTransition, useRef } from "react";
import { 
  MapPin, 
  Users, 
  Zap, 
  PlaneTakeoff, 
  AlertTriangle, 
  Clock, 
  Euro, 
  Wallet,
  Heart,
  Briefcase,
  ShieldCheck
} from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useTranslations, useFormatter } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";
import { PROJECT_TYPE_COLORS } from "@/lib/constants/projectTypes";
import { toggleProjectFavorite, toggleProjectApplied } from "@/actions/interactions";
import { TermTooltip } from "@/components/TermTooltip";
import { AvatarFallback } from "@/components/AvatarFallback";
import { CosmicTooltip } from "@/components/CosmicTooltip";
import { toast } from "sonner";
import { showRateLimitToast } from "@/lib/rateLimitToast";

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

export interface ProjectCardProps {
  project: ProjectData;
  onToggleFavorite?: (projectId: string, isFavorite: boolean) => void;
  onToggleApplied?: (projectId: string, isApplied: boolean) => void;
}

export function ProjectCard({
  project,
  onToggleFavorite,
  onToggleApplied,
}: ProjectCardProps) {
  const t = useTranslations("ProjectCard");
  const tErrors = useTranslations("Errors");
  const tThemes = useTranslations("ProjectThemes");
  const format = useFormatter();

  const [isFavorite, setIsFavorite] = useState(project.is_favorite ?? false);
  const [isApplied, setIsApplied] = useState(project.is_applied ?? false);
  const [isPendingFav, startFavTransition] = useTransition();
  const [isPendingApp, startAppTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightFavoriteRef = useRef(false);
  const inFlightAppliedRef = useRef(false);

  // Sync state during render if prop changes from parent
  const [prevFavProp, setPrevFavProp] = useState(project.is_favorite);
  if (project.is_favorite !== prevFavProp) {
    setPrevFavProp(project.is_favorite);
    setIsFavorite(project.is_favorite ?? false);
  }

  const [prevAppProp, setPrevAppProp] = useState(project.is_applied);
  if (project.is_applied !== prevAppProp) {
    setPrevAppProp(project.is_applied);
    setIsApplied(project.is_applied ?? false);
  }

  // Pure evaluation of 24h freshness
  const [isNew] = useState(() => {
    if (!project.created_at) return false;
    const createdTime = new Date(project.created_at).getTime();
    return !isNaN(createdTime) && Date.now() - createdTime < 24 * 60 * 60 * 1000;
  });

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inFlightFavoriteRef.current) return;
    inFlightFavoriteRef.current = true;

    const previousState = isFavorite;
    const nextState = !previousState;
    setIsFavorite(nextState);
    onToggleFavorite?.(project.id, nextState);

    startFavTransition(async () => {
      try {
        const res = await toggleProjectFavorite(project.id);
        if (res?.error) {
          setIsFavorite(previousState);
          onToggleFavorite?.(project.id, previousState);
          if (res.error === "RATE_LIMIT_EXCEEDED") {
            showRateLimitToast(tErrors("rateLimitExceeded"));
          } else {
            setErrorMessage(res.error);
            setTimeout(() => setErrorMessage(null), 3500);
          }
        } else if (res?.is_favorite !== undefined) {
          setIsFavorite(res.is_favorite);
          onToggleFavorite?.(project.id, res.is_favorite);
        }
      } catch (err: unknown) {
        setIsFavorite(previousState);
        onToggleFavorite?.(project.id, previousState);
        const msg = err instanceof Error ? err.message : "Failed to update favorite status.";
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 3500);
      } finally {
        inFlightFavoriteRef.current = false;
      }
    });
  };

  const handleToggleApplied = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inFlightAppliedRef.current) return;
    inFlightAppliedRef.current = true;

    const previousState = isApplied;
    const nextState = !previousState;
    setIsApplied(nextState);
    onToggleApplied?.(project.id, nextState);

    startAppTransition(async () => {
      try {
        const res = await toggleProjectApplied(project.id);
        if (res?.error) {
          setIsApplied(previousState);
          onToggleApplied?.(project.id, previousState);
          if (res.error === "RATE_LIMIT_EXCEEDED") {
            showRateLimitToast(tErrors("rateLimitExceeded"));
          } else {
            setErrorMessage(res.error);
            setTimeout(() => setErrorMessage(null), 3500);
          }
        } else if (res?.is_applied !== undefined) {
          setIsApplied(res.is_applied);
          onToggleApplied?.(project.id, res.is_applied);
          if (res.is_applied && res.xpGained) {
            toast.success(t("appLoggedXp", { xp: res.xpGained }), { icon: "✨" });
            if (res.leveledUp) {
              toast.success(t("appLoggedLevelUp", { level: res.newLevel ?? 1 }), { icon: "🎉" });
            }
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("euronova:xp-updated", { 
                detail: { xpGained: res.xpGained, level: res.newLevel } 
              }));
            }
          } else if (res.is_applied && !res.xpGained) {
            toast.info(t("appLoggedAlreadyClaimed"), { icon: "ℹ️" });
          }
        }
      } catch (err: unknown) {
        setIsApplied(previousState);
        onToggleApplied?.(project.id, previousState);
        const msg = err instanceof Error ? err.message : "Failed to update application status.";
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 3500);
      } finally {
        inFlightAppliedRef.current = false;
      }
    });
  };

  return (
    <div className="bg-void-surface border border-void-border rounded-2xl overflow-visible hover:border-plasma-cyan/40 hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.7),0_0_15px_rgba(0,229,255,0.15)] hover:-translate-y-1.5 transition-all duration-300 ease-out group/card flex flex-col h-full relative">
      {/* Shimmer Sheen & Ambient Nebula Glow - Strictly clipped within rounded bounds to prevent overflow artifacts */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 -translate-x-full group-hover/card:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-plasma-cyan/5 to-transparent" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/[0.03] rounded-full blur-2xl group-hover/card:bg-plasma-cyan/[0.08] transition-colors duration-500" />
      </div>

      {/* Badge "NEW" 24h con pulso y brillo neón */}
      {isNew && (
        <span className="absolute top-3 right-3 px-2 py-1 text-[10px] font-bold bg-nova-flare/20 text-nova-flare border border-nova-flare/40 rounded-full animate-cosmic-breathing shadow-[0_0_12px_rgba(255,46,99,0.35)] z-20">
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

              const badge = (
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${colorClass}`}
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
            <CosmicTooltip content={t("antiScamVerifiedTitle")} side="top">
              <div
                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_10px_rgba(0,230,118,0.2)] flex items-center gap-1 shrink-0 select-none cursor-default hover:scale-105 transition-all duration-300 ease-out"
              >
                <ShieldCheck className="w-3 h-3 text-rup-emerald shrink-0" />
                <span>{t("antiScamVerified")}</span>
              </div>
            </CosmicTooltip>
          </div>

          {/* Botones de acción interactiva: Guardar (Favorite) y Aplicar (Applied) con física táctil suave */}
          <div className={`flex items-center gap-1.5 shrink-0 z-10 transition-all ${isNew ? "mt-6" : ""}`}>
            {/* Botón Favorito */}
            <CosmicTooltip content={isFavorite ? t("removeFromFavorites") : t("addToFavorites")} side="top">
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={isPendingFav}
                aria-label={isFavorite ? t("removeFromFavorites") : t("addToFavorites")}
                className={`p-2 rounded-xl border transition-all duration-300 ease-out cursor-pointer hover:scale-105 active:scale-95 ${
                  isFavorite
                    ? "bg-nova-flare/20 border-nova-flare/50 text-nova-flare shadow-[0_0_12px_rgba(255,46,99,0.3)]"
                    : "bg-void-deep/80 border-void-border text-gray-400 hover:text-white hover:border-gray-500 hover:shadow-[0_0_10px_rgba(255,255,255,0.08)]"
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-transform duration-300 ease-out ${
                    isFavorite ? "fill-nova-flare scale-105" : ""
                  }`}
                />
              </button>
            </CosmicTooltip>

            {/* Botón Aplicado */}
            <CosmicTooltip content={isApplied ? t("applied") : t("markAsApplied")} side="top">
              <button
                type="button"
                onClick={handleToggleApplied}
                disabled={isPendingApp}
                aria-label={isApplied ? t("applied") : t("markAsApplied")}
                className={`p-2 rounded-xl border transition-all duration-300 ease-out cursor-pointer hover:scale-105 active:scale-95 ${
                  isApplied
                    ? "bg-hyper-violet/20 border-hyper-violet/50 text-hyper-violet shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                    : "bg-void-deep/80 border-void-border text-gray-400 hover:text-white hover:border-gray-500 hover:shadow-[0_0_10px_rgba(255,255,255,0.08)]"
                }`}
              >
                <Briefcase
                  className={`w-4 h-4 transition-transform duration-300 ease-out ${
                    isApplied ? "fill-hyper-violet/40 scale-105" : ""
                  }`}
                />
              </button>
            </CosmicTooltip>
          </div>
        </div>

        {/* Title */}
        <Link href={`/dashboard/projects/${project.id}`}>
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 hover:text-plasma-cyan transition-colors">
            {project.title}
          </h3>
        </Link>

        {/* Organization Information */}
        {project.org_name && (
          <div className="flex items-center gap-2 mb-4 group/avatar">
            <AvatarFallback
              src={project.org_logo_url}
              alt={project.org_name}
              fallbackType="org"
              name={project.org_name}
              sizeClassName="w-5 h-5"
              className="border border-void-border bg-void-deep group-hover/avatar:scale-105 transition-transform duration-300 ease-out"
              iconClassName="w-3 h-3 text-plasma-cyan"
            />
            <span className="text-sm text-gray-400 font-medium truncate">
              {project.org_name}
            </span>
          </div>
        )}

        {/* Key Project Meta (Grid / Icons) */}
        <div className="space-y-2.5 text-xs text-gray-400 border-t border-void-border/60 pt-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-plasma-cyan shrink-0" />
            <span className="font-medium text-gray-300 flex items-center gap-1.5 flex-wrap">
              {(() => {
                if (!project.dest_country) return <span>{t("europe")}</span>;
                const c = COUNTRIES.find((x) => x.code === project.dest_country);
                return c ? (
                  <>
                    <Image src={c.flagUrl} alt={c.name} width={16} height={12} unoptimized className="w-4 h-auto rounded-[2px]" />
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
            <Users className="w-4 h-4 text-hyper-violet shrink-0" />
            <span>
              {project.min_age} - {project.max_age} {t("yearsCount", { count: project.max_age })}
            </span>
          </div>

          {project.duration_days && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
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
              <Wallet className="w-4 h-4 text-plasma-cyan shrink-0" />
              <span>
                {t("financingType")}: {project.financing_type}
              </span>
            </div>
          )}
        </div>

        {/* Themes */}
        {project.themes && project.themes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.themes.slice(0, 3).map((theme, i) => {
              const label = tThemes.has(theme) ? tThemes(theme) : theme;
              return (
                <CosmicTooltip key={i} content={label} side="top">
                  <span
                    className="px-2 py-0.5 text-[10px] font-medium bg-void-deep text-gray-300 rounded-md border border-void-border truncate max-w-[150px] cursor-default hover:border-plasma-cyan/40 transition-colors"
                  >
                    {label}
                  </span>
                </CosmicTooltip>
              );
            })}
            {project.themes.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-void-deep text-gray-500 rounded-md border border-void-border">
                +{project.themes.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-void-border bg-void-deep/50 mt-auto">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-plasma-cyan/15 text-white font-bold text-sm transition-all duration-300 ease-out border border-void-border hover:border-plasma-cyan/40 hover:shadow-[0_0_15px_rgba(0,229,255,0.18)] hover:scale-[1.01] active:scale-[0.98] flex justify-center items-center gap-2 text-center break-words min-w-0 px-3 cursor-pointer"
        >
          {t("viewDetails")}
        </Link>
      </div>
    </div>
  );
}
