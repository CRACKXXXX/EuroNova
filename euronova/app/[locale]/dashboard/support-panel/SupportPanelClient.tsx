"use client";

import React, { useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import {
  Headphones,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  X,
  Mail,
  Phone,
  Lock,
  MessageSquare,
  Search,
  Radio,
  Sparkles,
  Flag,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "next-intl";
import type { StaffTicketItem, AdminEscalationItem } from "../admin/actions";
import type { ReportItem } from "../admin/AdminDashboardClient";
import {
  updateSupportTicketStatus,
  dismissReport,
  escalateReportToAdmin,
  escalateSupportTicket,
} from "../admin/actions";
import type { UserRole } from "@/lib/roles";
import { StaffLiveChatHub } from "@/components/staff/StaffLiveChatHub";
import { resolveUserPrivacy } from "@/lib/privacyMasker";
import { SensitiveDataToggle } from "@/components/SensitiveDataToggle";

interface SupportPanelClientProps {
  currentUserRole: UserRole;
  tickets: StaffTicketItem[];
  reports: ReportItem[];
  escalations?: AdminEscalationItem[];
  locale: string;
}

export function SupportPanelClient({
  currentUserRole,
  tickets,
  reports,
}: SupportPanelClientProps) {
  const t = useTranslations("AdminPanel");
  const tMod = useTranslations("ModeratorPanel");
  const router = useRouter();
  const format = useFormatter();
  const [activeView, setActiveView] = useState<"tickets" | "reports" | "staff_chat">("tickets");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [reportsFilter, setReportsFilter] = useState<"active" | "resolved" | "all">("active");
  const [showSensitive, setShowSensitive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentTime] = useState(() => Date.now());

  // Reply Modal State (Tickets)
  const [replyModal, setReplyModal] = useState<StaffTicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<"open" | "in_progress" | "resolved">("resolved");

  // Escalation Target for Reports
  const [escalateTargetRole, setEscalateTargetRole] = useState<"moderator" | "admin">("moderator");

  // Escalation Modal State (Tickets)
  const [escalateTicketModal, setEscalateTicketModal] = useState<{
    ticketId: string;
    subject: string;
    reason: string;
  } | null>(null);
  const [escalateTicketTargetRole, setEscalateTicketTargetRole] = useState<"moderator" | "admin">("moderator");
  const [escalateTicketReason, setEscalateTicketReason] = useState("");

  // Escalation Modal State (Reports)
  const [escalateModal, setEscalateModal] = useState<{
    reportId: string;
    targetName: string;
    targetType: string;
  } | null>(null);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateAction, setEscalateAction] = useState<
    "ban_user" | "delete_org" | "delete_survey" | "emergency_lock" | "investigate"
  >("investigate");

  // Filtered tickets
  const openTickets = tickets.filter(
    (tk) => tk.status === "open" || tk.status === "pending" || !tk.status
  );

  const filteredTickets = tickets.filter((tk) => {
    if (statusFilter !== "all") {
      const currentStatus = tk.status || "open";
      if (statusFilter === "open") {
        if (currentStatus !== "open" && currentStatus !== "pending") return false;
      } else if (currentStatus !== statusFilter) {
        return false;
      }
    }

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

  // Filtered reports
  const activeReports = reports.filter(
    (r) => r.status === "pending" || r.status === "escalated" || !r.status
  );
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  const statusFilteredReports =
    reportsFilter === "active"
      ? activeReports
      : reportsFilter === "resolved"
      ? resolvedReports
      : reports;

  const displayedReports = statusFilteredReports.filter((r) => {
    if (!reportSearchQuery.trim()) return true;
    const q = reportSearchQuery.toLowerCase().trim();
    const targetName = (r.target_name || r.projects?.title || r.users_org?.org_name || "").toLowerCase();
    const reason = (r.reason || "").toLowerCase();
    const desc = (r.description || "").toLowerCase();
    const id = (r.id || "").toLowerCase();
    return targetName.includes(q) || reason.includes(q) || desc.includes(q) || id.includes(q);
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

  const handleDismissReport = (reportId: string) => {
    startTransition(async () => {
      const res = await dismissReport(reportId);
      if (res.success) {
        toast.success(tMod("reportDismissedSuccess"));
        router.refresh();
      } else {
        toast.error(res.error || tMod("failedDismissReport"));
      }
    });
  };

  const handleEscalateSubmit = () => {
    if (!escalateModal) return;
    if (!escalateReason.trim()) {
      toast.error(tMod("explanationRequiredError") || "Escalation reason is required.");
      return;
    }

    startTransition(async () => {
      const res = await escalateReportToAdmin(
        escalateModal.reportId,
        escalateReason.trim(),
        escalateAction,
        escalateTargetRole
      );

      if (res.success) {
        toast.success(
          escalateTargetRole === "moderator"
            ? "Report escalated to Moderator Queue."
            : tMod("escalatedSuccess")
        );
        setEscalateModal(null);
        setEscalateReason("");
        router.refresh();
      } else {
        toast.error(res.error || tMod("failedEscalateReport"));
      }
    });
  };

  const handleEscalateTicketSubmit = () => {
    if (!escalateTicketModal) return;
    if (!escalateTicketReason.trim()) {
      toast.error("Please detail the reason for escalation.");
      return;
    }

    startTransition(async () => {
      const res = await escalateSupportTicket(
        escalateTicketModal.ticketId,
        escalateTicketTargetRole,
        escalateTicketReason.trim()
      );

      if (res.success) {
        toast.success(
          escalateTicketTargetRole === "moderator"
            ? "Support ticket escalated to Moderator Queue."
            : "Support ticket escalated to Executive Admin."
        );
        setEscalateTicketModal(null);
        setEscalateTicketReason("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to escalate ticket.");
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
    <div className="space-y-8 animate-in fade-in duration-300 min-h-screen">
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

        {/* View Toggles & Badges (Strictly Isolated Workspace) */}
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
              <span>Tickets ({openTickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("reports")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === "reports"
                  ? "bg-rup-emerald text-void-deep shadow-[0_0_15px_rgba(0,230,118,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t("tabReports")} ({activeReports.length})</span>
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

      {/* VIEW: STAFF LIVE CHAT */}
      {activeView === "staff_chat" && (
        <StaffLiveChatHub
          currentUserRole={currentUserRole}
          initialChannel="support_tickets"
          embedded
        />
      )}

      {/* VIEW: SUPPORT TICKETS */}
      {activeView === "tickets" && (
        <div className="space-y-6">
          {/* Sub-Filters & Instant Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "open", "in_progress", "resolved"] as const).map((filter) => {
                  const count =
                    filter === "all"
                      ? tickets.length
                      : filter === "open"
                      ? tickets.filter((tk) => tk.status === "open" || tk.status === "pending" || !tk.status).length
                      : tickets.filter((tk) => tk.status === filter).length;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize flex items-center gap-1.5 ${
                        statusFilter === filter
                          ? "bg-rup-emerald text-void-deep shadow-[0_0_15px_rgba(0,230,118,0.3)]"
                          : "text-gray-400 hover:text-white bg-void-surface border border-void-border"
                      }`}
                    >
                      <span>{filter.replace("_", " ")}</span>
                      <span className="font-mono text-[10px] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Role-based Data Privacy Toggle */}
              <SensitiveDataToggle
                showSensitive={showSensitive}
                onToggle={() => setShowSensitive((p) => !p)}
                currentUserRole={currentUserRole}
              />
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
                const privacy = resolveUserPrivacy({
                  currentUserRole,
                  showSensitive,
                  email: ticket.email,
                  phone: ticket.phone,
                  id: ticket.id,
                });

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

                        <span className="text-[10px] font-mono text-gray-500">
                          (ID: {privacy.id})
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

                          {/* Email Display (Masked vs Revealed) */}
                          <div className="flex items-center gap-1.5 font-semibold">
                            {privacy.isEmailMasked ? (
                              <div className="flex items-center gap-1.5 text-gray-400 font-mono">
                                <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                <span>{privacy.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-white">
                                <Mail className="w-3.5 h-3.5 text-rup-emerald shrink-0" />
                                <a href={`mailto:${privacy.email}`} className="hover:underline font-mono">
                                  {privacy.email}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Phone Display (Masked vs Support-Blocked vs Revealed) */}
                          {ticket.phone && (
                            <div className="flex items-center gap-2 mt-1">
                              {privacy.isPhoneMasked ? (
                                <div className="flex items-center gap-1.5 text-gray-400 font-mono text-xs">
                                  <Lock className="w-3 h-3 text-gray-500 shrink-0" />
                                  <span>{t("phoneLabel", { phone: privacy.phone })}</span>
                                  {privacy.isRestrictedForRole && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                      <Lock className="w-2 h-2" />
                                      <span>{t("restrictedToModerator")}</span>
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-gray-200 font-mono text-xs">
                                  <Phone className="w-3 h-3 text-rup-emerald shrink-0" />
                                  <span>{t("phoneLabel", { phone: privacy.phone })}</span>
                                </div>
                              )}
                            </div>
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
                      {!isResolved && (
                        <button
                          type="button"
                          onClick={() => {
                            setEscalateTicketModal({
                              ticketId: ticket.id,
                              subject: ticket.subject,
                              reason: ticket.reason,
                            });
                            setEscalateTicketTargetRole("moderator");
                            setEscalateTicketReason("");
                          }}
                          disabled={isPending}
                          className="px-3.5 py-1.5 rounded-xl bg-void-deep hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Escalate</span>
                        </button>
                      )}

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

      {/* VIEW: REPORTS */}
      {activeView === "reports" && (
        <div className="space-y-6">
          {/* Sub-Filters & Instant Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportsFilter("active")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    reportsFilter === "active"
                      ? "bg-void-surface text-amber-300 border border-amber-500/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tMod("filterActive", { count: activeReports.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setReportsFilter("resolved")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    reportsFilter === "resolved"
                      ? "bg-void-surface text-rup-emerald border border-rup-emerald/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tMod("filterResolved", { count: resolvedReports.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setReportsFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    reportsFilter === "all"
                      ? "bg-void-surface text-plasma-cyan border border-plasma-cyan/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tMod("filterAll", { count: reports.length })}
                </button>
              </div>

              {/* Role-based Data Privacy Toggle */}
              <SensitiveDataToggle
                showSensitive={showSensitive}
                onToggle={() => setShowSensitive((p) => !p)}
                currentUserRole={currentUserRole}
              />
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={reportSearchQuery}
                onChange={(e) => setReportSearchQuery(e.target.value)}
                placeholder={tMod("searchPlaceholder")}
                className="w-full bg-void-deep/90 border border-void-border focus:border-rup-emerald/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
              />
              {reportSearchQuery && (
                <button
                  type="button"
                  onClick={() => setReportSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono px-1">
            <span>{displayedReports.length} reports matched</span>
            <span>{tMod("autoPurgeNotice")}</span>
          </div>

          {displayedReports.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-void-surface/40 border border-dashed border-void-border space-y-2">
              <CheckCircle2 className="w-8 h-8 text-rup-emerald mx-auto" />
              <p className="text-sm font-bold text-white">{tMod("allClearStream")}</p>
              <p className="text-xs text-gray-400">
                {reportsFilter === "active"
                  ? tMod("noActiveReports")
                  : tMod("noResolvedReports")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedReports.map((report) => {
                const targetType = report.target_type || "project";
                const isEscalated = report.status === "escalated";
                const isResolved = report.status === "resolved";
                const countdown = getAutoDeleteCountdown(report.resolved_at, report.updated_at);
                const projectTargetId = report.project_id;
                const orgTargetId = report.org_id;

                const reporterPrivacy = resolveUserPrivacy({
                  currentUserRole,
                  showSensitive,
                  email: report.reporter_email,
                  name: report.reporter_name,
                  id: report.reporter_id,
                });

                const targetPrivacy = resolveUserPrivacy({
                  currentUserRole,
                  showSensitive,
                  email: report.target_user_email,
                  name: report.target_user_name,
                  id: report.target_user_id,
                });

                return (
                  <div
                    key={report.id}
                    className="p-5 sm:p-6 rounded-2xl bg-void-surface border border-void-border hover:border-rup-emerald/40 transition-colors space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-void-border/60">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-void-deep text-plasma-cyan border border-void-border uppercase">
                          [{targetType}]
                        </span>
                        {isEscalated && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            {tMod("escalatedToAdmin")}
                          </span>
                        )}
                        {isResolved && (
                          <>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40">
                              {tMod("statusResolved")}
                            </span>
                            {report.resolution_action && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40">
                                {report.resolution_action}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>{countdown.text}</span>
                            </span>
                          </>
                        )}
                        <span className="text-xs text-gray-400 font-semibold">
                          {tMod.rich("reasonLabel", {
                            reason: report.reason,
                            strong: (c) => <span className="text-white">{c}</span>,
                          })}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {format.dateTime(new Date(report.created_at), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                          {tMod("reportedTarget")}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-white font-semibold text-sm">
                            {targetType === "user"
                              ? (targetPrivacy.name !== "—" ? targetPrivacy.name : report.target_name || "Reported Member")
                              : (report.target_name ||
                                report.projects?.title ||
                                report.users_org?.org_name ||
                                `Target ID: ${targetPrivacy.id}`)}
                          </p>
                          {projectTargetId && (
                            <Link
                              href={`/dashboard/projects/${projectTargetId}`}
                              target="_blank"
                              className="text-plasma-cyan hover:underline inline-flex items-center gap-1 text-[11px] font-bold"
                            >
                              <span>{tMod("view")}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                          {orgTargetId && (
                            <Link
                              href={`/dashboard/organizations/${orgTargetId}`}
                              target="_blank"
                              className="text-plasma-cyan hover:underline inline-flex items-center gap-1 text-[11px] font-bold"
                            >
                              <span>{tMod("org")}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>

                        {/* User Specific Target Details */}
                        {targetPrivacy.email !== "—" && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs font-mono">
                            {targetPrivacy.isEmailMasked ? (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Lock className="w-3 h-3 shrink-0" />
                                <span>{targetPrivacy.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-rup-emerald font-semibold">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span>{targetPrivacy.email}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Reporter Details (Masked vs Revealed) */}
                        {report.reporter_email && (
                          <div className="mt-2 pt-2 border-t border-void-border/40 flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                            <span className="text-gray-500 uppercase text-[9px] font-bold">{tMod("reporterLabel")}</span>
                            {reporterPrivacy.isEmailMasked ? (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Lock className="w-2.5 h-2.5 shrink-0" />
                                <span>{reporterPrivacy.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-300 font-semibold">
                                <Mail className="w-2.5 h-2.5 text-rup-emerald shrink-0" />
                                <span>{reporterPrivacy.email}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">
                          {tMod("reportDetails")}
                        </span>
                        <p className="text-gray-300 bg-void-deep/80 p-3 rounded-xl border border-void-border leading-relaxed whitespace-pre-wrap">
                          {report.description || tMod("noAdditionalComments")}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar (Only for Active Reports) */}
                    {!isResolved && (
                      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleDismissReport(report.id)}
                          disabled={isPending}
                          className="px-3.5 py-1.5 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 hover:text-white border border-void-border text-xs font-bold transition-colors cursor-pointer"
                        >
                          {tMod("dismissReport")}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEscalateModal({
                              reportId: report.id,
                              targetName:
                                report.target_name ||
                                report.projects?.title ||
                                report.users_org?.org_name ||
                                "Target",
                              targetType,
                            })
                          }
                          disabled={isPending}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-void-deep text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{tMod("requestAdminAction")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REPLY MODAL (TICKETS) */}
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
                  <span className="text-white font-mono">
                    {resolveUserPrivacy({
                      currentUserRole,
                      showSensitive,
                      email: replyModal.email,
                      phone: replyModal.phone,
                      id: replyModal.id,
                    }).email}
                  </span>
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

      {/* ESCALATE MODAL (REPORTS) */}
      {escalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">{tMod("escalateModalTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEscalateModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">{tMod("targetLabel")}</label>
                <div className="p-2.5 rounded-xl bg-void-deep border border-void-border text-white font-semibold">
                  {escalateModal.targetName} ({escalateModal.targetType})
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">
                  Escalate To
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEscalateTargetRole("moderator")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      escalateTargetRole === "moderator"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-void-deep border-void-border text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>To Moderator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscalateTargetRole("admin")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      escalateTargetRole === "admin"
                        ? "bg-nova-flare/20 border-nova-flare text-nova-flare shadow-[0_0_12px_rgba(255,46,99,0.25)]"
                        : "bg-void-deep border-void-border text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>To Admin</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">
                  {tMod("requestedAction")}
                </label>
                <select
                  value={escalateAction}
                  onChange={(e) =>
                    setEscalateAction(
                      e.target.value as
                        | "ban_user"
                        | "delete_org"
                        | "delete_survey"
                        | "emergency_lock"
                        | "investigate"
                    )
                  }
                  className="w-full p-2.5 rounded-xl bg-void-deep border border-void-border text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ban_user">{tMod("actionBanUser")}</option>
                  <option value="delete_org">{tMod("actionSuspendOrg")}</option>
                  <option value="delete_survey">{tMod("actionDeleteSurvey")}</option>
                  <option value="emergency_lock">{tMod("actionLockEntity")}</option>
                  <option value="investigate">{tMod("actionInvestigate")}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">
                  {tMod("reasonRequired")}
                </label>
                <textarea
                  rows={4}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  maxLength={2000}
                  placeholder={tMod("escalateReasonPlaceholder")}
                  className="w-full p-2.5 rounded-xl bg-void-deep border border-void-border text-white focus:border-amber-400 focus:outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-void-border">
              <button
                type="button"
                onClick={() => setEscalateModal(null)}
                className="px-4 py-2 rounded-xl bg-void-deep text-gray-300 hover:text-white border border-void-border text-xs font-bold cursor-pointer"
              >
                {tMod("cancel")}
              </button>
              <button
                type="button"
                onClick={handleEscalateSubmit}
                disabled={isPending || !escalateReason.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-void-deep text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{tMod("escalating")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{tMod("transmitEscalation")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATE TICKET MODAL */}
      {escalateTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Escalate Support Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => setEscalateTicketModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">Ticket Subject</label>
                <div className="p-2.5 rounded-xl bg-void-deep border border-void-border text-white font-semibold">
                  {escalateTicketModal.subject}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">Escalate To</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEscalateTicketTargetRole("moderator")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      escalateTicketTargetRole === "moderator"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-void-deep border-void-border text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>To Moderator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscalateTicketTargetRole("admin")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      escalateTicketTargetRole === "admin"
                        ? "bg-nova-flare/20 border-nova-flare text-nova-flare shadow-[0_0_12px_rgba(255,46,99,0.25)]"
                        : "bg-void-deep border-void-border text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>To Admin</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-400 uppercase mb-1">
                  Reason for Escalation
                </label>
                <textarea
                  rows={4}
                  value={escalateTicketReason}
                  onChange={(e) => setEscalateTicketReason(e.target.value)}
                  maxLength={2000}
                  placeholder="Detail the complex policy inquiry, severe dispute, or executive intervention needed..."
                  className="w-full p-2.5 rounded-xl bg-void-deep border border-void-border text-white focus:border-amber-400 focus:outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-void-border">
              <button
                type="button"
                onClick={() => setEscalateTicketModal(null)}
                className="px-4 py-2 rounded-xl bg-void-deep text-gray-300 hover:text-white border border-void-border text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEscalateTicketSubmit}
                disabled={isPending || !escalateTicketReason.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-void-deep text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Escalating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit Escalation</span>
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
