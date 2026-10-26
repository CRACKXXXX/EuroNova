"use client";

import React from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import {
  type GlobalCategoryItem,
  type GlobalThreadItem,
  type ForumTranslator,
} from "./ForumTypes";

interface ForumModalsProps {
  // Create Modal
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  selectedCategory: GlobalCategoryItem | null;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newContent: string;
  setNewContent: (val: string) => void;
  isSubmittingThread: boolean;
  onCreateThread: (e: React.FormEvent) => void;
  // Delete Modal
  isDeleteDialogOpen: boolean;
  onCloseDeleteDialog: () => void;
  activeThread: GlobalThreadItem | null;
  isDeletingThread: boolean;
  onConfirmDeleteThread: () => void;
  // Shared
  t: ForumTranslator;
}

export function ForumModals({
  isCreateModalOpen,
  onCloseCreateModal,
  selectedCategory,
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  isSubmittingThread,
  onCreateThread,
  isDeleteDialogOpen,
  onCloseDeleteDialog,
  activeThread,
  isDeletingThread,
  onConfirmDeleteThread,
  t,
}: ForumModalsProps) {
  return (
    <>
      {/* CREATE THREAD MODAL */}
      {isCreateModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void-deep/90 backdrop-blur-2xl p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(0,229,255,0.15)] animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div>
                <h3 className="text-base font-bold text-white">{t("createNewDiscussion")}</h3>
                <p className="text-xs text-plasma-cyan mt-0.5">
                  {t("categoryPrefix", { category: selectedCategory.name })}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseCreateModal}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                {t("close")}
              </button>
            </div>

            <form onSubmit={onCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  {t("topicTitle")}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  maxLength={150}
                  placeholder={t("newThreadTitlePlaceholder")}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  {t("detailedMessage")}
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={5}
                  required
                  maxLength={5000}
                  placeholder={t("newThreadContentPlaceholder")}
                  className="w-full bg-void-deep border border-void-border rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-plasma-cyan/5 border border-plasma-cyan/20 flex items-center gap-2.5 text-[11px] text-gray-400">
                <AlertCircle className="w-4 h-4 text-plasma-cyan shrink-0" />
                <span>{t("scanNotice")}</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  disabled={isSubmittingThread}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingThread}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-plasma-cyan text-void-deep hover:bg-plasma-cyan/90 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingThread ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("publishing")}</span>
                    </>
                  ) : (
                    <span>{t("publishTopic")}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE THREAD MODAL */}
      {isDeleteDialogOpen && activeThread && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void-deep/90 backdrop-blur-2xl p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-nova-flare/40 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-[0_0_50px_rgba(255,46,99,0.2)] animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center gap-3.5 pb-2">
              <div className="w-11 h-11 rounded-2xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,46,99,0.3)]">
                <Trash2 className="w-5 h-5 text-nova-flare" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">{t("deleteTopicTitle")}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  &ldquo;{activeThread.title}&rdquo;
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-nova-flare/10 border border-nova-flare/25 text-xs text-gray-300 leading-relaxed space-y-1">
              <p className="font-semibold text-white">{t("deleteTopicConfirm")}</p>
              <p className="text-[11px] text-gray-400">
                {t("deleteTopicDesc")}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCloseDeleteDialog}
                disabled={isDeletingThread}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={onConfirmDeleteThread}
                disabled={isDeletingThread}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-nova-flare hover:bg-nova-flare/90 text-white shadow-[0_0_20px_rgba(255,46,99,0.35)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingThread ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("deleting")}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("deletePermanently")}</span>
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
