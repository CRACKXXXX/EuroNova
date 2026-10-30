"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import {
  getTierForLevel,
  type LevelTierConfig,
} from "@/lib/levels";

export type { LevelTierConfig };

/**
 * Calculates progressive tier details based on user Level.
 * Scaled smoothly across 50 tiers using the exponential leveling model.
 */
export function getLevelTierDetails(level: number): LevelTierConfig {
  return getTierForLevel(level);
}

interface UserLevelBadgeProps {
  level: number;
  showTitle?: boolean;
  showHelpIcon?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UserLevelBadge({
  level,
  showTitle = false,
  showHelpIcon = false,
  className = "",
  size = "sm",
}: UserLevelBadgeProps) {
  const t = useTranslations("Leveling");
  const [isOpen, setIsOpen] = useState(false);
  const safeLevel = Math.max(1, isNaN(level) ? 1 : Math.floor(level));
  const tier = getLevelTierDetails(safeLevel);
  const Icon = tier.IconComponent;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={`relative inline-flex items-center group/badge overflow-visible select-none ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
    >
      <span
        tabIndex={0}
        role="button"
        aria-label={`User Level ${safeLevel}, Rank: ${tier.title}`}
        className={`font-mono font-black border border-void-border/70 bg-void-deep/90 backdrop-blur-md cursor-pointer shrink-0 shadow-sm transition-all duration-300 hover:border-plasma-cyan/60 ${
          tier.shadow
        } ${
          showTitle
            ? "inline-flex flex-col items-start px-2.5 py-1.5 rounded-xl w-full max-w-[240px]"
            : `inline-flex items-center rounded-full ${sizeClasses[size]}`
        }`}
      >
        {/* Top Line: Level Badge + Icon */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Icon className={`${iconSizes[size]} ${tier.iconColor || tier.color} shrink-0`} />
          <span className={tier.color}>Lv.{safeLevel}</span>
          {showHelpIcon && (
            <HelpCircle className="w-2.5 h-2.5 text-gray-500 hover:text-plasma-cyan ml-0.5 shrink-0 transition-colors" />
          )}
        </div>

        {/* Bottom Line: Tier Name taking full width, no cramped dot separator */}
        {showTitle && (
          <span
            className={`font-sans font-bold text-[10px] sm:text-[11px] block w-full mt-0.5 truncate leading-tight ${tier.color}`}
          >
            {tier.title}
          </span>
        )}
      </span>

      {/* Styled Cosmic Tooltip Bubble */}
      <span
        role="tooltip"
        className={`absolute z-[999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-2xl bg-void-surface/98 border border-plasma-cyan/40 backdrop-blur-xl text-left shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_20px_rgba(0,229,255,0.15)] transition-all duration-200 pointer-events-none select-none ${
          isOpen
            ? "opacity-100 visible scale-100"
            : "opacity-0 invisible scale-95 group-hover/badge:opacity-100 group-hover/badge:visible group-hover/badge:scale-100"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-void-border/80">
          <div className="w-7 h-7 rounded-lg bg-void-deep border border-void-border flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${tier.iconColor || tier.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`text-xs font-black block truncate ${tier.color}`}>
              {tier.title}
            </span>
            <span className="text-[10px] font-mono text-gray-400 block">
              {t("level", { level: safeLevel })} • {t("tierFraction", { current: tier.tierIndex + 1, total: 50 })}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-300 leading-snug font-sans font-normal mb-2">
          {t("levelSubtitle")}
        </p>

        <div className="flex items-center justify-between text-[10px] font-mono text-plasma-cyan pt-1.5 border-t border-void-border/60">
          <span>{t("moduleTitle")}</span>
          <span className="text-gray-400 font-bold">EuroNova</span>
        </div>

        {/* Downward pointer caret */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-void-surface" />
      </span>
    </span>
  );
}

export default UserLevelBadge;
