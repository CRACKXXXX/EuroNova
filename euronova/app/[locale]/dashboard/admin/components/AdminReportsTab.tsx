"use client";

import React, { useState } from "react";
import { type UserRole } from "@/lib/roles";
import {
  type ReportItem,
  type AdminTranslator,
  type AdminFormatter,
  formatId,
  maskEmail,
} from "./AdminTypes";
import { AdminPagination } from "./AdminCommonComponents";
import {
  dismissReport,
  reopenReport,
  deleteReportedComment,
  deleteCommentAndWarnUser,
  deleteCommentAndBanUser,
  deleteSurveyAndWarnCreator,
  warnSurveyCreator,
  hideProject,
  requestChanges,
  suspendOrganization,
} from "../actions";
import {
  ShieldAlert,
  ShieldCheck,
  User,
  FolderGit2,
  Building,
  MessageSquare,
  ExternalLink,
  Trash2,
  AlertCircle,
  AlertTriangle,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface AdminReportsTabProps {
  reports: ReportItem[];
  totalReports: number;
  reportCategory: "all" | "users" | "projects" | "quarantine";
  setReportCategory: (c: "all" | "users" | "projects" | "quarantine") => void;
  currentUserRole: UserRole;
  showSensitive: boolean;
  isPending: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  handleAction: (actionFn: () => Promise<{ success?: boolean; error?: string }>) => void;
  setEscalateModal: (m: {
    reportId: string;
    targetName: string;
    targetType: string;
    defaultAction: "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate";
  } | null) => void;
  setEscalateAction: (a: "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate") => void;
  setEscalateReason: (r: string) => void;
  setDeleteConfig: (cfg: {
    action: () => Promise<{ success?: boolean; error?: string }>;
    title: string;
    message: string;
  } | null) => void;
  t: AdminTranslator;
  format: AdminFormatter;
}

export function AdminReportsTab({
  reports,
  totalReports,
  reportCategory,
  setReportCategory,
  currentUserRole,
  showSensitive,
  isPending,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  handleAction,
  setEscalateModal,
  setEscalateAction,
  setEscalateReason,
  setDeleteConfig,
  t,
  format,
}: AdminReportsTabProps) {
  const [renderTimestamp] = useState(() => Date.now());

  const activeReports = reports.filter(
    (r) => r.status === "pending" || r.status === "reviewed"
  );
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  const isQuarantineReport = (r: ReportItem) => {
    const type = r.target_type || (r.project_id ? "project" : r.org_id ? "organization" : "user");
    return (
      type === "quarantine" ||
      (r.reason && r.reason.toLowerCase().includes("quarantine")) ||
      (r.description && r.description.startsWith("[Quarantine"))
    );
  };

  const isUserOrCommentReport = (r: ReportItem) => {
    if (isQuarantineReport(r)) return false;
    const type = r.target_type || (r.project_id ? "project" : r.org_id ? "organization" : "user");
    return type === "user" || type === "comment";
  };

  const isProjectOrOrgReport = (r: ReportItem) => {
    if (isQuarantineReport(r)) return false;
    const type = r.target_type || (r.project_id ? "project" : r.org_id ? "organization" : "user");
    return ["project", "organization", "survey"].includes(type);
  };

  const activeQuarantineReports = activeReports.filter(isQuarantineReport);
  const activeUserReports = activeReports.filter(isUserOrCommentReport);
  const activeProjectReports = activeReports.filter(isProjectOrOrgReport);

  const filteredActiveReports = activeReports.filter((r) => {
    if (reportCategory === "quarantine") return isQuarantineReport(r);
    if (reportCategory === "users") return isUserOrCommentReport(r);
    if (reportCategory === "projects") return isProjectOrOrgReport(r);
    return true;
  });

  const filteredResolvedReports = resolvedReports.filter((r) => {
    if (reportCategory === "quarantine") return isQuarantineReport(r);
    if (reportCategory === "users") return isUserOrCommentReport(r);
    if (reportCategory === "projects") return isProjectOrOrgReport(r);
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP BOX: Active Transmissions */}
      <div className="bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-void-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center text-nova-flare shrink-0 shadow-[0_0_15px_rgba(255,46,99,0.25)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{t("activeReportsTitle")}</span>
                {activeReports.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-nova-flare animate-ping inline-block" />
                )}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {t("activeReportsSubtitle")}
              </p>
            </div>
          </div>

          {/* Triage Summary Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-nova-flare/15 border border-nova-flare/30 text-xs font-bold text-nova-flare">
              {t("activeCountLabel", { count: activeReports.length })}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border text-xs font-semibold text-gray-300">
              {t.rich("totalReportsLabel", {
                count: totalReports,
                strong: (c: React.ReactNode) => <strong className="text-white">{c}</strong>,
              })}
            </span>
          </div>
        </div>

        {/* Sub-Tabs Split */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setReportCategory("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportCategory === "all"
                ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.35)]"
                : "bg-void-deep border border-void-border text-gray-400 hover:text-white"
            }`}
          >
            {t("allReportsTab", { count: activeReports.length })}
          </button>
          <button
            type="button"
            onClick={() => setReportCategory("users")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportCategory === "users"
                ? "bg-gradient-to-r from-plasma-cyan to-hyper-violet text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                : "bg-void-deep border border-void-border text-gray-400 hover:text-white hover:border-hyper-violet/40"
            }`}
          >
            <User className="w-3.5 h-3.5 text-hyper-violet" />
            <span>{t("userCommentReportsTab")}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-hyper-violet/30 text-white font-mono">
              {activeUserReports.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setReportCategory("projects")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportCategory === "projects"
                ? "bg-nova-flare text-white shadow-[0_0_15px_rgba(255,46,99,0.35)]"
                : "bg-void-deep border border-void-border text-gray-400 hover:text-white hover:border-nova-flare/40"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-nova-flare" />
            <span>{t("projectOrgSurveysTab")}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-nova-flare/30 text-white font-mono">
              {activeProjectReports.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setReportCategory("quarantine")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportCategory === "quarantine"
                ? "bg-amber-400 text-void-deep shadow-[0_0_15px_rgba(245,158,11,0.45)]"
                : "bg-void-deep border border-amber-500/40 text-amber-400 hover:text-white hover:border-amber-400"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>{t("quarantineSuspiciousTab")}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-mono font-bold">
              {activeQuarantineReports.length}
            </span>
          </button>
        </div>

        {/* Active Reports List */}
        {filteredActiveReports.length === 0 ? (
          <div className="py-14 text-center border border-dashed border-void-border rounded-2xl bg-void-deep/40">
            <ShieldCheck className="w-12 h-12 text-rup-emerald/70 mx-auto mb-3" />
            <p className="text-gray-200 font-bold text-base">
              {reportCategory === "quarantine"
                ? "Quarantine Tray is Clear."
                : reportCategory === "users"
                ? "No pending User or Comment reports."
                : reportCategory === "projects"
                ? "No pending Project, Org & Surveys reports."
                : t("noActiveReports")}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {reportCategory === "quarantine"
                ? "No suspicious transmissions or auto-moderated content awaiting orbital review."
                : "No pending reports require moderator intervention in this section."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActiveReports.map((report) => {
              const targetType = report.target_type || (report.project_id ? "project" : report.org_id ? "organization" : "user");

              const reasonColor =
                report.reason === "scam"
                  ? "bg-nova-flare/15 text-nova-flare border-nova-flare/30"
                  : report.reason === "fee"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : report.reason === "broken"
                  ? "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/30"
                  : targetType === "quarantine" || isQuarantineReport(report)
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/30";

              const statusColor =
                report.status === "pending"
                  ? "bg-nova-flare/20 text-nova-flare border-nova-flare/40"
                  : "bg-hyper-violet/20 text-hyper-violet border-hyper-violet/40";

              return (
                <div
                  key={report.id}
                  className="p-5 sm:p-6 rounded-2xl bg-void-deep/90 border border-void-border hover:border-plasma-cyan/30 transition-all flex flex-col lg:flex-row lg:items-start justify-between gap-6 shadow-sm"
                >
                  <div className="space-y-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {(targetType === "quarantine" || isQuarantineReport(report)) && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          [QUARANTINE / SUSPICIOUS]
                        </span>
                      )}
                      {targetType === "project" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/40 flex items-center gap-1 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                          <FolderGit2 className="w-3 h-3" />
                          [PROJECT]
                        </span>
                      )}
                      {targetType === "organization" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/40 flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
                          <Building className="w-3 h-3" />
                          [ORGANIZATION]
                        </span>
                      )}
                      {targetType === "survey" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/40 flex items-center gap-1 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                          <MessageSquare className="w-3 h-3" />
                          [SURVEY]
                        </span>
                      )}
                      {(targetType === "user" || targetType === "comment") && !isQuarantineReport(report) && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                          <MessageSquare className="w-3 h-3" />
                          [USER & COMMENT]
                        </span>
                      )}

                      {report.status === "escalated" ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          ESCALATED TO ADMIN
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusColor}`}>
                          {report.status}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${reasonColor}`}>
                        {report.reason}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {format.dateTime(new Date(report.created_at), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {(targetType === "user" || targetType === "comment" || targetType === "quarantine" || isQuarantineReport(report)) ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-xl bg-void-surface border border-void-border/70 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-gray-400 pb-1 border-b border-void-border/50">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-plasma-cyan flex items-center gap-1">
                              <User className="w-3 h-3 text-plasma-cyan" />
                              {t("submittedByReporter")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <span className="text-gray-400">{t("reporterNameLabel")}</span>
                            <span className="text-white font-bold">
                              {report.reporter_name || t("anonymousReporter")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{t("reporterEmailLabel")}</span>
                            <span className="text-gray-300 font-mono">
                              {report.reporter_email
                                ? showSensitive
                                  ? report.reporter_email
                                  : maskEmail(report.reporter_email)
                                : "Anonymous"}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                              {t("reportedUser")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <span className="text-gray-400">{t("userNameLabel")}</span>
                            <span className="text-white font-black">
                              {report.target_user_name || report.target_name || "Unknown User"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{t("userEmailLabel")}</span>
                            <span className="text-gray-200 font-mono font-semibold">
                              {report.target_user_email
                                ? showSensitive
                                  ? report.target_user_email
                                  : maskEmail(report.target_user_email)
                                : "No registered email"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-400">{t("userIdLabel")}</span>
                            <span className={`text-plasma-cyan font-bold ${showSensitive ? "break-all" : ""}`}>
                              {report.target_user_id
                                ? showSensitive
                                  ? report.target_user_id
                                  : formatId(report.target_user_id, false)
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                          {targetType === "organization" ? "Reported Organization:" : targetType === "survey" ? "Reported Survey:" : "Reported Mission:"}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {targetType === "survey" && (
                            <h3 className="text-base font-bold text-white hover:text-plasma-cyan transition-colors">
                              {report.target_name || "Community Survey"}
                            </h3>
                          )}

                          {targetType === "project" && (
                            <>
                              <h3 className="text-base font-bold text-white hover:text-plasma-cyan transition-colors">
                                {report.projects?.title || `Project ID: ${report.project_id}`}
                              </h3>
                              {report.project_id && (
                                <a
                                  href={`/dashboard/projects/${report.project_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-plasma-cyan hover:text-white p-1 rounded hover:bg-void-surface transition-colors inline-flex items-center gap-1 text-xs"
                                  title={t("viewProject")}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span className="text-[11px] underline">{t("openMission")}</span>
                                </a>
                              )}
                              {report.projects?.status && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-void-surface border border-void-border text-gray-400">
                                  {t("statusPrefix", { status: report.projects.status })}
                                </span>
                              )}
                            </>
                          )}

                          {targetType === "organization" && (
                            <>
                              <h3 className="text-base font-bold text-white hover:text-hyper-violet transition-colors">
                                {report.users_org?.org_name || report.target_name || `Org ID: ${report.org_id}`}
                              </h3>
                              {report.org_id && (
                                <a
                                  href={`/dashboard/organizations/${report.org_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-hyper-violet hover:text-white p-1 rounded hover:bg-void-surface transition-colors inline-flex items-center gap-1 text-xs"
                                  title={t("viewPublicOrgProfile")}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span className="text-[11px] underline">{t("openProfile")}</span>
                                </a>
                              )}
                              {report.users_org?.verification_status && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-void-surface border border-void-border text-gray-400">
                                  {t("verificationPrefix", { status: report.users_org.verification_status })}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {report.description && (
                      <div className="p-3.5 rounded-xl bg-void-surface border border-void-border/70 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          {t("reportNotesFlagged")}
                        </span>
                        {report.description}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 lg:w-52">
                    {(targetType === "user" || targetType === "comment" || targetType === "quarantine" || isQuarantineReport(report)) && (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleAction(() =>
                              deleteReportedComment(report.id, undefined, report.target_user_id || undefined)
                            )
                          }
                          className="flex-1 py-2 px-3 rounded-xl bg-void-surface hover:bg-nova-flare/15 text-gray-300 hover:text-nova-flare border border-void-border hover:border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                          title={t("tooltipRemoveComment")}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("deleteComment")}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleAction(() =>
                              deleteCommentAndWarnUser(report.id, undefined, report.target_user_id || undefined)
                            )
                          }
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)] disabled:opacity-50"
                          title={t("tooltipWarnUser")}
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("deleteAndWarn")}</span>
                        </button>

                        {currentUserRole === "moderator" ? (
                          <button
                            type="button"
                            disabled={isPending || report.status === "escalated"}
                            onClick={() => {
                              setEscalateModal({
                                reportId: report.id,
                                targetName: report.target_user_name || report.target_name || t("reportedUser"),
                                targetType: "user",
                                defaultAction: "ban_user",
                              });
                              setEscalateAction("ban_user");
                              setEscalateReason(`Account suspension request flagged by moderator: ${report.reason}`);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-50"
                            title={t("tooltipModCannotBan")}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{report.status === "escalated" ? "Escalated" : "Escalate Ban Request"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setDeleteConfig({
                                action: () =>
                                  deleteCommentAndBanUser(report.id, undefined, report.target_user_id || undefined),
                                title: "Ban User Account & Delete Comment",
                                message: `Are you sure you want to permanently suspend the account of "${report.target_user_name || report.target_name || report.target_user_id}" and delete the reported comment? This user will be barred from EuroNova.`,
                              });
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.2)] disabled:opacity-50"
                            title={t("tooltipBanUser")}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("deleteAndBan")}</span>
                          </button>
                        )}
                      </>
                    )}

                    {report.project_id && (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setDeleteConfig({
                              action: () => hideProject(report.project_id!, report.id),
                              title: "Hide & Reject Reported Project",
                              message: `This will withdraw the project "${report.projects?.title || report.project_id}" from public view, mark this report as resolved, and schedule it for auto-cleanup after 72h.`,
                            });
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.15)] disabled:opacity-50"
                        >
                          <EyeOff className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("hideProject")}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleAction(() =>
                              requestChanges(
                                report.project_id!,
                                report.id,
                                `Moderator request: volunteer report flagged (${report.reason})`
                              )
                            )
                          }
                          className="flex-1 py-2 px-3 rounded-xl bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("requestChanges")}</span>
                        </button>
                      </>
                    )}

                    {targetType === "survey" && (
                      <>
                        {currentUserRole === "moderator" ? (
                          <button
                            type="button"
                            disabled={isPending || report.status === "escalated"}
                            onClick={() => {
                              setEscalateModal({
                                reportId: report.id,
                                targetName: report.target_name || "Community Survey",
                                targetType: "survey",
                                defaultAction: "delete_survey",
                              });
                              setEscalateAction("delete_survey");
                              setEscalateReason(`Survey deletion request flagged by moderator: ${report.reason}`);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-50"
                            title={t("tooltipModCannotDeleteSurvey")}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{report.status === "escalated" ? "Escalated" : "Escalate to Admin"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setDeleteConfig({
                                action: () =>
                                  deleteSurveyAndWarnCreator(
                                    report.id,
                                    report.target_name || undefined,
                                    report.target_user_id || report.org_id || undefined
                                  ),
                                title: "Delete Survey & Warn Creator",
                                message: `Are you sure you want to permanently delete the survey "${report.target_name || "this survey"}" and apply an official disciplinary warning strike (-15 Trust Score) to the creator?`,
                              });
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.2)] disabled:opacity-50"
                            title={t("tooltipDeleteSurvey")}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("deleteAndWarnSurvey")}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleAction(() =>
                              warnSurveyCreator(
                                report.id,
                                report.target_user_id || report.org_id || undefined
                              )
                            )
                          }
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)] disabled:opacity-50"
                          title={t("tooltipWarnSurveyCreator")}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("warnOnly")}</span>
                        </button>
                      </>
                    )}

                    {targetType === "organization" && report.org_id && (
                      <>
                        {currentUserRole === "moderator" ? (
                          <button
                            type="button"
                            disabled={isPending || report.status === "escalated"}
                            onClick={() => {
                              setEscalateModal({
                                reportId: report.id,
                                targetName: report.users_org?.org_name || "Organization",
                                targetType: "organization",
                                defaultAction: "delete_org",
                              });
                              setEscalateAction("delete_org");
                              setEscalateReason(`Organization suspension request flagged by moderator: ${report.reason}`);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-50"
                            title={t("tooltipModCannotSuspendOrg")}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{report.status === "escalated" ? "Escalated" : "Escalate to Admin"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setDeleteConfig({
                                action: () => suspendOrganization(report.org_id!, report.id),
                                title: "Suspend Reported Organization",
                                message: `Are you sure you want to suspend this organization? It will be marked as rejected and revoked from publishing.`,
                              });
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(255,46,99,0.15)] disabled:opacity-50"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("suspendOrg")}</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAction(() => dismissReport(report.id))}
                      className="flex-1 py-2 px-3 rounded-xl bg-void-surface hover:bg-void-border/60 text-gray-300 hover:text-white border border-void-border font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-rup-emerald shrink-0" />
                      <span>{t("dismissReport")}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. BOTTOM BOX: Resolved Log with Undo/Reopen Action */}
      <div className="bg-void-surface/50 border border-void-border/60 rounded-2xl p-6 sm:p-8 opacity-75 grayscale-[15%] transition-all hover:opacity-90 hover:grayscale-0 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-void-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 flex items-center justify-center text-rup-emerald shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-200 tracking-tight flex items-center gap-2">
                <span>{t("resolvedReportsTitle")}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rup-emerald/10 text-rup-emerald border border-rup-emerald/20 font-mono">
                  {filteredResolvedReports.length}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {t("resolvedReportsSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-void-deep/80 border border-void-border/60 text-xs text-gray-400 font-mono">
              {t("autoPurged72h")}
            </span>
          </div>
        </div>

        {/* Resolved Reports List */}
        {filteredResolvedReports.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-void-border/60 rounded-2xl bg-void-deep/30">
            <p className="text-gray-400 text-sm font-medium">{t("noResolvedReports")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResolvedReports.map((report) => {
              const targetType = report.target_type || (report.project_id ? "project" : report.org_id ? "organization" : "user");

              return (
                <div
                  key={report.id}
                  className="p-4 rounded-xl bg-void-deep/60 border border-void-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-void-surface border border-void-border text-plasma-cyan font-mono">
                        [{targetType.toUpperCase()}]
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                        {t("reportResolved")}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-void-surface border border-void-border text-gray-400 uppercase">
                        {report.reason}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {t("filedDate", { date: format.dateTime(new Date(report.created_at), { dateStyle: 'medium' }) })}
                      </span>
                      {report.resolved_at && (
                        <span className="text-[11px] text-rup-emerald/80 font-mono">
                          • Resolved: {format.dateTime(new Date(report.resolved_at), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {report.resolution_action && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30">
                          {t("actionCol", { action: report.resolution_action })}
                        </span>
                      )}
                      {(() => {
                        const ts = report.updated_at || report.resolved_at || report.created_at;
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

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-200">
                        {targetType === "organization"
                          ? (report.users_org?.org_name || report.target_name || `Org: ${report.org_id}`)
                          : targetType === "user" || targetType === "comment" || report.target_user_id
                          ? (report.target_user_name || report.target_name || `User: ${report.target_user_id}`)
                          : (report.projects?.title || `Project: ${report.project_id}`)}
                      </span>
                      {report.project_id && (
                        <a
                          href={`/dashboard/projects/${report.project_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-plasma-cyan p-0.5 transition-colors"
                          title={t("viewProject")}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {report.org_id && (
                        <a
                          href={`/dashboard/organizations/${report.org_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-hyper-violet p-0.5 transition-colors"
                          title={t("viewOrgProfile")}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {report.description && (
                      <p className="text-xs text-gray-400 italic line-clamp-2">
                        &ldquo;{report.description}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Undo / Reopen Button & Status confirmation */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAction(() => reopenReport(report.id))}
                      className="py-1.5 px-3 rounded-lg bg-hyper-violet/15 hover:bg-hyper-violet/25 text-hyper-violet border border-hyper-violet/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title={t("reopenReportTooltip")}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t("undoReopen")}</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs text-rup-emerald/90 font-medium px-3 py-1.5 rounded-lg bg-rup-emerald/10 border border-rup-emerald/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rup-emerald" />
                      <span className="hidden sm:inline">{t("closed")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalReports}
        pageSize={pageSize}
        isPending={isPending}
        onPageChange={onPageChange}
        showingResultsText={t("showingResults", {
          from: (currentPage - 1) * pageSize + 1,
          to: Math.min(currentPage * pageSize, totalReports),
          total: totalReports,
        })}
        previousText={t("previous")}
        nextText={t("next")}
        pageOfText={t("pageOf", { current: currentPage, total: totalPages })}
      />
    </div>
  );
}
