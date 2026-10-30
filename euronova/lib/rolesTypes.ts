export type UserRole = "root" | "admin" | "moderator" | "support" | "user";

export interface UserRolePermissions {
  canViewReports: boolean;
  canResolveReports: boolean;
  canViewTickets: boolean;
  canResolveTickets: boolean;
  canWarnUser: boolean;
  canMuteUser: boolean;
  canBanUser: boolean;
  canDeleteAnyComment: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canAssignRoles: boolean;
  canReplyGatedForum: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserRolePermissions> = {
  root: {
    canViewReports: true,
    canResolveReports: true,
    canViewTickets: true,
    canResolveTickets: true,
    canWarnUser: true,
    canMuteUser: true,
    canBanUser: true,
    canDeleteAnyComment: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canAssignRoles: true,
    canReplyGatedForum: true,
  },
  admin: {
    canViewReports: true,
    canResolveReports: true,
    canViewTickets: true,
    canResolveTickets: true,
    canWarnUser: true,
    canMuteUser: true,
    canBanUser: true,
    canDeleteAnyComment: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canAssignRoles: true,
    canReplyGatedForum: true,
  },
  moderator: {
    canViewReports: true,
    canResolveReports: true,
    canViewTickets: true,
    canResolveTickets: true,
    canWarnUser: true,
    canMuteUser: true,
    canBanUser: false,
    canDeleteAnyComment: true,
    canEditProjects: false,
    canDeleteProjects: false,
    canAssignRoles: false,
    canReplyGatedForum: true,
  },
  support: {
    canViewReports: true,
    canResolveReports: true,
    canViewTickets: true,
    canResolveTickets: true,
    canWarnUser: true,
    canMuteUser: false,
    canBanUser: false,
    canDeleteAnyComment: true,
    canEditProjects: false,
    canDeleteProjects: false,
    canAssignRoles: false,
    canReplyGatedForum: true,
  },
  user: {
    canViewReports: false,
    canResolveReports: false,
    canViewTickets: false,
    canResolveTickets: false,
    canWarnUser: false,
    canMuteUser: false,
    canBanUser: false,
    canDeleteAnyComment: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canAssignRoles: false,
    canReplyGatedForum: false,
  },
};

export function hasPermission(
  role: UserRole,
  permission: keyof UserRolePermissions
): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? Boolean(perms[permission]) : false;
}

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
  user: null,
};

