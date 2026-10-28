"use client";

import React from "react";
import Link from "next/link";
import {
  Lock,
  PlusCircle,
  Pin,
  Eye,
  MessageCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  type GlobalCategoryItem,
  type GlobalThreadItem,
  type ThreadsPaginationMetadata,
  type UserEligibilityResponse,
  type ForumTranslator,
} from "./ForumTypes";

interface ForumThreadListProps {
  selectedCategory: GlobalCategoryItem | null;
  threads: GlobalThreadItem[];
  pagination: ThreadsPaginationMetadata | null;
  currentPage: number;
  isLoadingThreads: boolean;
  userEligibility: UserEligibilityResponse;
  locale: string;
  t: ForumTranslator;
  formatRelativeTime: (dateString: string) => string;
  onSelectThread: (thread: GlobalThreadItem) => void;
  onPageChange: (page: number) => void;
  onOpenCreateModal: () => void;
}

export function ForumThreadList({
  selectedCategory,
  threads,
  pagination,
  currentPage,
  isLoadingThreads,
  userEligibility,
  locale,
  t,
  formatRelativeTime,
  onSelectThread,
  onPageChange,
  onOpenCreateModal,
}: ForumThreadListProps) {
  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-void-surface/60 border border-void-border/80 rounded-2xl p-5 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>{selectedCategory?.name || t("globalForumTitle")}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {selectedCategory?.description}
          </p>
        </div>

        {/* Create Topic Button */}
        {!userEligibility.isAuthenticated ? (
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-void-surface border border-void-border text-gray-300 hover:text-white hover:border-plasma-cyan text-xs font-bold transition-all shrink-0"
          >
            <Lock className="w-3.5 h-3.5 text-plasma-cyan" />
            <span>{t("signInToPost")}</span>
          </Link>
        ) : !userEligibility.canPost ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-void-deep border border-nova-flare/40 text-gray-400 text-xs font-semibold shrink-0 cursor-not-allowed">
            <Lock className="w-3.5 h-3.5 text-nova-flare" />
            <span>
              {userEligibility.level < 2
                ? t("lockedLevel2Required")
                : t("lockedTrustRequired")}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-plasma-cyan text-void-deep text-xs font-bold hover:bg-plasma-cyan/90 transition-all shrink-0 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.3)]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t("startDiscussion")}</span>
          </button>
        )}
      </div>

      {/* Threads List */}
      {isLoadingThreads ? (
        <div className="p-12 text-center bg-void-surface/30 border border-void-border rounded-2xl">
          <Loader2 className="w-7 h-7 animate-spin text-plasma-cyan mx-auto mb-3" />
          <p className="text-xs text-gray-400 font-medium">
            {t("loadingTopics", { category: selectedCategory?.name || "" })}
          </p>
        </div>
      ) : threads.length === 0 ? (
        <div className="p-12 text-center bg-void-surface/30 border border-void-border rounded-3xl space-y-3">
          <MessageSquare className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">{t("noDiscussionsYet")}</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
            {t("noDiscussionsDesc")}
          </p>
          {userEligibility.canPost && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-plasma-cyan text-void-deep text-xs font-bold hover:bg-plasma-cyan/90 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t("startFirstDiscussion")}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              className="p-5 rounded-2xl bg-void-surface/70 border border-void-border/80 hover:border-plasma-cyan/50 hover:bg-void-surface/90 transition-all duration-200 cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {thread.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30">
                      <Pin className="w-3 h-3" /> <span>{t("pinned")}</span>
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-plasma-cyan transition-colors line-clamp-1">
                    {thread.title}
                  </h3>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {thread.content}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                  <span className="text-gray-300 font-medium">{thread.author_name}</span>
                  <span>&bull;</span>
                  <span>Last active {formatRelativeTime(thread.last_activity_at)}</span>
                </div>
              </div>

              {/* Thread Stats */}
              <div className="flex items-center gap-5 sm:gap-6 shrink-0 text-xs text-gray-400 font-mono">
                <div className="flex items-center gap-1.5" title={t("views")}>
                  <Eye className="w-3.5 h-3.5 text-gray-500" />
                  <span>{thread.views}</span>
                </div>
                <div className="flex items-center gap-1.5 text-plasma-cyan" title={t("replies")}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="font-bold">{thread.reply_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 50-Item Pagination Controls for Topics */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-void-border/60">
          <div className="text-xs text-gray-400 font-mono">
            {t("paginationPage", {
              page: pagination.page,
              totalPages: pagination.totalPages,
            })} ({pagination.totalCount} topics)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pagination.hasPrevPage || isLoadingThreads}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3.5 py-1.5 rounded-xl border border-void-border bg-void-surface text-xs font-semibold text-gray-300 hover:text-white hover:border-plasma-cyan/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {t("previous")}
            </button>
            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoadingThreads}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3.5 py-1.5 rounded-xl border border-void-border bg-void-surface text-xs font-semibold text-gray-300 hover:text-white hover:border-plasma-cyan/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
