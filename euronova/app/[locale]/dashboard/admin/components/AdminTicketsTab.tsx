"use client";

import React, { useState } from "react";
import { type StaffTicketItem, updateSupportTicketStatus } from "../actions";
import { type AdminTranslator, type AdminFormatter } from "./AdminTypes";
import {
  Headphones,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react";

interface AdminTicketsTabProps {
  tickets: StaffTicketItem[];
  totalPendingTickets: number;
  ticketStatusFilter: "all" | "open" | "in_progress" | "resolved";
  setTicketStatusFilter: (st: "all" | "open" | "in_progress" | "resolved") => void;
  isPending: boolean;
  handleAction: (actionFn: () => Promise<{ success?: boolean; error?: string }>) => void;
  setTicketReplyModal: (m: { ticket: StaffTicketItem } | null) => void;
  setTicketReplyMessage: (msg: string) => void;
  setTicketReplyStatus: (st: "open" | "in_progress" | "resolved") => void;
  t: AdminTranslator;
  format: AdminFormatter;
}

export function AdminTicketsTab({
  tickets,
  totalPendingTickets,
  ticketStatusFilter,
  setTicketStatusFilter,
  isPending,
  handleAction,
  setTicketReplyModal,
  setTicketReplyMessage,
  setTicketReplyStatus,
  t,
  format,
}: AdminTicketsTabProps) {
  const [renderTimestamp] = useState(() => Date.now());

  const filteredTickets = tickets.filter((tk) => {
    if (ticketStatusFilter === "all") return true;
    if (ticketStatusFilter === "open") return tk.status === "open" || tk.status === "pending" || !tk.status;
    return tk.status === ticketStatusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="bg-void-surface/80 border border-plasma-cyan/30 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(0,229,255,0.08)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-plasma-cyan" />
            <span>{t("supportInquiriesTitle")}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 font-mono">
              {totalPendingTickets} Open
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {t("supportInquiriesSubtitle")}
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "open", "in_progress", "resolved"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setTicketStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                ticketStatusFilter === st
                  ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                  : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
              }`}
            >
              {st === "all" ? "All" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-void-surface/40 border border-void-border/60 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-rup-emerald mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white mb-1">{t("inboxZero")}</h3>
          <p className="text-sm text-gray-400">
            {t("inboxZeroDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((tk) => {
            const isApplySupport = tk.reason === "apply_support";
            const currentStatus = tk.status || "open";

            const statusBadgeClass =
              currentStatus === "resolved"
                ? "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/40"
                : currentStatus === "in_progress"
                ? "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/40"
                : "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/40";

            return (
              <div
                key={tk.id}
                className={`bg-void-surface/60 border rounded-2xl p-6 backdrop-blur-xl transition-all space-y-4 ${
                  isApplySupport
                    ? "border-hyper-violet/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                    : "border-void-border/80 hover:border-plasma-cyan/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeClass}`}>
                      {currentStatus.replace("_", " ")}
                    </span>
                    {isApplySupport && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40 flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.25)]">
                        <span>🎧</span>
                        {t("level10Applicant")}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-void-deep text-gray-300 border border-void-border">
                      {t("ticketReason", { reason: tk.reason })}
                    </span>
                    {tk.resolution_action && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30">
                        {t("ticketAction", { action: tk.resolution_action })}
                      </span>
                    )}
                    {currentStatus === "resolved" && (() => {
                      const ts = tk.updated_at || tk.resolved_at || tk.created_at;
                      const hoursSinceUpdatedAt = Math.floor((renderTimestamp - new Date(ts).getTime()) / (1000 * 60 * 60));
                      const remainingHours = 48 - hoursSinceUpdatedAt;
                      if (remainingHours <= 0) {
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-void-surface border border-nova-flare/40 text-nova-flare flex items-center gap-1.5 animate-pulse shadow-[0_0_10px_rgba(255,46,99,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-nova-flare animate-ping" />
                            {t("pendingPurge")}
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-void-surface border border-nova-flare/30 text-nova-flare flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t("autoDeletingInHours", { hours: remainingHours })}
                        </span>
                      );
                    })()}
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {format.dateTime(new Date(tk.created_at), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("userContact")}</p>
                    <p className="text-white font-bold">{tk.email}</p>
                    {tk.phone && <p className="text-gray-400 font-mono mt-0.5">Phone: {tk.phone}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("subject")}</p>
                    <p className="text-white font-bold text-sm">{tk.subject}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-void-deep/80 border border-void-border/60 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("messageTransmission")}</p>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">{tk.content}</p>
                </div>

                {/* Ticket Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {currentStatus !== "in_progress" && currentStatus !== "resolved" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        handleAction(() => updateSupportTicketStatus(tk.id, "in_progress"));
                      }}
                      className="px-4 py-2 rounded-xl bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {t("setInProgress")}
                    </button>
                  )}
                  {currentStatus !== "resolved" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        handleAction(() => updateSupportTicketStatus(tk.id, "resolved"));
                      }}
                      className="px-4 py-2 rounded-xl bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {t("markResolved")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setTicketReplyModal({ ticket: tk });
                      setTicketReplyMessage("");
                      setTicketReplyStatus("resolved");
                    }}
                    className="px-5 py-2 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("replyNotify")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
