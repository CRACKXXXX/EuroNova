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
  Search,
  Radio,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "next-intl";
import type { StaffTicketItem } from "../admin/actions";
import { updateSupportTicketStatus } from "../admin/actions";
import type { UserRole } from "@/lib/roles";
import { StaffLiveChatHub } from "@/components/staff/StaffLiveChatHub";

interface SupportPanelClientProps {
  currentUserRole: UserRole;
  tickets: StaffTicketItem[];
  locale: string;
}

export function SupportPanelClient({
  currentUserRole,
  tickets,
}: SupportPanelClientProps) {
  const t = useTranslations("AdminPanel");
  const router = useRouter();
  const format = useFormatter();
  const [activeView, setActiveView] = useState<"tickets" | "staff_chat">("tickets");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentTime] = useState(() => Date.now());

  // Reply Modal State
  const [replyModal, setReplyModal] = useState<StaffTicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<"open" | "in_progress" | "resolved">("resolved");

  const filteredTickets = tickets.filter((tk) => {
    // 1. Status Filter
    if (statusFilter !== "all") {
      const currentStatus = tk.status || "open";
      if (currentStatus !== statusFilter) return false;
    }

    // 2. Search Query Filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const email = (tk.email || "").toLowerCase();
    const subject = (tk.subject || "").toLowerCase();
    const reason = (tk.reason || "").toLowerCase();
    const content = (tk.content || "").toLowerCase();
    const phone = (tk.phone || "").toLowerCase();
    const id = (tk.id || "").toLowerCase();

    return (
      email.includes(q) ||
      subject.includes(q) ||
      reason.includes(q) ||
      content.includes(q) ||
      phone.includes(q) ||
      id.includes(q)
    );
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

  const applyTemplate = (templateText: string, targetStatus: "open" | "in_progress" | "resolved") => {
    setReplyMessage(templateText);
    setReplyStatus(targetStatus);
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

        {/* View Toggles & Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-void-deep border border-void-border">
            <button
              type="button"
              onClick={() => setActiveView("tickets")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === "tickets"
                  ? "bg-rup-emerald text-void-deep shadow-[0_0_15px_rgba(0,230,118,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Tickets ({tickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("staff_chat")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === "staff_chat"
                  ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-plasma-cyan" />
              <span>{t("tabStaffChat")}</span>
            </button>
          </div>
        </div>
      </div>

      {activeView === "staff_chat" ? (
        <StaffLiveChatHub
          currentUserRole={currentUserRole}
          initialChannel="support-tickets"
          embedded
        />
      ) : (
        <div className="space-y-6">
          {/* Sub-Filters & Instant Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["all", "open", "in_progress", "resolved"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                    statusFilter === filter
                      ? "bg-rup-emerald text-void-deep shadow-[0_0_15px_rgba(0,230,118,0.3)]"
                      : "text-gray-400 hover:text-white bg-void-surface border border-void-border"
                  }`}
                >
                  {filter.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchTicketsPlaceholder")}
                className="w-full bg-void-deep/90 border border-void-border focus:border-rup-emerald/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono px-1">
            <span>{t("ticketsMatched", { count: filteredTickets.length })}</span>
            <span>{t("autoPurgeNotice")}</span>
          </div>

          {/* Tickets List */}
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-void-surface/40 border border-dashed border-void-border space-y-2">
                <CheckCircle2 className="w-8 h-8 text-rup-emerald mx-auto" />
                <p className="text-sm font-bold text-white">{t("allClearStream")}</p>
                <p className="text-xs text-gray-400">
                  {searchQuery ? t("noTicketsMatchSearch") : t("noSupportInquiriesPending")}
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isResolved = ticket.status === "resolved";
                const isInProgress = ticket.status === "in_progress";
                const countdown = getAutoDeleteCountdown(ticket.resolved_at, ticket.updated_at);

                return (
                  <div
                    key={ticket.id}
                    className="p-5 sm:p-6 rounded-2xl bg-void-surface border border-void-border hover:border-rup-emerald/40 transition-colors space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border/60">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-void-deep text-rup-emerald border border-rup-emerald/30 uppercase">
                          [{ticket.reason}]
                        </span>

                        {isResolved ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40">
                            {t("statusResolved")}
                          </span>
                        ) : isInProgress ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {t("statusInProgress")}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40">
                            {t("statusOpen")}
                          </span>
                        )}

                        {isResolved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>{countdown.text}</span>
                          </span>
                        )}

                        <span className="text-xs text-white font-bold">
                          {ticket.subject}
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-500 font-mono">
                        {format.dateTime(new Date(ticket.created_at), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-400 font-bold block mb-0.5 uppercase tracking-wider text-[10px]">
                            {t("senderIdentity")}
                          </span>
                          <div className="flex items-center gap-1.5 text-white font-semibold">
                            <Mail className="w-3.5 h-3.5 text-rup-emerald" />
                            <a href={`mailto:${ticket.email}`} className="hover:underline font-mono">
                              {ticket.email}
                            </a>
                          </div>
                          {ticket.phone && (
                            <span className="text-gray-400 font-mono block mt-1">
                              {t("phoneLabel", { phone: ticket.phone })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                          {t("inquiryContent")}
                        </span>
                        <p className="text-gray-300 bg-void-deep/80 p-3 rounded-xl border border-void-border leading-relaxed whitespace-pre-wrap">
                          {ticket.content}
                        </p>
                      </div>
                    </div>

                    {ticket.resolution_action && (
                      <div className="p-3 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 text-xs text-rup-emerald space-y-1">
                        <span className="font-bold uppercase tracking-wider text-[10px] block">
                          {t("officialResolutionResponse")}
                        </span>
                        <p className="text-gray-200 whitespace-pre-wrap">
                          {ticket.resolution_action}
                        </p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyModal(ticket);
                          setReplyMessage(ticket.resolution_action || "");
                          setReplyStatus(isResolved ? "resolved" : "in_progress");
                        }}
                        className="px-4 py-1.5 rounded-xl bg-rup-emerald hover:bg-rup-emerald/90 text-void-deep text-xs font-bold shadow-[0_0_15px_rgba(0,230,118,0.25)] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isResolved ? t("updateResolution") : t("replyAndResolve")}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* REPLY MODAL WITH QUICK TEMPLATES */}
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

              {/* Quick Template Response Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-rup-emerald" />
                  {t("quickTemplates")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate(t("templateAck"), "in_progress")}
                    className="p-2 rounded-lg bg-void-deep border border-void-border hover:border-rup-emerald/40 text-[11px] text-gray-300 hover:text-white text-left transition-colors cursor-pointer"
                  >
                    {t("templateAckShort")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate(t("templateDocs"), "open")}
                    className="p-2 rounded-lg bg-void-deep border border-void-border hover:border-amber-400/40 text-[11px] text-gray-300 hover:text-white text-left transition-colors cursor-pointer"
                  >
                    {t("templateDocsShort")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate(t("templateResolved"), "resolved")}
                    className="p-2 rounded-lg bg-void-deep border border-void-border hover:border-rup-emerald/40 text-[11px] text-gray-300 hover:text-white text-left transition-colors cursor-pointer"
                  >
                    {t("templateResolvedShort")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate(t("templateEscalated"), "in_progress")}
                    className="p-2 rounded-lg bg-void-deep border border-void-border hover:border-plasma-cyan/40 text-[11px] text-gray-300 hover:text-white text-left transition-colors cursor-pointer"
                  >
                    {t("templateEscalatedShort")}
                  </button>
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

export default SupportPanelClient;
