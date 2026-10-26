"use client";

import React from "react";
import {
  Users,
  Search,
  X,
  User,
  Phone,
  Languages,
  Bell,
  Trash2,
} from "lucide-react";
import {
  type YouthUserItem,
  type AdminTranslator,
  formatId,
  maskEmail,
  maskPhone,
} from "./AdminTypes";
import {
  CountryBadge,
  AdminPagination,
} from "./AdminCommonComponents";
import { deleteYouthUser } from "../actions";

interface AdminYouthTabProps {
  youthUsers: YouthUserItem[];
  totalYouth: number;
  userSearchQuery: string;
  setUserSearchQuery: (q: string) => void;
  showSensitive: boolean;
  isPending: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  setNotifyConfig: (cfg: { targetId: string; targetName: string; targetType: "user" | "org" }) => void;
  setNotifyTitle: (t: string) => void;
  setNotifyMessage: (m: string) => void;
  setNotifyType: (t: "system" | "action_required" | "moderation" | "alert") => void;
  setDeleteConfig: (cfg: {
    action: () => Promise<{ success?: boolean; error?: string }>;
    title: string;
    message: string;
  }) => void;
  t: AdminTranslator;
}

export function AdminYouthTab({
  youthUsers,
  totalYouth,
  userSearchQuery,
  setUserSearchQuery,
  showSensitive,
  isPending,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  setNotifyConfig,
  setNotifyTitle,
  setNotifyMessage,
  setNotifyType,
  setDeleteConfig,
  t,
}: AdminYouthTabProps) {
  const filteredYouthUsers = youthUsers.filter((user) => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (user.full_name || "").toLowerCase().includes(q);
    const emailMatch = (user.email || "").toLowerCase().includes(q);
    const idMatch = (user.id || "").toLowerCase().includes(q);
    const countryMatch = (user.country_code || "").toLowerCase().includes(q);
    const phoneMatch = (user.phone || "").toLowerCase().includes(q);
    return nameMatch || emailMatch || idMatch || countryMatch || phoneMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-void-border pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <Users className="w-5 h-5 text-plasma-cyan" />
          <span>{t("youthTitle")}</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30">
            {userSearchQuery ? `${filteredYouthUsers.length} of ${totalYouth}` : totalYouth}
          </span>
        </h2>

        {/* Upgraded Youth User Search: Name, Email, ID */}
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            placeholder={t("searchUsersPlaceholder")}
            className="w-full bg-void-deep/90 border border-void-border rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-colors"
          />
          {userSearchQuery && (
            <button
              type="button"
              onClick={() => setUserSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
              title={t("clearSearch")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredYouthUsers.map((user) => (
          <div
            key={user.id}
            className="bg-void-surface border border-void-border hover:border-plasma-cyan/40 rounded-2xl p-6 sm:p-7 flex flex-col transition-all shadow-md"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full border-2 border-plasma-cyan/60 overflow-hidden flex items-center justify-center bg-void-deep shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                {user.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.avatar_url} alt={t("avatarAlt")} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-plasma-cyan/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white break-all whitespace-normal">
                  {user.full_name || t("unnamed")}
                </h3>
                <p className={`text-xs text-gray-400 font-mono mt-0.5 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                  {user.email ? (showSensitive ? user.email : maskEmail(user.email)) : "No email"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <CountryBadge countryCode={user.country_code} />
                  {user.is_rup_region && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                      {t("rupBadge")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Youth Details: Phone & Languages */}
            <div className="space-y-1.5 mb-3 text-xs">
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
                  <span className="text-gray-400 font-medium">{t("phone")}:</span>
                  <span className={`font-mono text-gray-200 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    {showSensitive ? user.phone : maskPhone(user.phone)}
                  </span>
                </div>
              )}
              {user.languages && user.languages.length > 0 && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Languages className="w-3.5 h-3.5 text-hyper-violet shrink-0" />
                  <span className="text-gray-400 font-medium">{t("languages")}:</span>
                  <span className={`text-gray-200 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                    {user.languages.join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Youth Details: Bio */}
            {user.bio ? (
              <div className="mb-4 bg-void-deep/60 p-3 rounded-lg border border-void-border/40">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  {t("bio")}
                </span>
                <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
                  {user.bio}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic mb-4">
                {t("noDescription")}
              </p>
            )}

            <div className="mt-auto pt-4 border-t border-void-border/60 flex items-center justify-between gap-2">
              <span className={`text-[11px] text-gray-500 font-mono ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                ID: {formatId(user.id, showSensitive)}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setNotifyConfig({
                      targetId: user.id,
                      targetName: user.full_name || user.email || "Youth Volunteer",
                      targetType: "user",
                    });
                    setNotifyTitle("EuroNova Community Notice");
                    setNotifyMessage("");
                    setNotifyType("system");
                  }}
                  className="py-2 px-3 rounded-lg bg-hyper-violet/10 hover:bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title={t("sendInAppNotification")}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{t("notifyBtn")}</span>
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    setDeleteConfig({
                      action: () => deleteYouthUser(user.id),
                      title: "Delete Youth User",
                      message: `Are you sure you want to permanently delete user "${user.full_name || user.email || "this user"}"? This action cannot be undone.`,
                    });
                  }}
                  className="py-2 px-3.5 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t("deleteUser")}</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredYouthUsers.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
            <p className="text-gray-400 text-sm">
              {userSearchQuery ? `No youth users matching "${userSearchQuery}".` : t("noYouthUsers")}
            </p>
            {userSearchQuery && (
              <button
                type="button"
                onClick={() => setUserSearchQuery("")}
                className="mt-2 text-xs text-plasma-cyan hover:underline cursor-pointer font-semibold"
              >
                {t("clearSearchFilter")}
              </button>
            )}
          </div>
        )}
      </div>

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalYouth}
        pageSize={pageSize}
        isPending={isPending}
        onPageChange={onPageChange}
        showingResultsText={t("showingResults", {
          from: (currentPage - 1) * pageSize + 1,
          to: Math.min(currentPage * pageSize, totalYouth),
          total: totalYouth,
        })}
        previousText={t("previous")}
        nextText={t("next")}
        pageOfText={t("pageOf", { current: currentPage, total: totalPages })}
      />
    </div>
  );
}
