"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Headphones,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  X,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "next-intl";
import type { StaffTicketItem } from "../admin/actions";
import { updateSupportTicketStatus } from "../admin/actions";
import type { UserRole } from "@/lib/roles";

interface SupportPanelClientProps {
  currentUserRole: UserRole;
  tickets: StaffTicketItem[];
  locale: string;
}

export function SupportPanelClient({
  tickets,
}: SupportPanelClientProps) {
  const t = useTranslations("AdminPanel");
  const router = useRouter();
  const format = useFormatter();
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [isPending, startTransition] = useTransition();
  const [currentTime] = useState(() => Date.now());

  // Reply Modal State
  const [replyModal, setReplyModal] = useState<StaffTicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<"open" | "in_progress" | "resolved">("resolved");

  const filteredTickets = tickets.filter((tk) => {
    if (statusFilter === "all") return true;
    const currentStatus = tk.status || "open";
    return currentStatus === statusFilter;
  });

  const handleReplySubmit = () => {
    if (!replyModal) return;

    startTransition(async () => {
      const res = await updateSupportTicketStatus(
        replyModal.id,
        replyStatus,
        replyMessage.trim() || undefined
      );

      if (res.success) {
        toast.success(t("ticketStatusUpdatedSuccess", { status: replyStatus.toUpperCase() }));
        setReplyModal(null);
        setReplyMessage("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update ticket.");
      }
    });
  };

  const getAutoDeleteCountdown = (resolvedAt?: string | null, updatedAt?: string | null) => {
    const timestamp = resolvedAt || updatedAt;
    if (!timestamp) return { text: t("autoDeletingInHours", { hours: 48 }), isExpiringSoon: false };

    const hoursSinceUpdatedAt = Math.floor((currentTime - new Date(timestamp).getTime()) / (1000 * 60 * 60));
    const remainingHours = 48 - hoursSinceUpdatedAt;

    if (remainingHours <= 0) {
      return { text: t("pendingPurge"), isExpiringSoon: true };
    }

    return {
      text: t("autoDeletingInHours", { hours: remainingHours }),
      isExpiringSoon: remainingHours < 12,
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-void-surface border border-rup-emerald/30 shadow-[0_0_40px_rgba(0,230,118,0.08)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 mb-3">
            <Headphones className="w-3.5 h-3.5" />
            <span>{t("supportTerminalBadge")}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {t("supportTransmission")} <span className="text-rup-emerald">{t("desk")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mt-1.5 leading-relaxed">
            {t("supportSubtitle")}
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-void-deep border border-void-border shrink-0">
          {(["all", "open", "in_progress", "resolved"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                statusFilter === filter
                  ? "bg-rup-emerald text-void-deep shadow-[0_0_15px_rgba(0,230,118,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {filter.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-void-surface/40 border border-dashed border-void-border space-y-2">
            <CheckCircle2 className="w-8 h-8 text-rup-emerald mx-auto" />
            <p className="text-sm font-bold text-white">{t("noTicketsInView")}</p>
            <p className="text-xs text-gray-400">{t("allTransmissionsResolved")}</p>
          </div>
        ) : (
          filteredTickets.map((tk) => {
            const currentStatus = tk.status || "open";
            const isResolved = currentStatus === "resolved";
            const countdown = getAutoDeleteCountdown(tk.resolved_at, tk.updated_at);

            return (
              <div
                key={tk.id}
                className="p-5 sm:p-6 rounded-2xl bg-void-surface border border-void-border hover:border-rup-emerald/40 transition-colors space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        currentStatus === "open"
                          ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40"
                          : currentStatus === "in_progress"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40"
                      }`}
                    >
                      {currentStatus.replace("_", " ")}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-void-deep text-gray-300 border border-void-border">
                      {tk.reason}
                    </span>
                    {isResolved && (
                      <>
                        {tk.resolution_action && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40">
                            {tk.resolution_action}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{countdown.text}</span>
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {format.dateTime(new Date(tk.created_at), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">{tk.subject}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-plasma-cyan" />
                      <span className="text-gray-300 font-mono">{tk.email}</span>
                    </span>
                    {tk.phone && (
                      <span className="text-gray-400 font-mono">Tel: {tk.phone}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 bg-void-deep/80 p-3.5 rounded-xl border border-void-border whitespace-pre-wrap leading-relaxed">
                    {tk.content}
                  </p>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyModal(tk);
                      setReplyStatus(isResolved ? "open" : "resolved");
                      setReplyMessage("");
                    }}
                    className="px-4 py-1.5 rounded-xl bg-rup-emerald hover:bg-rup-emerald/90 text-void-deep text-xs font-bold shadow-[0_0_15px_rgba(0,230,118,0.25)] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{isResolved ? "Update Resolution" : "Reply & Resolve"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REPLY MODAL */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-rup-emerald/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,230,118,0.2)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div className="flex items-center gap-2.5">
                <Headphones className="w-5 h-5 text-rup-emerald" />
                <h3 className="text-base font-bold text-white">{t("replyToTicket")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReplyModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 font-bold block mb-0.5 uppercase text-[10px]">
                    {t("recipientEmail")}
                  </span>
                  <span className="text-white font-mono">{replyModal.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block mb-0.5 uppercase text-[10px]">
                    {t("reason")}
                  </span>
                  <span className="text-rup-emerald font-semibold">{replyModal.reason}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">
                  {t("ticketStatusAfterUpdate")}
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as "open" | "in_progress" | "resolved")}
                  className="w-full p-2.5 rounded-xl bg-void-deep border border-void-border text-white focus:border-rup-emerald focus:outline-none"
                >
                  <option value="resolved">{t("markResolved")}</option>
                  <option value="in_progress">{t("keepInProgress")}</option>
                  <option value="open">{t("keepOpen")}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">
                  {t("inAppNotificationMessage")}
                </label>
                <textarea
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  maxLength={3000}
                  placeholder={t("ticketReplyPlaceholder")}
                  className="w-full p-2.5 rounded-xl bg-void-deep border border-void-border text-white focus:border-rup-emerald focus:outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-void-border">
              <button
                type="button"
                onClick={() => setReplyModal(null)}
                className="px-4 py-2 rounded-xl bg-void-deep text-gray-300 hover:text-white border border-void-border text-xs font-bold cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleReplySubmit}
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-rup-emerald hover:bg-rup-emerald/90 text-void-deep text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("transmitting")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("transmitResponse")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
