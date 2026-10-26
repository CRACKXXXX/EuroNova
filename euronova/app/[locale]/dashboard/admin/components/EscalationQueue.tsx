"use client";

import React from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { type AdminEscalationItem } from "../actions";
import { type AdminTranslator, type AdminFormatter } from "./AdminTypes";

interface EscalationQueueProps {
  escalations: AdminEscalationItem[];
  totalPendingEscalations: number;
  escalationStatusFilter: "all" | "pending" | "approved" | "rejected";
  onFilterChange: (status: "all" | "pending" | "approved" | "rejected") => void;
  onOpenResolveModal: (escalation: AdminEscalationItem, decision: "approved" | "rejected") => void;
  isPending: boolean;
  t: AdminTranslator;
  format: AdminFormatter;
}

export function EscalationQueue({
  escalations,
  totalPendingEscalations,
  escalationStatusFilter,
  onFilterChange,
  onOpenResolveModal,
  isPending,
  t,
  format,
}: EscalationQueueProps) {
  const filteredEscalations = escalations.filter((esc) => {
    if (escalationStatusFilter === "all") return true;
    return esc.status === escalationStatusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="bg-void-surface/80 border border-amber-500/30 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <span>{t("escalationsQueueTitle")}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
              {totalPendingEscalations} Pending Review
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Actions requiring Level 4 Administrator clearance escalated by External {t("filterModerators")} and Support Specialists.
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onFilterChange(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                escalationStatusFilter === st
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
              }`}
            >
              {st === "all" ? "All" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Escalations List */}
      {filteredEscalations.length === 0 ? (
        <div className="bg-void-surface/40 border border-void-border/60 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-rup-emerald mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white mb-1">{t("clearSkiesEscalations")}</h3>
          <p className="text-sm text-gray-400">
            {t("clearSkiesEscalationsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEscalations.map((esc) => {
            const isPendingStatus = esc.status === "pending";
            const statusBadgeClass =
              esc.status === "pending"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : esc.status === "approved" || esc.status === "executed"
                ? "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/40"
                : "bg-gray-700/30 text-gray-400 border-gray-600/40";

            const actionLabel =
              esc.recommended_action === "delete_survey"
                ? "Delete Survey & Penalize Creator"
                : esc.recommended_action === "ban_user"
                ? "Permanent Account Ban"
                : esc.recommended_action === "delete_org"
                ? "Suspend Organization"
                : "Administrative Investigation";

            return (
              <div
                key={esc.id}
                className="bg-void-surface/60 border border-void-border/80 rounded-2xl p-6 backdrop-blur-xl hover:border-amber-500/30 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeClass}`}>
                      {esc.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-void-deep text-plasma-cyan border border-void-border">
                      {t("targetPrefix", { type: esc.target_type })}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {t.rich("escalatedByPrefix", {
                        role: esc.escalated_by_role.toUpperCase(),
                        strong: (c: React.ReactNode) => <span className="text-white font-bold">{c}</span>,
                      })}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {format.dateTime(new Date(esc.created_at), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("targetEntitySubject")}</p>
                    <p className="text-sm font-bold text-white break-all">{esc.target_name || esc.target_id}</p>
                    <p className="text-[11px] text-gray-500 font-mono">Target ID: {esc.target_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t("recommendedAction")}</p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {actionLabel}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-void-deep/80 border border-void-border/60 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("escalationStatement")}</p>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{esc.reason}</p>
                </div>

                {esc.admin_notes && (
                  <div className="p-3 rounded-xl bg-plasma-cyan/5 border border-plasma-cyan/20 text-xs space-y-0.5">
                    <p className="text-[10px] font-bold text-plasma-cyan uppercase tracking-wider">{t("adminResolutionNotes")}</p>
                    <p className="text-gray-300">{esc.admin_notes}</p>
                  </div>
                )}

                {/* Admin Decision Actions */}
                {isPendingStatus && (
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onOpenResolveModal(esc, "rejected")}
                      className="px-4 py-2 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 hover:text-white border border-void-border text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {t("dismissEscalation")}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onOpenResolveModal(esc, "approved")}
                      className="px-5 py-2 rounded-xl bg-nova-flare hover:bg-nova-flare/90 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(255,46,99,0.3)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{t("approveExecuteAction")}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
