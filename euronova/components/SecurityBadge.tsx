"use client";

import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { getTrustScoreTier, boundTrustScore } from "@/lib/gamification";

export interface SecurityBadgeProps {
  trustScore?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * SecurityBadge component for displaying verified trust score status.
 * Accurately switches to Crimson Red (`nova-flare`) when the score drops
 * into the Restricted critical threshold (<= 29).
 */
export function SecurityBadge({
  trustScore = 30,
  size = "md",
  showLabel = true,
  className = "",
}: SecurityBadgeProps) {
  const safeScore = boundTrustScore(trustScore);
  const tier = getTrustScoreTier(safeScore);
  const isRestricted = safeScore <= 29;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3.5 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const Icon = isRestricted ? ShieldAlert : ShieldCheck;

  return (
    <div
      data-testid="security-badge"
      data-trust-score={safeScore}
      data-trust-tier={tier.tier}
      className={`inline-flex items-center rounded-xl border font-black tracking-wide shadow-sm transition-all duration-300 ${tier.badgeClass} ${sizeClasses[size]} ${className}`}
      title={`${tier.label}: ${tier.description} (${safeScore}/100)`}
    >
      <Icon className={`${iconSizes[size]} shrink-0`} />
      {showLabel && (
        <span>
          {tier.label} ({safeScore}/100)
        </span>
      )}
    </div>
  );
}
