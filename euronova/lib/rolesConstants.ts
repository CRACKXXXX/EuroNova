export type UserRole = "root" | "admin" | "moderator" | "support" | "user";

/**
 * Visual metadata for role badges
 */
export const ROLE_BADGE_CONFIG: Record<
  UserRole,
  {
    label: string;
    icon: string;
    badgeClass: string;
  } | null
> = {
  root: {
    label: "SYSTEM ROOT",
    icon: "⚡",
    badgeClass:
      "bg-gradient-to-r from-plasma-cyan via-hyper-violet to-nova-flare text-white border border-plasma-cyan/60 shadow-[0_0_15px_rgba(0,229,255,0.4)] font-black",
  },
  admin: {
    label: "EURO-NOVA ADMIN",
    icon: "🛡️",
    badgeClass:
      "bg-gradient-to-r from-plasma-cyan/25 to-hyper-violet/30 text-plasma-cyan border border-plasma-cyan/50 shadow-[0_0_12px_rgba(0,229,255,0.3)] font-black",
  },
  moderator: {
    label: "MODERATOR",
    icon: "⚔️",
    badgeClass:
      "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] font-bold",
  },
  support: {
    label: "SUPPORT SPECIALIST",
    icon: "🎧",
    badgeClass:
      "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_10px_rgba(0,230,118,0.2)] font-bold",
  },
  user: null, // Regular users do not render a staff badge
};
