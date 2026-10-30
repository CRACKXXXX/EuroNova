"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Headphones,
  MessageSquare,
  Send,
  Clock,
  ShieldCheck,
  User as UserIcon,
  PlusCircle,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useFormatter } from "next-intl";
import type { UserTicketItem, TicketReplyItem } from "./actions";
import { submitTicketReply } from "./actions";
import { SupportForm } from "./SupportForm";

interface UserSupportHubClientProps {
  initialTickets: UserTicketItem[];
  userEmail: string;
}

export function UserSupportHubClient({
  initialTickets,
  userEmail,
}: UserSupportHubClientProps) {
  const t = useTranslations("SupportHub");
  const tForm = useTranslations("SupportForm");
  const tErrors = useTranslations("Errors");
  const router = useRouter();
  const format = useFormatter();

  const [tickets, setTickets] = useState<UserTicketItem[]>(initialTickets);
  const [prevInitial, setPrevInitial] = useState<UserTicketItem[]>(initialTickets);

  // Synchronize state when initialTickets changes via router refresh (React-recommended pattern)
  if (prevInitial !== initialTickets) {
    setPrevInitial(initialTickets);
    setTickets(initialTickets);
  }

  const [activeTab, setActiveTab] = useState<"my_tickets" | "new_ticket">(
    initialTickets.length === 0 ? "new_ticket" : "my_tickets"
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTickets.length > 0 ? initialTickets[0].id : null
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // Auto-scroll chat to bottom when active ticket or its replies change
  useEffect(() => {
    if (activeTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket]);

  // Status filtering & text search
  const openTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "pending" || t.status === "in_progress"
  );
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");

  const filteredTickets = tickets.filter((ticket) => {
    // 1. Status Filter
    if (statusFilter === "open") {
      if (ticket.status === "resolved") return false;
    } else if (statusFilter === "resolved") {
      if (ticket.status !== "resolved") return false;
    }

    // 2. Search Query Filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const subject = (ticket.subject || "").toLowerCase();
    const reason = (ticket.reason || "").toLowerCase();
    const content = (ticket.content || "").toLowerCase();
    const id = (ticket.id || "").toLowerCase();

    return subject.includes(q) || reason.includes(q) || content.includes(q) || id.includes(q);
  });

  const handleSendReply = () => {
    if (!activeTicket || !replyInput.trim()) return;

    const messageText = replyInput.trim();
    if (messageText.length < 2) {
      toast.error(tForm("contentPlaceholder"));
      return;
    }

    startTransition(async () => {
      const res = await submitTicketReply(activeTicket.id, messageText);

      if (res.error) {
        if (res.error === "RATE_LIMIT_EXCEEDED") {
          toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
        } else {
          toast.error(res.error);
        }
        return;
      }

      if (res.success && res.reply) {
        const newReply: TicketReplyItem = res.reply;
        // Optimistically update tickets list
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id === activeTicket.id) {
              const currentReplies = t.replies || [];
              return {
                ...t,
                status: t.status === "resolved" ? "open" : t.status,
                updated_at: newReply.created_at,
                replies: [...currentReplies, newReply],
              };
            }
            return t;
          })
        );

        setReplyInput("");
        toast.success(t("replySentSuccess"));
        router.refresh();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 shadow-[0_0_8px_rgba(0,230,118,0.15)]">
            <CheckCircle2 className="w-3 h-3" />
            {t("statusResolved")}
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t("statusInProgress")}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            {t("statusPending")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
            <AlertCircle className="w-3 h-3" />
            {t("statusOpen")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-void-surface border border-hyper-violet/30 shadow-[0_0_40px_rgba(99,102,241,0.08)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-hyper-violet/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/40 mb-3">
            <Headphones className="w-3.5 h-3.5" />
            <span>{t("title")}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            EuroNova <span className="text-hyper-violet">{t("hubTitle")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mt-1.5 leading-relaxed">
            {t("subtitle")}
          </p>
          {userEmail && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
              <Mail className="w-3.5 h-3.5 text-hyper-violet" />
              <span>{userEmail}</span>
            </div>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-void-deep border border-void-border shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab("my_tickets")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "my_tickets"
                ? "bg-hyper-violet text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t("tabMyTickets", { count: tickets.length })}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("new_ticket");
              setSelectedTicketId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "new_ticket"
                ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t("tabNewTicket")}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MY TICKETS & TWO-WAY THREAD */}
      {activeTab === "my_tickets" && (
        <div className="space-y-6">
          {tickets.length === 0 ? (
            /* Empty State: No tickets submitted yet */
            <div className="p-10 rounded-3xl bg-void-surface border border-void-border text-center space-y-4 max-w-xl mx-auto shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-hyper-violet/10 border border-hyper-violet/30 flex items-center justify-center mx-auto text-hyper-violet shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Headphones className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {t("noTicketsFound")}
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                {t("noTicketsFoundDesc")}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("new_ticket")}
                  className="px-6 py-3 rounded-xl bg-hyper-violet hover:bg-hyper-violet/90 text-white font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t("createFirstTicket")}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Master-Detail Layout: Tickets List on Left, Interactive Chat Thread on Right */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Tickets Master List (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Search Bar & Status Filter Pills */}
                <div className="p-4 rounded-2xl bg-void-surface border border-void-border space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                      className="w-full pl-9 pr-3 py-2 bg-void-deep border border-void-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "all"
                          ? "bg-hyper-violet/20 text-white border border-hyper-violet/50"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {t("filterAll", { count: tickets.length })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("open")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "open"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {t("filterOpen", { count: openTickets.length })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("resolved")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "resolved"
                          ? "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/50"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {t("filterResolved", { count: resolvedTickets.length })}
                    </button>
                  </div>
                </div>

                {/* Ticket Cards */}
                <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                  {filteredTickets.map((ticket) => {
                    const isSelected = ticket.id === selectedTicketId;
                    const repliesCount = ticket.replies?.length || 0;

                    return (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 relative group ${
                          isSelected
                            ? "bg-void-surface border-hyper-violet shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-hyper-violet/50"
                            : "bg-void-surface/60 hover:bg-void-surface border-void-border hover:border-hyper-violet/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-void-deep text-gray-400 border border-void-border">
                            {ticket.reason}
                          </span>
                          {getStatusBadge(ticket.status)}
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-hyper-violet transition-colors line-clamp-1">
                          {ticket.subject}
                        </h4>

                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {ticket.content}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-void-border/50 text-[11px] text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {format.dateTime(new Date(ticket.created_at), {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-hyper-violet font-semibold">
                            <MessageSquare className="w-3 h-3" />
                            <span>{t("repliesCount", { count: repliesCount })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Two-Way Interactive Ticket Chat Thread (lg:col-span-7) */}
              <div className="lg:col-span-7">
                {activeTicket ? (
                  <div className="rounded-3xl bg-void-surface border border-void-border overflow-hidden shadow-2xl flex flex-col h-[740px]">
                    {/* Thread Top Header */}
                    <div className="p-5 border-b border-void-border bg-void-deep/80 space-y-2 shrink-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(activeTicket.status)}
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-void-surface text-gray-400 border border-void-border">
                            {activeTicket.reason}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono">
                            #{activeTicket.id.slice(0, 8)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedTicketId(null)}
                          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-border transition-colors"
                          title={t("closeThread")}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {activeTicket.subject}
                      </h2>

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                          <span>{activeTicket.email}</span>
                        </div>
                        {activeTicket.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            <span>{activeTicket.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                      {/* Message 1: Initial User Ticket Inquiry */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-void-deep border border-void-border flex items-center justify-center shrink-0 text-gray-400">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1.5 max-w-[85%]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-300">
                              {t("userReply")}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {format.dateTime(new Date(activeTicket.created_at), {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="p-4 rounded-2xl rounded-tl-sm bg-void-deep border border-void-border text-gray-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-inner">
                            {activeTicket.content}
                          </div>
                        </div>
                      </div>

                      {/* Subsequent Thread Replies */}
                      {activeTicket.replies && activeTicket.replies.length > 0 ? (
                        activeTicket.replies.map((reply) => {
                          const isStaff = reply.sender_role !== "user";

                          return (
                            <div
                              key={reply.id}
                              className={`flex gap-3 ${
                                isStaff ? "flex-row" : "flex-row-reverse"
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                  isStaff
                                    ? "bg-hyper-violet/20 border border-hyper-violet text-hyper-violet shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                    : "bg-void-deep border border-void-border text-gray-400"
                                }`}
                              >
                                {isStaff ? (
                                  <ShieldCheck className="w-4 h-4" />
                                ) : (
                                  <UserIcon className="w-4 h-4" />
                                )}
                              </div>

                              <div
                                className={`space-y-1.5 max-w-[85%] ${
                                  isStaff ? "items-start text-left" : "items-end text-right"
                                }`}
                              >
                                <div
                                  className={`flex items-center gap-2 ${
                                    isStaff ? "justify-start" : "justify-end"
                                  }`}
                                >
                                  {isStaff ? (
                                    <>
                                      <span className="text-xs font-black text-hyper-violet">
                                        {reply.sender_name || t("staffReply")}
                                      </span>
                                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-hyper-violet/10 text-hyper-violet border border-hyper-violet/30">
                                        {t("staffBadge")}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs font-bold text-gray-300">
                                      {t("userReply")}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-500">
                                    {format.dateTime(new Date(reply.created_at), {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>

                                <div
                                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                                    isStaff
                                      ? "rounded-tl-sm bg-hyper-violet/10 border border-hyper-violet/40 text-gray-100 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                                      : "rounded-tr-sm bg-void-deep border border-void-border text-gray-200"
                                  }`}
                                >
                                  {reply.message}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : activeTicket.resolution_action ? (
                        /* Legacy fallback if single resolution_action exists */
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-hyper-violet/20 border border-hyper-violet text-hyper-violet shadow-[0_0_10px_rgba(99,102,241,0.2)] flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div className="space-y-1.5 max-w-[85%] text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-hyper-violet">
                                {t("staffReply")}
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-hyper-violet/10 text-hyper-violet border border-hyper-violet/30">
                                {t("staffBadge")}
                              </span>
                            </div>
                            <div className="p-4 rounded-2xl rounded-tl-sm bg-hyper-violet/10 border border-hyper-violet/40 text-gray-100 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-[0_0_20px_rgba(99,102,241,0.08)]">
                              {activeTicket.resolution_action}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-void-deep/60 border border-void-border text-center text-xs text-gray-500">
                          {t("noRepliesYet")}
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Bottom Status & Input Area */}
                    <div className="p-4 sm:p-5 border-t border-void-border bg-void-deep/80 space-y-3 shrink-0">
                      {activeTicket.status === "resolved" && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>{t("ticketResolvedNotice")}</span>
                        </div>
                      )}

                      <div className="flex items-end gap-2.5">
                        <textarea
                          rows={2}
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                          placeholder={t("replyPlaceholder")}
                          className="flex-1 bg-void-deep border border-void-border rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet resize-none transition-colors"
                        />

                        <button
                          type="button"
                          onClick={handleSendReply}
                          disabled={isPending || !replyInput.trim()}
                          className="px-5 py-3 rounded-xl bg-hyper-violet hover:bg-hyper-violet/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">
                            {isPending ? t("sendingReply") : t("sendReply")}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[740px] rounded-3xl bg-void-surface border border-void-border flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mb-3 text-gray-600" />
                    <p className="text-sm font-medium">{t("ticketDetails")}</p>
                    <p className="text-xs text-gray-600 max-w-xs mt-1">
                      {t("searchPlaceholder")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SUBMIT NEW TICKET */}
      {activeTab === "new_ticket" && (
        <div className="bg-void-surface border border-void-border rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl max-w-3xl mx-auto">
          <div className="absolute top-0 right-0 w-64 h-64 bg-plasma-cyan/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="mb-6 flex items-center justify-between pb-4 border-b border-void-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
                <PlusCircle className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t("tabNewTicket")}
              </h2>
            </div>

            {tickets.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("my_tickets")}
                className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t("backToTickets")}</span>
              </button>
            )}
          </div>
          <SupportForm />
        </div>
      )}
    </div>
  );
}
