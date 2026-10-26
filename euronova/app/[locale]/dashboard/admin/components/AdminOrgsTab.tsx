"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Mail,
  Bell,
} from "lucide-react";
import {
  type OrgItem,
  type AdminTranslator,
  formatId,
} from "./AdminTypes";
import {
  ContactIcons,
  CountryBadge,
  AdminPagination,
} from "./AdminCommonComponents";
import {
  approveOrganization,
  revokeOrganization,
  deleteOrganization,
} from "../actions";

interface AdminOrgsTabProps {
  pendingOrgs: OrgItem[];
  verifiedOrgs: OrgItem[];
  totalPendingOrgs: number;
  totalVerifiedOrgs: number;
  showSensitive: boolean;
  isPending: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  handleAction: (actionFn: () => Promise<{ success?: boolean; error?: string }>) => void;
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
  tOrgs: AdminTranslator;
}

export function AdminOrgsTab({
  pendingOrgs,
  verifiedOrgs,
  totalPendingOrgs,
  totalVerifiedOrgs,
  showSensitive,
  isPending,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  handleAction,
  setNotifyConfig,
  setNotifyTitle,
  setNotifyMessage,
  setNotifyType,
  setDeleteConfig,
  t,
  tOrgs,
}: AdminOrgsTabProps) {
  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* Section 1: Pending Verification */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-void-border pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            {t("pending")}
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
              {totalPendingOrgs}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pendingOrgs.map((org) => (
            <div
              key={org.id}
              className="bg-void-surface border border-yellow-400/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-yellow-400/5 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                  {org.org_name || t("unnamed")}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 uppercase tracking-wider shrink-0 ml-2">
                  {t("pendingBadge")}
                </span>
              </div>

              {/* Org ID with privacy mask & full view */}
              <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                ID: {formatId(org.id, showSensitive)}
                {org.oid_number ? ` • OID: ${showSensitive ? org.oid_number : `${org.oid_number.slice(0, 4)}...`}` : ""}
              </div>

              <div className="mb-3">
                <CountryBadge countryCode={org.country_hq} />
              </div>

              <p className="text-sm text-gray-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                {org.description || t("noDescription")}
              </p>

              <ContactIcons org={org} showSensitive={showSensitive} tOrgs={tOrgs} />

              <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-auto pt-2">
                <button
                  disabled={isPending}
                  onClick={() => handleAction(() => approveOrganization(org.id))}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("approve")}</span>
                </button>
                <a
                  href={`mailto:${org.login_email || org.contact_email || ""}?subject=EuroNova%20-%20Action%20Required&body=Hello,%20we%20are%20reviewing%20your%20profile.%20Please%20update%20the%20following:%0A%0A-%20...`}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-400 border border-yellow-400/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("requestChanges")}</span>
                </a>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setNotifyConfig({
                      targetId: org.id,
                      targetName: org.org_name || "Pending Organization",
                      targetType: "org",
                    });
                    setNotifyTitle("Official Notice: Complete Organization Dossier");
                    setNotifyMessage("");
                    setNotifyType("action_required");
                  }}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title={t("sendInAppNotification")}
                >
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("notifyBtn")}</span>
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    setDeleteConfig({
                      action: () => deleteOrganization(org.id),
                      title: "Reject & Delete Organization",
                      message: `Are you sure you want to permanently delete "${org.org_name || "this organization"}"? This will remove all associated projects and records.`,
                    });
                  }}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("rejectDelete")}</span>
                </button>
              </div>
            </div>
          ))}

          {pendingOrgs.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
              <p className="text-gray-400 text-sm">{t("noPending")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Verified Entities */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-void-border pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-rup-emerald" />
            <span>{t("verified")}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30">
              {totalVerifiedOrgs}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {verifiedOrgs.map((org) => (
            <div
              key={org.id}
              className="bg-void-surface border border-rup-emerald/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-rup-emerald/5"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                  {org.org_name || t("unnamed")}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 uppercase tracking-wider shrink-0 ml-2">
                  {t("verifiedBadge")}
                </span>
              </div>

              {/* Org ID with privacy mask & full view */}
              <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                ID: {formatId(org.id, showSensitive)}
                {org.oid_number ? ` • OID: ${showSensitive ? org.oid_number : `${org.oid_number.slice(0, 4)}...`}` : ""}
              </div>

              <div className="mb-3">
                <CountryBadge countryCode={org.country_hq} />
              </div>

              <p className="text-sm text-gray-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                {org.description || t("noDescription")}
              </p>

              <ContactIcons org={org} showSensitive={showSensitive} tOrgs={tOrgs} />

              <div className="flex gap-2.5 mt-auto pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setNotifyConfig({
                      targetId: org.id,
                      targetName: org.org_name || "Verified Organization",
                      targetType: "org",
                    });
                    setNotifyTitle("EuroNova Administrative Notice");
                    setNotifyMessage("");
                    setNotifyType("system");
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-hyper-violet/10 hover:bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title={t("sendInAppNotification")}
                >
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("notifyBtn")}</span>
                </button>
                <button
                  disabled={isPending}
                  onClick={() => handleAction(() => revokeOrganization(org.id))}
                  className="flex-1 py-2 px-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("revoke")}</span>
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    setDeleteConfig({
                      action: () => deleteOrganization(org.id),
                      title: "Delete Verified Entity",
                      message: `Are you sure you want to permanently delete "${org.org_name || "this organization"}"? This action cannot be undone.`,
                    });
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("deleteEntity")}</span>
                </button>
              </div>
            </div>
          ))}

          {verifiedOrgs.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
              <p className="text-gray-400 text-sm">{t("noVerified")}</p>
            </div>
          )}
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalVerifiedOrgs}
          pageSize={pageSize}
          isPending={isPending}
          onPageChange={onPageChange}
          showingResultsText={t("showingResults", {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, totalVerifiedOrgs),
            total: totalVerifiedOrgs,
          })}
          previousText={t("previous")}
          nextText={t("next")}
          pageOfText={t("pageOf", { current: currentPage, total: totalPages })}
        />
      </div>
    </div>
  );
}
