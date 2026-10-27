"use client";

import { type UserRole, ROLE_BADGE_CONFIG } from "@/lib/rolesConstants";
import { type StaffSearchUser } from "../actions";
import { type YouthUserItem, type AdminTranslator, formatId, maskEmail } from "./AdminTypes";
import { AvatarFallback } from "@/components/AvatarFallback";
import {
  ShieldCheck,
  Shield,
  Search,
  X,
  Loader2,
  ShieldAlert,
  Check,
  Copy,
} from "lucide-react";

interface RoleManagerProps {
  currentUserRole: UserRole;
  totalStaff: number;
  staffSearchQuery: string;
  setStaffSearchQuery: (q: string) => void;
  staffRoleFilter: "all" | "staff" | "moderator" | "support" | "user";
  setStaffRoleFilter: (f: "all" | "staff" | "moderator" | "support" | "user") => void;
  staffUsersList: StaffSearchUser[];
  hasSearchedStaff: boolean;
  isSearchingStaff: boolean;
  updatingUserRoleId: string | null;
  copiedId: string | null;
  youthUsers: YouthUserItem[];
  showSensitive: boolean;
  isPending: boolean;
  handleSearchStaff: (queryText?: string) => Promise<void>;
  handleRoleChange: (targetUserId: string, newRole: UserRole) => Promise<void>;
  handleCopyId: (id: string) => void;
  t: AdminTranslator;
}

export function RoleManager({
  currentUserRole,
  totalStaff,
  staffSearchQuery,
  setStaffSearchQuery,
  staffRoleFilter,
  setStaffRoleFilter,
  staffUsersList,
  hasSearchedStaff,
  isSearchingStaff,
  updatingUserRoleId,
  copiedId,
  youthUsers,
  showSensitive,
  isPending,
  handleSearchStaff,
  handleRoleChange,
  handleCopyId,
  t,
}: RoleManagerProps) {
  const rawStaffList: StaffSearchUser[] = hasSearchedStaff
    ? staffUsersList
    : youthUsers.map((y) => ({
        id: y.id,
        full_name: y.full_name,
        email: y.email,
        role: (y.role || "user") as UserRole,
        avatar_url: y.avatar_url,
        created_at: y.created_at,
      }));

  const displayedUsers = rawStaffList.filter((u) => {
    if (staffRoleFilter === "staff") return u.role !== "user";
    if (staffRoleFilter === "moderator") return u.role === "moderator";
    if (staffRoleFilter === "support") return u.role === "support";
    if (staffRoleFilter === "user") return u.role === "user";
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Section Header */}
      <div className="bg-void-surface border border-plasma-cyan/30 rounded-2xl p-6 sm:p-7 shadow-[0_0_30px_rgba(0,229,255,0.08)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-void-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-plasma-cyan/20 to-hyper-violet/20 border border-plasma-cyan/40 flex items-center justify-center text-plasma-cyan shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span>{t("staffRoleManagement")}</span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-widest font-black">
                  {t("adminClearanceOnly")}
                </span>
              </h2>
              <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                {t("staffRoleManagementDesc")}
              </p>
            </div>
          </div>

          {/* Total Staff Counter Card */}
          <div className="flex items-center gap-3 bg-void-deep px-4 py-3 rounded-xl border border-void-border shrink-0 self-start md:self-auto">
            <Shield className="w-5 h-5 text-plasma-cyan" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                {t("networkStaffCount")}
              </div>
              <div className="text-lg font-black text-white font-mono">
                {totalStaff} {t("verifiedStaff")}
              </div>
            </div>
          </div>
        </div>

        {/* 4-Tier Permission Matrix Reference Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6">
          <div className="bg-void-deep/80 rounded-xl p-3.5 border border-plasma-cyan/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">🛡️</span>
              <span className="text-xs font-black text-plasma-cyan uppercase tracking-wider">
                {t("roleAdminTitle")}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {t("roleAdminDesc")}
            </p>
          </div>

          <div className="bg-void-deep/80 rounded-xl p-3.5 border border-amber-500/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">⚔️</span>
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                {t("roleModTitle")}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {t("roleModDesc")}
            </p>
          </div>

          <div className="bg-void-deep/80 rounded-xl p-3.5 border border-rup-emerald/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">🎧</span>
              <span className="text-xs font-black text-rup-emerald uppercase tracking-wider">
                {t("roleSupportTitle")}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {t("roleSupportDesc")}
            </p>
          </div>

          <div className="bg-void-deep/80 rounded-xl p-3.5 border border-void-border">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">👤</span>
              <span className="text-xs font-black text-gray-300 uppercase tracking-wider">
                {t("roleUserDesc") ? "User" : "User"}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {t("roleUserDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-void-surface border border-void-border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input for Email or ID */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchStaff();
          }}
          className="flex-1 flex items-center gap-2 max-w-xl"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={staffSearchQuery}
              onChange={(e) => setStaffSearchQuery(e.target.value)}
              placeholder={t("searchStaffPlaceholder")}
              className="w-full bg-void-deep border border-void-border rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan font-mono transition-colors"
            />
            {staffSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setStaffSearchQuery("");
                  handleSearchStaff("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                title={t("clearSearch")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearchingStaff}
            className="px-4 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs hover:bg-plasma-cyan/90 transition-all shadow-[0_0_12px_rgba(0,229,255,0.25)] flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            {isSearchingStaff ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>{t("searchBtn")}</span>
          </button>
        </form>

        {/* Role Quick Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStaffRoleFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              staffRoleFilter === "all"
                ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            {t("filterAllUsers")}
          </button>
          <button
            type="button"
            onClick={() => setStaffRoleFilter("staff")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              staffRoleFilter === "staff"
                ? "bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("filterStaffOnly")}
          </button>
          <button
            type="button"
            onClick={() => setStaffRoleFilter("moderator")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              staffRoleFilter === "moderator"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            <span>⚔️</span>
            {t("filterModerators")}
          </button>
          <button
            type="button"
            onClick={() => setStaffRoleFilter("support")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              staffRoleFilter === "support"
                ? "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_10px_rgba(0,230,118,0.2)]"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            <span>🎧</span>
            {t("filterSupport")}
          </button>
          <button
            type="button"
            onClick={() => setStaffRoleFilter("user")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              staffRoleFilter === "user"
                ? "bg-gray-700/50 text-white border border-gray-600"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            {t("filterUsers")}
          </button>
        </div>
      </div>

      {/* User List & Role Selector Grid */}
      {displayedUsers.length === 0 ? (
        <div className="bg-void-surface border border-void-border rounded-2xl p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">{t("noUsersFoundTitle")}</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {t("noUsersFoundDesc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedUsers.map((u) => {
            const isRootAdmin = u.email === "euronovaofficial@gmail.com";
            const roleConfig = ROLE_BADGE_CONFIG[u.role];
            const isUpdating = updatingUserRoleId === u.id;

            return (
              <div
                key={u.id}
                className={`bg-void-surface border rounded-2xl p-6 flex flex-col justify-between transition-all shadow-md relative ${
                  u.role === "admin"
                    ? "border-plasma-cyan/40 shadow-[0_0_20px_rgba(0,229,255,0.06)]"
                    : u.role === "moderator"
                    ? "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.06)]"
                    : u.role === "support"
                    ? "border-rup-emerald/40 shadow-[0_0_20px_rgba(0,230,118,0.06)]"
                    : "border-void-border hover:border-gray-700"
                }`}
              >
                <div>
                  {/* User Header: Avatar, Name, Email */}
                  <div className="flex items-start gap-4 mb-4">
                    <AvatarFallback
                      src={u.avatar_url}
                      alt={t("avatarAlt")}
                      fallbackType="user"
                      name={u.full_name}
                      sizeClassName="w-12 h-12"
                      className="border-2 border-void-border shrink-0"
                      iconClassName="w-6 h-6 text-gray-400"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white break-words">
                        {u.full_name || "Unnamed Volunteer"}
                      </h3>
                      <p
                        className={`text-xs text-gray-400 font-mono mt-0.5 ${
                          showSensitive ? "break-all whitespace-normal" : "truncate"
                        }`}
                      >
                        {u.email
                          ? showSensitive
                            ? u.email
                            : maskEmail(u.email)
                          : "No email registered"}
                      </p>
                    </div>
                  </div>

                  {/* User UUID & Copy */}
                  <div className="flex items-center justify-between bg-void-deep/70 px-3 py-1.5 rounded-lg border border-void-border mb-4">
                    <span className="text-[10px] font-mono text-gray-400 truncate">
                      ID: {showSensitive ? u.id : formatId(u.id, false)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(u.id)}
                      className="text-[10px] text-plasma-cyan hover:text-white flex items-center gap-1 font-mono transition-colors ml-2 cursor-pointer"
                      title={t("copyUserId")}
                    >
                      {copiedId === u.id ? (
                        <>
                          <Check className="w-3 h-3 text-rup-emerald" />
                          <span className="text-rup-emerald">{t("copied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{t("copy")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Current Role Badge */}
                  <div className="mb-4">
                    <div className="text-[10px] uppercase font-mono text-gray-500 mb-1.5 tracking-wider">
                      {t("activeClearance")}
                    </div>
                    {roleConfig ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${roleConfig.badgeClass}`}
                      >
                        <span>{roleConfig.icon}</span>
                        <span>{roleConfig.label}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-void-deep text-gray-400 border border-void-border font-medium">
                        <span>👤</span>
                        <span>{t("userVolunteerRole")}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Selector Control */}
                <div className="pt-4 border-t border-void-border/70 mt-2">
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                    {t("assignSystemRole")}
                  </label>
                  {isRootAdmin ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan text-xs font-bold font-mono">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>{t("rootAdminImmutable")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        disabled={isUpdating || isPending}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as UserRole)
                        }
                        className="flex-1 bg-void-deep border border-void-border hover:border-plasma-cyan/50 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-plasma-cyan transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <option value="user">{t("userStandardVolunteer")}</option>
                        <option value="support">{t("supportSpecialistOption")}</option>
                        <option value="moderator">{t("moderatorOption")}</option>
                        {(currentUserRole === "root" || currentUserRole === "admin") && (
                          <option value="admin">{t("adminOption")}</option>
                        )}
                      </select>
                      {isUpdating && (
                        <Loader2 className="w-4 h-4 text-plasma-cyan animate-spin shrink-0" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
