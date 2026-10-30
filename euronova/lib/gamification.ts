/**
 * EuroNova Gamification & Exponential Progression Engine
 * Pure mathematical formulas and progression definitions for Leveling, Tiers, and XP Safeguards.
 */

export interface LevelProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
  xpToNextLevel: number;
}

export interface TierThreshold {
  minLevel: number;
  maxLevel: number;
  tierIndex: number;
}

/**
 * Closed-form analytical formula to compute the user's level from total XP.
 * Total XP for Level L: 50 * L * (L - 1)
 *
 * Progression Table:
 * - Level 1: 0 XP (100 XP to next)
 * - Level 2: 100 XP (200 XP to next)
 * - Level 3: 300 XP (300 XP to next)
 * - Level 4: 600 XP (400 XP to next)
 * - Level 5: 1,000 XP (500 XP to next)
 * - Level 6: 1,500 XP (600 XP to next)
 * - Level 10: 4,500 XP
 * - Level 20: 19,000 XP
 * - Level 50: 122,500 XP
 *
 * Exact Inverse:
 * L = floor((1 + sqrt(1 + 0.08 * XP)) / 2)
 */
export function calculateLevelFromXp(xp: number): number {
  if (typeof xp !== "number" || isNaN(xp) || xp <= 0) {
    return 1;
  }
  const level = Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2);
  return Math.max(1, level);
}

/**
 * Returns the cumulative total XP required to reach a specific level.
 */
export function calculateTotalXpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= 1) return 0;
  return 50 * safeLevel * (safeLevel - 1);
}

/**
 * Returns the XP required to advance from `level` to `level + 1`.
 */
export function calculateXpRequiredForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 * safeLevel;
}

/**
 * Comprehensive level progress calculation for UI gauges and indicators.
 */
export function calculateLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, typeof xp === "number" && !isNaN(xp) ? xp : 0);
  const level = calculateLevelFromXp(safeXp);
  const baseXp = calculateTotalXpForLevel(level);
  const nextLevelXp = calculateXpRequiredForNextLevel(level);
  const currentLevelXp = Math.max(0, safeXp - baseXp);
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((currentLevelXp / nextLevelXp) * 100))
  );
  const xpToNextLevel = Math.max(0, nextLevelXp - currentLevelXp);

  return {
    level,
    totalXp: safeXp,
    currentLevelXp,
    nextLevelXp,
    progressPercentage,
    xpToNextLevel,
  };
}

/**
 * Scaled 50-Tier Thresholds mapping levels 1-250+ to cosmic visual tiers.
 * Exactly 1 tier every 5 levels, culminating in Astral Legend at Level 246+.
 */
export const TIER_THRESHOLDS: TierThreshold[] = Array.from({ length: 50 }, (_, i) => ({
  minLevel: i === 0 ? 1 : i * 5 + 1,
  maxLevel: i === 49 ? Infinity : (i + 1) * 5,
  tierIndex: i,
}));

/**
 * Get tier index (0-49) for a given level.
 * Level 240 maps to tierIndex 47 (Apex Astral Sovereign).
 * Level 246+ maps to tierIndex 49 (Astral Legend).
 */
export function getTierIndexForLevel(level: number): number {
  const safeLevel = Math.max(1, isNaN(level) ? 1 : Math.floor(level));
  const found = TIER_THRESHOLDS.find(
    (t) => safeLevel >= t.minLevel && safeLevel <= t.maxLevel
  );
  return found ? found.tierIndex : 49;
}

/**
 * THE TRUE TRUST PROTOCOL (BALANCED ECONOMY)
 * Real, hard-to-game reputation economy strictly bounded between 0 and 100.
 * Default starting score for new users: 30 (Provisional).
 */
export const TRUST_CONFIG = {
  DEFAULT_SCORE: 30,
  // Positive Actions (Slow Growth)
  PROFILE_COMPLETION: 15, // One time dossier completion
  PROJECT_COMPLETION: 25, // High impact, NGO verified
  GOOD_REVIEW: 5,         // Constructive mobility review
  FORUM_ANSWER: 1,        // Low impact to prevent spam farming
  // Negative Actions (Fast Punishments)
  AUTOMOD_DELETION: -5,   // Auto-mod rejected spam or violation
  MODERATOR_WARN: -15,    // Official moderator warning strike
  MODERATOR_MUTE: -30,    // Time-out suspension penalty
} as const;

export interface TrustScoreTier {
  score: number;
  tier: "Restricted" | "Provisional" | "Trusted" | "Elite";
  label: string;
  colorClass: string;
  badgeClass: string;
  description: string;
}

/**
 * Bounds any trust score strictly between 0 and 100.
 */
export function boundTrustScore(score: number): number {
  if (typeof score !== "number" || isNaN(score)) return TRUST_CONFIG.DEFAULT_SCORE;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determines the visual tier and styling based on the user's trust score:
 * - 0 to 29: Red / Restricted
 * - 30 to 69: Yellow / Provisional (Default starting bracket)
 * - 70 to 89: Green / Trusted
 * - 90 to 100: Blue/Cyan / Elite
 */
export function getTrustScoreTier(rawScore: number): TrustScoreTier {
  const score = boundTrustScore(rawScore);

  if (score <= 29) {
    return {
      score,
      tier: "Restricted",
      label: "RESTRICTED",
      colorClass: "text-nova-flare",
      badgeClass: "text-nova-flare bg-nova-flare/15 border-nova-flare/40",
      description: "Restricted Account Status",
    };
  }

  if (score <= 69) {
    return {
      score,
      tier: "Provisional",
      label: "PROVISIONAL",
      colorClass: "text-yellow-400",
      badgeClass: "text-yellow-400 bg-yellow-400/15 border-yellow-400/40",
      description: "Provisional Cadet Status",
    };
  }

  if (score <= 89) {
    return {
      score,
      tier: "Trusted",
      label: "TRUSTED",
      colorClass: "text-rup-emerald",
      badgeClass: "text-rup-emerald bg-rup-emerald/15 border-rup-emerald/40",
      description: "Trusted Mobility Contributor",
    };
  }

  return {
    score,
    tier: "Elite",
    label: "ELITE",
    colorClass: "text-plasma-cyan",
    badgeClass: "text-plasma-cyan bg-plasma-cyan/15 border-plasma-cyan/40",
    description: "Elite Titanium Ambassador",
  };
}

/**
 * Deterministic Trust-Factor XP Multiplier.
 * - Exemplary / High Trust (score >= 70): 1.5x Multiplier
 * - Good Trust (score >= 60 && score < 70): 1.25x Multiplier
 * - Neutral / Standard Trust (score >= 30 && score < 60): 1.0x Multiplier
 * - Low / Restricted Trust (score < 30): 0.5x Multiplier
 */
export function getTrustXpMultiplier(trustScore: number): number {
  const safeScore = boundTrustScore(trustScore);
  if (safeScore >= 70) return 1.5;
  if (safeScore >= 60) return 1.25;
  if (safeScore >= 30) return 1.0;
  return 0.5;
}

export type TrustMultiplierTier = "high" | "good" | "standard" | "low";

export interface TrustMultiplierDetails {
  multiplier: number;
  tier: TrustMultiplierTier;
  badgeClass: string;
  colorClass: string;
  translationKey: "xpBoostHighTrust" | "xpBoostGoodTrust" | "xpStandardTrust" | "xpPenaltyLowTrust";
}

/**
 * Returns visual badge styling and i18n translation key for a given trust score.
 */
export function getTrustMultiplierDetails(trustScore: number): TrustMultiplierDetails {
  const multiplier = getTrustXpMultiplier(trustScore);
  if (multiplier >= 1.5) {
    return {
      multiplier: 1.5,
      tier: "high",
      badgeClass: "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]",
      colorClass: "text-plasma-cyan",
      translationKey: "xpBoostHighTrust",
    };
  }
  if (multiplier >= 1.25) {
    return {
      multiplier: 1.25,
      tier: "good",
      badgeClass: "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/40 shadow-[0_0_12px_rgba(99,102,241,0.25)]",
      colorClass: "text-hyper-violet",
      translationKey: "xpBoostGoodTrust",
    };
  }
  if (multiplier >= 1.0) {
    return {
      multiplier: 1.0,
      tier: "standard",
      badgeClass: "bg-void-surface text-gray-300 border-void-border",
      colorClass: "text-gray-300",
      translationKey: "xpStandardTrust",
    };
  }
  return {
    multiplier: 0.5,
    tier: "low",
    badgeClass: "bg-nova-flare/15 text-nova-flare border-nova-flare/40 shadow-[0_0_12px_rgba(255,46,99,0.25)]",
    colorClass: "text-nova-flare",
    translationKey: "xpPenaltyLowTrust",
  };
}

/**
 * Applies the Trust Multiplier to base XP deterministically.
 * - 1.5x: Math.round(baseXp * 1.5)
 * - 1.25x: Math.round(baseXp * 1.25)
 * - 1.0x: baseXp
 * - 0.5x: Math.max(1, Math.floor(baseXp * 0.5))
 */
export function calculateTrustMultiplierXp(baseXp: number, trustScore: number): number {
  const safeBase = Math.max(0, Math.floor(baseXp));
  if (safeBase === 0) return 0;
  const mult = getTrustXpMultiplier(trustScore);
  if (mult === 1.5) return Math.round(safeBase * 1.5);
  if (mult === 1.25) return Math.round(safeBase * 1.25);
  if (mult === 1.0) return safeBase;
  return Math.max(1, Math.floor(safeBase * 0.5));
}

/**
 * Rebalanced, non-abusable XP triggers with +50% buff & True Trust Protocol boosts.
 */
export const XP_CONFIG = {
  PROFILE_COMPLETION: {
    amount: 75,
    actionType: "profile_completion",
    targetId: "youth_profile_completion",
    reason: "Profile Dossier Completion Bonus",
    trustBoost: TRUST_CONFIG.PROFILE_COMPLETION,
  },
  APPLY_MISSION: {
    amount: 75,
    actionType: "apply_mission",
    reason: "Applied to European Mobility Mission",
    trustBoost: 3,
  },
  PROJECT_COMPLETION: {
    amount: 150,
    actionType: "project_completion",
    reason: "Verified Mobility Project Completion",
    trustBoost: TRUST_CONFIG.PROJECT_COMPLETION,
  },
  NGO_REVIEW: {
    amount: 150,
    actionType: "ngo_review",
    reason: "Verified Mobility Review Bonus",
    trustBoost: TRUST_CONFIG.GOOD_REVIEW,
  },
  DAILY_PASSIVE: {
    amount: 3,
    actionType: "daily_passive",
    dailyCap: 15,
    reason: "Daily Orbital Exploration Engagement",
  },
  FORUM_ANSWER: {
    amount: 30,
    actionType: "forum_answer",
    reason: "Community Forum Support Bonus",
    trustBoost: TRUST_CONFIG.FORUM_ANSWER,
  },
} as const;
