"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert,
  Zap, 
  CheckCircle2, 
  Layers, 
  ChevronDown 
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { getLevelTierDetails, UserLevelBadge } from "@/components/UserLevelBadge";
import { calculateLevelProgress, TIER_THRESHOLDS, getTrustScoreTier } from "@/lib/gamification";

interface LevelReputationModuleProps {
  xp?: number;
  trustScore?: number;
  role?: "youth" | "org";
}

export function LevelReputationModule({
  xp = 0,
  trustScore = 30,
}: LevelReputationModuleProps) {
  const t = useTranslations("Leveling");
  const format = useFormatter();
  const [showAllTiers, setShowAllTiers] = useState(false);

  // Cálculos matemáticos reactivos de nivel y progreso derivado
  const safeXp = Math.max(0, typeof xp === "number" && !isNaN(xp) ? xp : 0);
  const [bonusXp, setBonusXp] = useState<number>(0);
  const liveXp = safeXp + bonusXp;

  // Escuchar eventos en vivo de XP para actualizar sin recargar página
  useEffect(() => {
    const handleLiveXp = (e: Event) => {
      const customEvent = e as CustomEvent<{ xpGained?: number }>;
      if (customEvent.detail?.xpGained) {
        setBonusXp((prev) => prev + (customEvent.detail.xpGained || 0));
      }
    };
    window.addEventListener("euronova:xp-updated", handleLiveXp);
    return () => window.removeEventListener("euronova:xp-updated", handleLiveXp);
  }, []);

  const safeTrustScore = Math.max(0, Math.min(100, typeof trustScore === "number" && !isNaN(trustScore) ? trustScore : 30));
  const trustTier = getTrustScoreTier(safeTrustScore);
  const isRestricted = safeTrustScore <= 29;
  const TrustIcon = isRestricted ? ShieldAlert : ShieldCheck;

  // Curva de progresión exponencial matemática
  const progress = calculateLevelProgress(liveXp);
  const currentLevel = progress.level;
  const currentLevelXp = progress.currentLevelXp;
  const maxXpForLevel = progress.nextLevelXp;
  const progressPercentage = progress.progressPercentage;

  const tier = getLevelTierDetails(currentLevel);
  const TierIcon = tier.IconComponent;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-plasma-cyan/40 bg-gradient-to-br from-void-surface via-void-surface/90 to-void-deep p-6 sm:p-7 shadow-[0_0_40px_rgba(0,229,255,0.08)] mb-8">
      {/* Resplandores cósmicos de fondo */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-hyper-violet/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-plasma-cyan/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Cabecera del Módulo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-void-border/80">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl bg-void-deep border border-void-border p-1 shadow-inner flex items-center justify-center shrink-0 ${tier.shadow}`}>
              <TierIcon className={`w-7 h-7 ${tier.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {t("moduleTitle")}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30">
                  {t("tierFraction", { current: tier.tierIndex + 1, total: 20 })}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("levelSubtitle")}
              </p>
            </div>
          </div>

          {/* Trust Score Pill Header */}
          <div
            data-testid="trust-score-header-badge"
            data-trust-score={safeTrustScore}
            data-trust-tier={trustTier.tier}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm shrink-0 self-start sm:self-auto transition-colors duration-300 ${trustTier.badgeClass}`}
          >
            <TrustIcon className="w-4 h-4 shrink-0" />
            <span className="text-xs font-black tracking-wide">
              {trustTier.label} ({safeTrustScore}/100)
            </span>
          </div>
        </div>

        {/* Grid de 2 Columnas: Level & XP vs Trust Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna Izquierda: Nivel Dinámico y Barra XP Exponencial */}
          <div className="space-y-4 bg-void-deep/70 border border-void-border rounded-xl p-5 shadow-inner">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-plasma-cyan block">
                  {t("currentRank")}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 mt-0.5 min-w-0">
                  <span className="flex flex-row items-center gap-2 whitespace-nowrap text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {t("level", { level: currentLevel })}
                  </span>
                  <span className={`text-xs sm:text-sm font-bold whitespace-normal leading-tight ${tier.color}`}>
                    <span className="hidden sm:inline">• </span>{tier.title}
                  </span>
                </div>
              </div>

              <UserLevelBadge level={currentLevel} size="md" className="shrink-0 mt-1 sm:mt-0" />
            </div>

            {/* Neon XP Progress Track */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-plasma-cyan" />
                  XP to Level {currentLevel + 1}
                </span>
                <span className="font-mono text-plasma-cyan font-bold">
                  {format.number(currentLevelXp)} / {format.number(maxXpForLevel)} XP ({progressPercentage}%)
                </span>
              </div>

              <div className="w-full h-3.5 bg-void-surface rounded-full overflow-hidden border border-plasma-cyan/30 p-[1px] shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-plasma-cyan via-hyper-violet to-nova-flare rounded-full shadow-[0_0_16px_rgba(0,229,255,0.8)] transition-all duration-1000 ease-out"
                  style={{ width: `${Math.max(progressPercentage, 4)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-0.5">
                <span>Total Lifetime: {format.number(liveXp)} XP</span>
                <span>Next Rank: Lv.{TIER_THRESHOLDS[Math.min(tier.tierIndex + 1, 19)].minLevel}</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Trust & Reputation Score Real */}
          <div className="space-y-4 bg-void-deep/70 border border-void-border rounded-xl p-5 shadow-inner flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[11px] font-extrabold uppercase tracking-widest block transition-colors duration-300 ${trustTier.colorClass}`}>
                  {t("reputationScore")}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {safeTrustScore}
                  </span>
                  <span className="text-gray-400 font-semibold text-lg">/ 100</span>
                  <span className={`text-xs font-black ml-1 px-2.5 py-0.5 rounded-full border transition-colors duration-300 ${trustTier.badgeClass}`}>
                    {trustTier.label}
                  </span>
                </div>
              </div>
              <div
                data-testid="trust-score-gauge-icon"
                className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-lg shrink-0 transition-colors duration-300 ${trustTier.badgeClass}`}
              >
                <TrustIcon className="w-7 h-7" />
              </div>
            </div>

            {/* Badges de Confianza - No truncation! */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-void-border/70">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-rup-emerald shrink-0" />
                <span className="whitespace-normal leading-tight">{t("kycVerified")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-plasma-cyan shrink-0" />
                <span className="whitespace-normal leading-tight">{t("antiScamScore")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-hyper-violet shrink-0" />
                <span className="whitespace-normal leading-tight">{t("peerReviews")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 20-Tier Roadmap Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAllTiers((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-bold text-plasma-cyan hover:underline cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showAllTiers ? t("hideProgression") : t("viewProgression")}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllTiers ? "rotate-180" : ""}`} />
          </button>

          {showAllTiers && (
            <div className="mt-3 p-4 rounded-xl bg-void-deep/90 border border-void-border grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 animate-in fade-in duration-300">
              {TIER_THRESHOLDS.map((threshold, i) => {
                const sampleLevel = threshold.minLevel;
                const tierInfo = getLevelTierDetails(sampleLevel);
                const IconComp = tierInfo.IconComponent;
                const isCurrentTier = tier.tierIndex === i;
                const levelRange = threshold.maxLevel === Infinity 
                  ? `Lv.${threshold.minLevel}+` 
                  : `Lv.${threshold.minLevel} - ${threshold.maxLevel}`;

                return (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isCurrentTier
                        ? "bg-plasma-cyan/15 border-plasma-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)] ring-1 ring-plasma-cyan"
                        : "bg-void-surface/50 border-void-border/60 hover:border-gray-600"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono font-bold text-gray-400">
                          {t("tierN", { number: i + 1 })}
                        </span>
                        <IconComp className={`w-3.5 h-3.5 ${tierInfo.color}`} />
                      </div>
                      <p className={`text-[10px] font-bold whitespace-normal break-words leading-tight ${tierInfo.color}`}>
                        {tierInfo.title}
                      </p>
                    </div>
                    <p className="text-[9px] text-gray-500 font-mono mt-1 pt-1 border-t border-void-border/40">
                      {levelRange}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
