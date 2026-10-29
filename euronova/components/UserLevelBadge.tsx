"use client";

import React, { useState } from "react";
import { 
  Circle, 
  Shield, 
  Hexagon, 
  Star, 
  ShieldAlert, 
  Pentagon, 
  Target, 
  Compass, 
  Sun, 
  Octagon, 
  ShieldCheck, 
  Diamond, 
  Zap, 
  Disc, 
  Triangle, 
  Moon, 
  Eclipse, 
  Box, 
  Crown, 
  Award,
  HelpCircle,
  type LucideIcon
} from "lucide-react";

export interface LevelTierConfig {
  tierIndex: number;
  title: string;
  color: string;
  bg: string;
  shadow: string;
  iconName: string;
  IconComponent: LucideIcon;
}

const LEVEL_TIERS_RAW = [
  { title: "Terrestrial Rookie", color: "text-slate-400", bg: "bg-slate-400", shadow: "", icon: "Circle", IconComponent: Circle },
  { title: "Orbital Cadet", color: "text-orange-400", bg: "bg-orange-400", shadow: "shadow-orange-400/20", icon: "Shield", IconComponent: Shield },
  { title: "Lunar Pioneer", color: "text-slate-200", bg: "bg-slate-200", shadow: "shadow-slate-200/30", icon: "Hexagon", IconComponent: Hexagon },
  { title: "Solar Voyager", color: "text-yellow-400", bg: "bg-yellow-400", shadow: "shadow-yellow-400/40", icon: "Star", IconComponent: Star },
  { title: "Asteroid Miner", color: "text-amber-500", bg: "bg-amber-500", shadow: "shadow-amber-500/40", icon: "ShieldAlert", IconComponent: ShieldAlert },
  { title: "Martian Sentinel", color: "text-red-500", bg: "bg-red-500", shadow: "shadow-red-500/40", icon: "Pentagon", IconComponent: Pentagon },
  { title: "Jovian Explorer", color: "text-orange-500", bg: "bg-orange-500", shadow: "shadow-orange-500/50", icon: "Target", IconComponent: Target },
  { title: "Deep Space Navigator", color: "text-blue-500", bg: "bg-blue-500", shadow: "shadow-blue-500/50", icon: "Compass", IconComponent: Compass },
  { title: "Plasma Commander", color: "text-plasma-cyan", bg: "bg-plasma-cyan", shadow: "shadow-[0_0_15px_rgba(0,229,255,0.5)]", icon: "Sun", IconComponent: Sun },
  { title: "Nebula Weaver", color: "text-fuchsia-500", bg: "bg-fuchsia-500", shadow: "shadow-fuchsia-500/50", icon: "Octagon", IconComponent: Octagon },
  { title: "Hyper-Violet Titan", color: "text-hyper-violet", bg: "bg-hyper-violet", shadow: "shadow-[0_0_20px_rgba(99,102,241,0.6)] animate-pulse", icon: "ShieldCheck", IconComponent: ShieldCheck },
  { title: "Starlight Vanguard", color: "text-white", bg: "bg-white", shadow: "shadow-[0_0_25px_rgba(255,255,255,0.7)]", icon: "Diamond", IconComponent: Diamond },
  { title: "Supernova Herald", color: "text-rose-500", bg: "bg-rose-500", shadow: "shadow-rose-500/60", icon: "Zap", IconComponent: Zap },
  { title: "Pulsar Rider", color: "text-cyan-400", bg: "bg-cyan-400", shadow: "shadow-cyan-400/60 animate-ping", icon: "Disc", IconComponent: Disc },
  { title: "Quasar Champion", color: "text-rup-emerald", bg: "bg-rup-emerald", shadow: "shadow-[0_0_30px_rgba(0,230,118,0.7)]", icon: "Triangle", IconComponent: Triangle },
  { title: "Void Walker", color: "text-purple-700", bg: "bg-purple-700", shadow: "shadow-purple-700/80", icon: "Moon", IconComponent: Moon },
  { title: "Event Horizon Elite", color: "text-slate-100", bg: "bg-slate-900 border-2 border-white", shadow: "shadow-[0_0_35px_rgba(255,255,255,0.8)]", icon: "Eclipse", IconComponent: Eclipse },
  { title: "Dark Matter Architect", color: "text-fuchsia-900", bg: "bg-fuchsia-900", shadow: "shadow-fuchsia-900/90", icon: "Box", IconComponent: Box },
  { title: "Cosmic Overlord", color: "text-yellow-200", bg: "bg-yellow-200", shadow: "shadow-[0_0_40px_rgba(253,224,71,0.9)]", icon: "Crown", IconComponent: Crown },
  { title: "Astral Legend", color: "text-transparent bg-clip-text bg-gradient-to-r from-plasma-cyan via-hyper-violet to-nova-flare", bg: "bg-gradient-to-r from-plasma-cyan via-hyper-violet to-nova-flare", shadow: "shadow-[0_0_50px_rgba(0,229,255,1)] animate-pulse", icon: "Award", IconComponent: Award },
];

import { getTierIndexForLevel } from "@/lib/gamification";

/**
 * Calculates progressive tier details based on user Level.
 * Scaled smoothly across 20 tiers using the exponential leveling model.
 */
export function getLevelTierDetails(level: number): LevelTierConfig {
  const safeLevel = Math.max(1, isNaN(level) ? 1 : Math.floor(level));
  const tierIndex = getTierIndexForLevel(safeLevel);
  const rawTier = LEVEL_TIERS_RAW[tierIndex];

  return {
    tierIndex,
    title: rawTier.title,
    color: rawTier.color,
    bg: rawTier.bg,
    shadow: rawTier.shadow,
    iconName: rawTier.icon,
    IconComponent: rawTier.IconComponent,
  };
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
        className={`inline-flex items-center rounded-full font-mono font-black border border-void-border/70 bg-void-deep/90 backdrop-blur-md cursor-pointer shrink-0 shadow-sm transition-all duration-300 hover:border-plasma-cyan/60 ${tier.shadow} ${sizeClasses[size]}`}
      >
        <Icon className={`${iconSizes[size]} ${tier.color} shrink-0`} />
        <span className={tier.color}>Lv.{safeLevel}</span>
        {showTitle && (
          <span className="text-gray-300 font-sans font-bold text-[11px] truncate hidden sm:inline ml-0.5">
            • {tier.title}
          </span>
        )}
        {showHelpIcon && (
          <HelpCircle className="w-2.5 h-2.5 text-gray-500 hover:text-plasma-cyan ml-0.5 shrink-0 transition-colors" />
        )}
      </span>

      {/* Styled Cosmic Tooltip Bubble (No raw broken markdown or string artifacts) */}
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
            <Icon className={`w-4 h-4 ${tier.color}`} />
          </div>
          <div className="min-w-0">
            <span className={`text-xs font-black block truncate ${tier.color}`}>
              {tier.title}
            </span>
            <span className="text-[10px] font-mono text-gray-400 block">
              Level {safeLevel} • Tier {tier.tierIndex + 1} / 20
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-300 leading-snug font-sans font-normal mb-2">
          Earn XP by applying to missions, verifying dossiers, and participating in European mobility exchanges.
        </p>

        <div className="flex items-center justify-between text-[10px] font-mono text-plasma-cyan pt-1.5 border-t border-void-border/60">
          <span>True Trust Protocol</span>
          <span className="text-gray-400 font-bold">EuroNova Genesis</span>
        </div>

        {/* Downward pointer caret */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-void-surface" />
      </span>
    </span>
  );
}
