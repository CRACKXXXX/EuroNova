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
 * Scaled 20-Tier Thresholds mapping levels 1-80+ to galactic visual tiers.
 */
export const TIER_THRESHOLDS: TierThreshold[] = [
  { minLevel: 1, maxLevel: 2, tierIndex: 0 },    // Terrestrial Rookie
  { minLevel: 3, maxLevel: 4, tierIndex: 1 },    // Orbital Cadet
  { minLevel: 5, maxLevel: 6, tierIndex: 2 },    // Lunar Pioneer
  { minLevel: 7, maxLevel: 8, tierIndex: 3 },    // Solar Voyager
  { minLevel: 9, maxLevel: 11, tierIndex: 4 },   // Asteroid Miner
  { minLevel: 12, maxLevel: 14, tierIndex: 5 },  // Martian Sentinel
  { minLevel: 15, maxLevel: 17, tierIndex: 6 },  // Jovian Explorer
  { minLevel: 18, maxLevel: 20, tierIndex: 7 },  // Deep Space Navigator
  { minLevel: 21, maxLevel: 24, tierIndex: 8 },  // Plasma Commander
  { minLevel: 25, maxLevel: 28, tierIndex: 9 },  // Nebula Weaver
  { minLevel: 29, maxLevel: 32, tierIndex: 10 }, // Hyper-Violet Titan
  { minLevel: 33, maxLevel: 36, tierIndex: 11 }, // Starlight Vanguard
  { minLevel: 37, maxLevel: 40, tierIndex: 12 }, // Supernova Herald
  { minLevel: 41, maxLevel: 45, tierIndex: 13 }, // Pulsar Rider
  { minLevel: 46, maxLevel: 50, tierIndex: 14 }, // Quasar Champion
  { minLevel: 51, maxLevel: 56, tierIndex: 15 }, // Void Walker
  { minLevel: 57, maxLevel: 63, tierIndex: 16 }, // Event Horizon Elite
  { minLevel: 64, maxLevel: 70, tierIndex: 17 }, // Dark Matter Architect
  { minLevel: 71, maxLevel: 79, tierIndex: 18 }, // Cosmic Overlord
  { minLevel: 80, maxLevel: Infinity, tierIndex: 19 }, // Astral Legend
];

/**
 * Get tier index (0-19) for a given level.
 */
export function getTierIndexForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  const found = TIER_THRESHOLDS.find(
    (t) => safeLevel >= t.minLevel && safeLevel <= t.maxLevel
  );
  return found ? found.tierIndex : 19;
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
