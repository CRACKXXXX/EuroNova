"use client";

import React from "react";
import Link from "next/link";
import { ReportUserButton } from "@/components/ReportUserButton";
import { MUTE_DURATION_OPTIONS } from "@/lib/moderationShield";
import { type MuteDuration } from "@/actions/globalForum";
import {
  ArrowLeft,
  Pin,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  Eye,
  MessageCircle,
  MessageSquare,
  AlertCircle,
  VolumeX,
  ChevronDown,
  Lock,
  ShieldCheck,
  Compass,
  UserCheck,
  Send,
  Zap,
} from "lucide-react";
import { calculateTrustMultiplierXp } from "@/lib/gamification";
import {
  type GlobalCategoryItem,
  type GlobalThreadItem,
  type GlobalPostItem,
  type UserEligibilityResponse,
  type ForumTranslator,
} from "./ForumTypes";

interface ForumThreadDetailProps {
  activeThread: GlobalThreadItem;
  selectedCategory: GlobalCategoryItem | null;
  threadPosts: GlobalPostItem[];
  isLoadingDetails: boolean;
  userEligibility: UserEligibilityResponse;
  locale: string;
  t: ForumTranslator;
  formatRelativeTime: (dateString: string) => string;
  onBack: () => void;
  onOpenDeleteDialog: () => void;
  // Thread Edit
  isEditingThread: boolean;
  editThreadTitle: string;
  setEditThreadTitle: (val: string) => void;
  editThreadContent: string;
  setEditThreadContent: (val: string) => void;
  isSavingThread: boolean;
  isDeletingThread: boolean;
  onStartEditThread: () => void;
  onCancelEditThread: () => void;
  onSaveEditThread: () => void;
  // Post Edit & Moderation
  editingPostId: string | null;
  editPostContent: string;
  setEditPostContent: (val: string) => void;
  isSavingPost: boolean;
  deletingPostId: string | null;
  warningPostId: string | null;
  mutingPostId: string | null;
  activePostMuteMenuId: string | null;
  setActivePostMuteMenuId: (id: string | null) => void;
  onStartEditPost: (post: GlobalPostItem) => void;
  onCancelEditPost: () => void;
  onSaveEditPost: (postId: string) => void;
  onDeletePost: (postId: string, isSuspicious?: boolean) => void;
  onWarnPost: (post: GlobalPostItem) => void;
  onMutePost: (post: GlobalPostItem, duration: MuteDuration) => void;
  // Reply Form
  replyContent: string;
  setReplyContent: (val: string) => void;
  isSubmittingReply: boolean;
  onSubmitReply: (e: React.FormEvent) => void;
}

export function ForumThreadDetail({
  activeThread,
  selectedCategory,
  threadPosts,
  isLoadingDetails,
  userEligibility,
  locale,
  t,
  formatRelativeTime,
  onBack,
  onOpenDeleteDialog,
  isEditingThread,
  editThreadTitle,
  setEditThreadTitle,
  editThreadContent,
  setEditThreadContent,
  isSavingThread,
  isDeletingThread,
  onStartEditThread,
  onCancelEditThread,
  onSaveEditThread,
  editingPostId,
  editPostContent,
  setEditPostContent,
  isSavingPost,
  deletingPostId,
  warningPostId,
  mutingPostId,
  activePostMuteMenuId,
  setActivePostMuteMenuId,
  onStartEditPost,
  onCancelEditPost,
  onSaveEditPost,
  onDeletePost,
  onWarnPost,
  onMutePost,
  replyContent,
  setReplyContent,
  isSubmittingReply,
  onSubmitReply,
}: ForumThreadDetailProps) {
  const currentUserId = userEligibility?.userId;
  const isAdmin = userEligibility?.role === "admin" || userEligibility?.userRole === "admin";
  const isModerator = userEligibility?.userRole === "moderator";
  const canModerate = isAdmin || isModerator;

  const canEditActiveThread = Boolean(currentUserId && activeThread && currentUserId === activeThread.user_id);
  const canDeleteActiveThread = Boolean(
    currentUserId && activeThread && (currentUserId === activeThread.user_id || isAdmin)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-void-border bg-void-surface text-gray-300 hover:text-white hover:border-plasma-cyan/50 text-xs font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {selectedCategory?.name || "Discussions"}</span>
        </button>

        <ReportUserButton
          targetUserId={activeThread.user_id}
          targetUserName={activeThread.author_name}
          variant="full"
          className="border border-void-border bg-void-surface/60 px-3 py-1.5 rounded-xl"
        />
      </div>

      {/* Original Post */}
      <div className="bg-void-surface/90 border border-void-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan font-bold text-base shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              {activeThread.author_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {activeThread.author_name}
                </span>
                {/* 4-Tier Staff & Role Badges */}
                {activeThread.author_user_role === "admin" && (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-plasma-cyan/20 to-hyper-violet/30 text-plasma-cyan border border-plasma-cyan/60 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_12px_rgba(0,229,255,0.35)]">
                    <span>🛡️</span>
                    <span>EURO-NOVA ADMIN</span>
                  </span>
                )}
                {activeThread.author_user_role === "moderator" && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                    <span>⚔️</span>
                    <span>MODERATOR</span>
                  </span>
                )}
                {activeThread.author_user_role === "support" && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(0,230,118,0.2)]">
                    <span>🎧</span>
                    <span>SUPPORT</span>
                  </span>
                )}
                {activeThread.author_role === "coordinator" && activeThread.author_user_role !== "admin" && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/30">
                    NGO Coordinator
                  </span>
                )}
                {activeThread.author_role === "volunteer" && !activeThread.author_user_role && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                    Verified Volunteer
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("postedAgo", { time: formatRelativeTime(activeThread.created_at) })}
              </p>
            </div>
          </div>

          {/* Action Buttons: Edit, Delete, Pin */}
          <div className="flex items-center gap-2">
            {activeThread.is_pinned && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan text-xs font-bold">
                <Pin className="w-3 h-3" />
                <span>{t("pinned")}</span>
              </div>
            )}

            {canEditActiveThread && !isEditingThread && (
              <button
                type="button"
                onClick={onStartEditThread}
                disabled={isDeletingThread}
                title={t("editTopic")}
                aria-label={t("editTopic")}
                className="p-1.5 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-plasma-cyan/10 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            {canDeleteActiveThread && (
              <button
                type="button"
                onClick={onOpenDeleteDialog}
                disabled={isDeletingThread}
                title={t("deleteTopic")}
                aria-label={t("deleteTopic")}
                className="p-1.5 rounded-lg text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 transition-colors cursor-pointer"
              >
                {isDeletingThread ? (
                  <Loader2 className="w-4 h-4 animate-spin text-nova-flare" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Thread Body or Inline Edit Mode */}
        {isEditingThread ? (
          <div className="space-y-4 pt-2 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                {t("topicTitle")}
              </label>
              <input
                type="text"
                value={editThreadTitle}
                onChange={(e) => setEditThreadTitle(e.target.value)}
                maxLength={150}
                disabled={isSavingThread}
                className="w-full bg-void-deep border border-plasma-cyan/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-plasma-cyan"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                {t("topicContent")}
              </label>
              <textarea
                rows={5}
                value={editThreadContent}
                onChange={(e) => setEditThreadContent(e.target.value)}
                maxLength={5000}
                disabled={isSavingThread}
                className="w-full bg-void-deep border border-plasma-cyan/60 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-plasma-cyan resize-none leading-relaxed"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCancelEditThread}
                disabled={isSavingThread}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-void-border text-gray-400 hover:text-white text-xs transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t("cancel")}</span>
              </button>
              <button
                type="button"
                onClick={onSaveEditThread}
                disabled={isSavingThread}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.25)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingThread ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{t("saveChanges")}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeThread.title}
            </h1>
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {activeThread.content}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-void-border/60 flex items-center gap-6 text-xs text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            {activeThread.views} {t("views")}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
            {activeThread.reply_count} {t("replies")}
          </span>
        </div>
      </div>

      {/* Replies Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 pl-1">
          {t("discussionCount", { count: threadPosts.length })}
        </h3>

        {isLoadingDetails ? (
          <div className="p-8 text-center bg-void-surface/40 border border-void-border rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-plasma-cyan mx-auto mb-2" />
            <p className="text-xs text-gray-400">{t("loadingReplies")}</p>
          </div>
        ) : threadPosts.length === 0 ? (
          <div className="p-8 text-center bg-void-surface/40 border border-void-border rounded-2xl">
            <MessageSquare className="w-7 h-7 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-300">{t("noReplies")}</p>
            <p className="text-xs text-gray-500 mt-1">{t("firstToContribute")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threadPosts.map((post) => {
              const isAuthorOfPost = Boolean(currentUserId && currentUserId === post.user_id);
              const isThreadCreator = Boolean(currentUserId && activeThread && currentUserId === activeThread.user_id);
              const canModeratePost = (isThreadCreator || canModerate) && !isAuthorOfPost;
              const canEditPost = isAuthorOfPost;
              const canDeletePost = isAuthorOfPost || canModerate || isThreadCreator;
              const isEditingThisPost = editingPostId === post.id;

              return (
                <div
                  key={post.id}
                  className="p-5 rounded-2xl bg-void-surface/70 border border-void-border hover:border-void-border/90 transition-all flex flex-col gap-3 group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-void-deep border border-void-border flex items-center justify-center text-xs font-bold text-gray-300">
                        {post.author_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {post.author_name}
                          </span>
                          {/* 4-Tier Staff & Role Badges */}
                          {post.author_user_role === "admin" && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-plasma-cyan/20 to-hyper-violet/30 text-plasma-cyan border border-plasma-cyan/60 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                              <span>🛡️</span>
                              <span>EURO-NOVA ADMIN</span>
                            </span>
                          )}
                          {post.author_user_role === "moderator" && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                              <span>⚔️</span>
                              <span>MODERATOR</span>
                            </span>
                          )}
                          {post.author_user_role === "support" && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_8px_rgba(0,230,118,0.2)]">
                              <span>🎧</span>
                              <span>SUPPORT</span>
                            </span>
                          )}
                          {post.author_role === "coordinator" && post.author_user_role !== "admin" && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/30">
                              {t("coordinator")}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatRelativeTime(post.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions for Post */}
                    <div className="flex items-center gap-1">
                      {canEditPost && !isEditingThisPost && (
                        <button
                          type="button"
                          onClick={() => onStartEditPost(post)}
                          disabled={isSavingPost || deletingPostId === post.id}
                          title={t("editReply")}
                          aria-label={t("editReply")}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-plasma-cyan/10 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Thread Creator / Admin Power: Warn User */}
                      {canModeratePost && (
                        <button
                          type="button"
                          onClick={() => onWarnPost(post)}
                          disabled={warningPostId === post.id}
                          title={t("warnUserTitle")}
                          aria-label={t("warnUser")}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {warningPostId === post.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Thread Creator / Admin Power: Mute User Dropdown */}
                      {canModeratePost && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActivePostMuteMenuId(activePostMuteMenuId === post.id ? null : post.id)
                            }
                            disabled={mutingPostId === post.id}
                            title={t("muteUserTitle")}
                            aria-label={t("muteUser")}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 transition-colors cursor-pointer flex items-center gap-0.5 disabled:opacity-50"
                          >
                            {mutingPostId === post.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-nova-flare" />
                            ) : (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <ChevronDown className="w-2.5 h-2.5" />
                              </>
                            )}
                          </button>

                          {activePostMuteMenuId === post.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-void-surface border border-nova-flare/40 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95">
                              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-void-border/60">
                                {t("muteTimeOut")}
                              </div>
                              {MUTE_DURATION_OPTIONS.map((opt) => (
                                <button
                                  key={opt.minutes}
                                  type="button"
                                  onClick={() => onMutePost(post, opt.minutes)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-200 hover:bg-nova-flare/20 hover:text-white transition-colors cursor-pointer flex items-center justify-between"
                                >
                                  <span>{opt.label}</span>
                                  <span className="text-[10px] font-mono text-nova-flare">
                                    {opt.minutes}m
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {canDeletePost && (
                        <button
                          type="button"
                          onClick={() => onDeletePost(post.id, !isAuthorOfPost)}
                          disabled={deletingPostId === post.id}
                          title={!isAuthorOfPost ? t("deleteSuspiciousReply") : t("deleteReply")}
                          aria-label={t("deleteReply")}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 transition-colors cursor-pointer"
                        >
                          {deletingPostId === post.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-nova-flare" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      <ReportUserButton
                        targetUserId={post.user_id}
                        targetUserName={post.author_name}
                        variant="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>

                  {isEditingThisPost ? (
                    <div className="space-y-2.5 pl-11 pt-1 animate-in fade-in duration-200">
                      <textarea
                        rows={3}
                        value={editPostContent}
                        onChange={(e) => setEditPostContent(e.target.value)}
                        maxLength={3000}
                        disabled={isSavingPost}
                        className="w-full bg-void-surface border border-plasma-cyan/70 focus:border-plasma-cyan rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-plasma-cyan resize-none transition-all"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={onCancelEditPost}
                          disabled={isSavingPost}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-void-border text-gray-400 hover:text-white text-xs transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>{t("cancel")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSaveEditPost(post.id)}
                          disabled={isSavingPost}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plasma-cyan text-void-deep font-bold text-xs hover:brightness-110 shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isSavingPost ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{t("saveChanges")}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap pl-11">
                      {post.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Form or Level 5 Locked Banner */}
      <div className="pt-2">
        {!userEligibility.isAuthenticated ? (
          <div className="bg-void-surface/80 border border-void-border rounded-2xl p-6 text-center space-y-3">
            <Lock className="w-6 h-6 text-plasma-cyan mx-auto" />
            <h4 className="text-sm font-bold text-white">{t("signInToJoin")}</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {t("signInToJoinDesc")}
            </p>
            <div>
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep text-xs font-bold hover:bg-plasma-cyan/90 transition-all shadow-[0_0_15px_rgba(0,229,255,0.25)]"
              >
                <span>{t("signInBtn")}</span>
              </Link>
            </div>
          </div>
        ) : !userEligibility.canPost ? (
          userEligibility.level < 2 ? (
            /* GATED BANNER FOR LEVEL < 2 (100 XP Required) */
            <div className="bg-gradient-to-r from-void-surface via-void-deep to-void-surface border border-hyper-violet/40 rounded-2xl p-6 relative overflow-hidden space-y-4 shadow-[0_0_25px_rgba(99,102,241,0.12)]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-hyper-violet" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{t("reachLevel5")}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30">
                      {t("antiSpamShield")}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t("antiSpamShieldDesc")}
                  </p>

                  {/* Level 2 Progress Track (0-100 XP) */}
                  <div className="space-y-1.5 pt-2 max-w-md">
                    <div className="flex justify-between text-[10px] font-mono text-gray-400">
                      <span>{userEligibility.xp} XP (Lv.{userEligibility.level})</span>
                      <span>{t("goalXpNeeded", { needed: userEligibility.xpNeeded })}</span>
                    </div>
                    <div className="h-2 w-full bg-void-deep rounded-full overflow-hidden border border-void-border">
                      <div
                        className="h-full bg-gradient-to-r from-plasma-cyan to-hyper-violet transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(5, (userEligibility.xp / 100) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-void-border/40 flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
                <span className="font-semibold text-gray-300">{t("quickXpWays")}</span>
                <span className="flex items-center gap-1 text-rup-emerald">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t("completeProfileXp")}
                </span>
                <span className="flex items-center gap-1 text-plasma-cyan">
                  <Compass className="w-3.5 h-3.5" /> {t("applyMissionXp")}
                </span>
                <span className="flex items-center gap-1 text-hyper-violet">
                  <UserCheck className="w-3.5 h-3.5" /> {t("reviewNgoXp")}
                </span>
              </div>
            </div>
          ) : (
            /* GATED BANNER FOR RESTRICTED TRUST (trust_score < 30) OR MUTED USERS */
            <div className="bg-gradient-to-r from-void-surface via-void-deep to-void-surface border border-nova-flare/40 rounded-2xl p-6 relative overflow-hidden space-y-4 shadow-[0_0_25px_rgba(255,46,99,0.12)]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-nova-flare" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{t("trustRestrictedBannerTitle")}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30">
                      {t("antiSpamShield")}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t("trustRestrictedBannerDesc", {
                      score: userEligibility.trustScore ?? 30,
                    })}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-void-border/40 flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
                <span className="font-semibold text-gray-300">{t("quickXpWays")}</span>
                <span className="flex items-center gap-1 text-rup-emerald">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t("completeProfileXp")}
                </span>
                <span className="flex items-center gap-1 text-plasma-cyan">
                  <Compass className="w-3.5 h-3.5" /> {t("applyMissionXp")}
                </span>
                <span className="flex items-center gap-1 text-hyper-violet">
                  <UserCheck className="w-3.5 h-3.5" /> {t("reviewNgoXp")}
                </span>
              </div>
            </div>
          )
        ) : (
          /* ACTIVE REPLY FORM */
          <form onSubmit={onSubmitReply} className="space-y-3">
            <div className="relative">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
                required
                maxLength={3000}
                placeholder={t("replyPlaceholder")}
                className="w-full bg-void-surface border border-void-border rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-colors resize-none leading-relaxed"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-plasma-cyan" />
                  <span>{t("protectedByAutomod")}</span>
                </span>
                <span className="hidden sm:inline text-void-border">•</span>
                <span className="text-plasma-cyan font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-plasma-cyan" />
                  <span>{t("replyBonusPrefix")} +{calculateTrustMultiplierXp(30, userEligibility.trustScore ?? 30)} XP</span>
                </span>
              </div>
              <button
                type="submit"
                disabled={isSubmittingReply || !replyContent.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep text-xs font-bold hover:bg-plasma-cyan/90 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50"
              >
                {isSubmittingReply ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("transmitting")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("postReply")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
