"use client";

import React from "react";
import {
  type ProjectItem,
  type AdminTranslator,
} from "./AdminTypes";
import {
  type AdminProjectEditPayload,
  type AdminEscalationItem,
  type StaffTicketItem,
} from "../actions";
import {
  Edit3,
  X,
  CheckCircle2,
  Bell,
  Trash2,
  ShieldAlert,
  Loader2,
  Send,
  Check,
  Headphones,
} from "lucide-react";

interface AdminModalsProps {
  // 1. Edit Project Modal
  editingProject: ProjectItem | null;
  setEditingProject: (p: ProjectItem | null) => void;
  editForm: AdminProjectEditPayload;
  setEditForm: React.Dispatch<React.SetStateAction<AdminProjectEditPayload>>;
  handleSaveProjectEdit: (e: React.FormEvent) => void;

  // 2. Notification Modal
  notifyConfig: {
    targetId: string;
    targetName: string;
    targetType: "user" | "org";
  } | null;
  setNotifyConfig: (cfg: { targetId: string; targetName: string; targetType: "user" | "org" } | null) => void;
  notifyTitle: string;
  setNotifyTitle: (t: string) => void;
  notifyMessage: string;
  setNotifyMessage: (m: string) => void;
  notifyType: "system" | "action_required" | "moderation" | "alert";
  setNotifyType: (t: "system" | "action_required" | "moderation" | "alert") => void;
  handleSendNotification: () => void;

  // 3. Delete Confirm Modal
  deleteConfig: {
    action: () => Promise<{ success?: boolean; error?: string }>;
    title: string;
    message: string;
  } | null;
  setDeleteConfig: (cfg: { action: () => Promise<{ success?: boolean; error?: string }>; title: string; message: string } | null) => void;
  handleConfirmDelete: () => void;

  // 4. Escalate Action Modal
  escalateModal: {
    reportId: string;
    targetName: string;
    targetType: string;
    defaultAction: "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate";
  } | null;
  setEscalateModal: (m: { reportId: string; targetName: string; targetType: string; defaultAction: "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate" } | null) => void;
  escalateAction: "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate";
  setEscalateAction: (a: "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate") => void;
  escalateReason: string;
  setEscalateReason: (r: string) => void;
  handleEscalateSubmit: () => void;

  // 5. Resolve Escalate Modal
  resolveEscalateModal: {
    escalation: AdminEscalationItem;
    decision: "approved" | "rejected";
  } | null;
  setResolveEscalateModal: (m: { escalation: AdminEscalationItem; decision: "approved" | "rejected" } | null) => void;
  resolveNotes: string;
  setResolveNotes: (n: string) => void;
  handleResolveEscalateSubmit: () => void;

  // 6. Ticket Reply Modal
  ticketReplyModal: {
    ticket: StaffTicketItem;
  } | null;
  setTicketReplyModal: (m: { ticket: StaffTicketItem } | null) => void;
  ticketReplyMessage: string;
  setTicketReplyMessage: (msg: string) => void;
  ticketReplyStatus: "open" | "in_progress" | "resolved";
  setTicketReplyStatus: (st: "open" | "in_progress" | "resolved") => void;
  handleTicketReplySubmit: () => void;

  // Shared
  isPending: boolean;
  t: AdminTranslator;
}

export function AdminModals({
  editingProject,
  setEditingProject,
  editForm,
  setEditForm,
  handleSaveProjectEdit,
  notifyConfig,
  setNotifyConfig,
  notifyTitle,
  setNotifyTitle,
  notifyMessage,
  setNotifyMessage,
  notifyType,
  setNotifyType,
  handleSendNotification,
  deleteConfig,
  setDeleteConfig,
  handleConfirmDelete,
  escalateModal,
  setEscalateModal,
  escalateAction,
  setEscalateAction,
  escalateReason,
  setEscalateReason,
  handleEscalateSubmit,
  resolveEscalateModal,
  setResolveEscalateModal,
  resolveNotes,
  setResolveNotes,
  handleResolveEscalateSubmit,
  ticketReplyModal,
  setTicketReplyModal,
  ticketReplyMessage,
  setTicketReplyMessage,
  ticketReplyStatus,
  setTicketReplyStatus,
  handleTicketReplySubmit,
  isPending,
  t,
}: AdminModalsProps) {
  return (
    <>
      {/* 1. God Mode Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,229,255,0.2)] animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{t("editMissionTitle")}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30">
                      ADMIN
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("editMissionSubtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  {t("missionTitleLabel")} <span className="text-nova-flare">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none focus:ring-1 focus:ring-plasma-cyan"
                  placeholder={t("projectTitlePlaceholder")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    {t("destCountryLabel")}
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editForm.dest_country || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dest_country: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm uppercase font-mono focus:border-plasma-cyan focus:outline-none"
                    placeholder={t("countriesExamplePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    {t("projectTypeLabel")}
                  </label>
                  <select
                    value={editForm.project_type || "YE"}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, project_type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none"
                  >
                    <option value="YE">{t("typeYe")}</option>
                    <option value="TC">{t("typeTc")}</option>
                    <option value="ESC">{t("typeEsc")}</option>
                    <option value="OTHER">{t("typeOther")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    {t("durationDaysLabel")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.duration_days ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, duration_days: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none"
                    placeholder={t("durationDaysPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  {t("externalAppUrlLabel")}
                </label>
                <input
                  type="url"
                  value={editForm.official_url || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, official_url: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm font-mono focus:border-plasma-cyan focus:outline-none"
                  placeholder={t("externalAppUrlPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  {t("descriptionLabel")}
                </label>
                <textarea
                  rows={5}
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={10000}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none resize-y"
                  placeholder={t("projectDescPlaceholder")}
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.covers_rup_flights)}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, covers_rup_flights: e.target.checked }))}
                    className="w-4 h-4 rounded border-void-border bg-void-deep text-rup-emerald focus:ring-rup-emerald"
                  />
                  <span>{t("coversRupFlights")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.is_last_minute)}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, is_last_minute: e.target.checked }))}
                    className="w-4 h-4 rounded border-void-border bg-void-deep text-nova-flare focus:ring-nova-flare"
                  />
                  <span>{t("lastMinuteUrgent")}</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-gray-800 text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isPending ? t("saving") : t("saveChanges")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Custom In-App Notification Modal for Users & Organizations */}
      {notifyConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/30 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_40px_rgba(0,229,255,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 mb-5 border-b border-void-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {t("sendInAppNotificationTitle")}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {t.rich("recipientLabel", {
                      name: notifyConfig.targetName,
                      span: (c: React.ReactNode) => <span className="text-plasma-cyan font-semibold">{c}</span>,
                    })} ({notifyConfig.targetType === "org" ? "Organization" : "Youth User"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifyConfig(null)}
                disabled={isPending}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  {t("notificationCategory")}
                </label>
                <select
                  value={notifyType}
                  onChange={(e) => setNotifyType(e.target.value as "system" | "action_required" | "moderation" | "alert")}
                  disabled={isPending}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none cursor-pointer"
                >
                  <option value="system">{t("catAnnouncement")}</option>
                  <option value="alert">{t("catAlert")}</option>
                  <option value="moderation">{t("catPolicy")}</option>
                  <option value="action_required">{t("catActionRequired")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  {t("notificationTitleLabel")}
                </label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  disabled={isPending}
                  placeholder={t("notificationTitlePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  {t("transmissionMessageLabel")}
                </label>
                <textarea
                  rows={4}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  maxLength={3000}
                  disabled={isPending}
                  placeholder={t("notificationMsgPlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setNotifyConfig(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-gray-800 text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={isPending || !notifyTitle.trim() || !notifyMessage.trim()}
                className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("transmitting")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t("sendNotificationBtn")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Custom Delete Confirmation Modal */}
      {deleteConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-nova-flare/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,46,99,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-nova-flare/10 border border-nova-flare/30 rounded-full flex items-center justify-center mb-1">
                <Trash2 className="w-8 h-8 text-nova-flare" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {deleteConfig.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {deleteConfig.message}
              </p>

              <div className="w-full flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteConfig(null)}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold bg-void-deep hover:bg-gray-800 text-gray-300 hover:text-white transition-colors border border-void-border disabled:opacity-50 text-sm cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold bg-nova-flare hover:bg-nova-flare/90 text-white transition-all shadow-[0_0_20px_rgba(255,46,99,0.35)] disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>{t("confirmDelete")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Escalation Modal */}
      {escalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{t("requestAdminAction")}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ESCALATION
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("forwardToAdminDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEscalateModal(null)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("targetEntityLabel")}
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-void-deep border border-void-border text-white text-sm font-semibold truncate">
                  {escalateModal.targetName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("recommendedAdminAction")}
                </label>
                <select
                  value={escalateAction}
                  onChange={(e) => setEscalateAction(e.target.value as "delete_survey" | "ban_user" | "delete_org" | "emergency_lock" | "investigate")}
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="delete_survey">{t("actionDeleteSurveyStrike")}</option>
                  <option value="ban_user">{t("actionPermanentBan")}</option>
                  <option value="delete_org">{t("actionSuspendOrgRevoke")}</option>
                  <option value="emergency_lock">{t("actionLockQuarantine")}</option>
                  <option value="investigate">{t("actionDeepInvestigate")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("statementReasonRequired")}
                </label>
                <textarea
                  rows={4}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  maxLength={2000}
                  disabled={isPending}
                  placeholder={t("escalateReasonPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-amber-400 focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setEscalateModal(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleEscalateSubmit}
                disabled={isPending || !escalateReason.trim()}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("escalating")}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>{t("transmitEscalation")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Admin Escalation Resolution Modal */}
      {resolveEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,229,255,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  resolveEscalateModal.decision === "approved"
                    ? "bg-nova-flare/15 border border-nova-flare/30 text-nova-flare"
                    : "bg-gray-700/20 border border-gray-600/40 text-gray-300"
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{resolveEscalateModal.decision === "approved" ? t("approveExecuteAction") : t("dismissEscalation")}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("targetPrefix", { type: resolveEscalateModal.escalation.target_name || resolveEscalateModal.escalation.target_id })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveEscalateModal(null)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-void-deep/80 border border-void-border text-xs space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("escalatedReason")}</p>
                <p className="text-gray-300 whitespace-pre-wrap">{resolveEscalateModal.escalation.reason}</p>
                <p className="text-amber-400 font-bold pt-1">
                  {t("actionCol", { action: resolveEscalateModal.escalation.recommended_action })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("adminResolutionNotesOptional")}
                </label>
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  maxLength={3000}
                  disabled={isPending}
                  placeholder={t("resolveNotesPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setResolveEscalateModal(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleResolveEscalateSubmit}
                disabled={isPending}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                  resolveEscalateModal.decision === "approved"
                    ? "bg-nova-flare hover:bg-nova-flare/90 text-white shadow-[0_0_20px_rgba(255,46,99,0.35)]"
                    : "bg-void-deep hover:bg-gray-800 text-gray-300 border border-void-border"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("resolving")}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm {resolveEscalateModal.decision === "approved" ? "Execution" : "Dismissal"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Support Ticket Reply Modal */}
      {ticketReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(0,229,255,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-void-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {t("replyToVolunteerTicket")}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                    {ticketReplyModal.ticket.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTicketReplyModal(null)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5 font-bold uppercase text-[10px]">{t("recipient")}</span>
                  <span className="text-white font-mono">{ticketReplyModal.ticket.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 font-bold uppercase text-[10px]">{t("reason")}</span>
                  <span className="text-plasma-cyan font-semibold">{ticketReplyModal.ticket.reason}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("ticketStatusAfterResponse")}
                </label>
                <select
                  value={ticketReplyStatus}
                  onChange={(e) => setTicketReplyStatus(e.target.value as "open" | "in_progress" | "resolved")}
                  disabled={isPending}
                  className="w-full px-3.5 py-2 rounded-xl bg-void-deep border border-void-border text-white text-xs focus:border-plasma-cyan focus:outline-none cursor-pointer"
                >
                  <option value="resolved">{t("markAsResolved")}</option>
                  <option value="in_progress">{t("keepInProgress")}</option>
                  <option value="open">{t("keepOpen")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("inAppNotificationMessage")}
                </label>
                <textarea
                  rows={4}
                  value={ticketReplyMessage}
                  onChange={(e) => setTicketReplyMessage(e.target.value)}
                  maxLength={3000}
                  disabled={isPending}
                  placeholder={t("ticketReplyPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-void-deep border border-void-border text-white text-sm focus:border-plasma-cyan focus:outline-none placeholder-gray-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-void-border mt-6">
              <button
                type="button"
                onClick={() => setTicketReplyModal(null)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-void-deep hover:bg-void-border text-gray-300 text-sm font-bold border border-void-border transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleTicketReplySubmit}
                disabled={isPending}
                className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("dispatched")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t("transmitResponse")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
