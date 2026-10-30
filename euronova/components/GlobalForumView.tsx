"use client";

import React, { useState, useTransition, useRef } from "react";
import { 
  type GlobalCategoryItem, 
  type GlobalThreadItem, 
  type GlobalPostItem, 
  type UserEligibilityResponse,
  getCategoryThreads,
  getThreadDetails,
  createGlobalThreadAction,
  replyGlobalThreadAction,
  editGlobalThreadAction,
  deleteGlobalThreadAction,
  editGlobalPostAction,
  deleteGlobalPostAction,
  warnGlobalPostUser,
  muteGlobalPostUser,
  type MuteDuration,
  type ThreadsPaginationMetadata,
} from "@/actions/globalForum";
import { toast } from "sonner";
import { useLocale, useFormatter, useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { GLOBAL_CATEGORIES } from "@/lib/globalForum";
import { getTrustMultiplierDetails } from "@/lib/gamification";
import { ForumCategoryBar } from "./forum/ForumCategoryBar";
import { ForumThreadList } from "./forum/ForumThreadList";
import { ForumThreadDetail } from "./forum/ForumThreadDetail";
import { ForumModals } from "./forum/ForumModals";

interface GlobalForumViewProps {
  initialCategories: GlobalCategoryItem[];
  initialThreads?: GlobalThreadItem[];
  initialPagination?: ThreadsPaginationMetadata;
  userEligibility: UserEligibilityResponse;
}

export function GlobalForumView({
  initialCategories,
  initialThreads = [],
  initialPagination,
  userEligibility,
}: GlobalForumViewProps) {
  const t = useTranslations("GlobalForum");
  const tErrors = useTranslations("Errors");
  const locale = useLocale();
  const format = useFormatter();

  const formatRelativeTime = (dateString: string): string => {
    try {
      return format.relativeTime(new Date(dateString));
    } catch {
      return format.dateTime(new Date(dateString), { month: "short", day: "numeric" });
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<GlobalCategoryItem | null>(
    initialCategories[0] || null
  );
  const [threads, setThreads] = useState<GlobalThreadItem[]>(initialThreads);
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1);
  const [pagination, setPagination] = useState<ThreadsPaginationMetadata | null>(
    initialPagination || null
  );
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [activeThread, setActiveThread] = useState<GlobalThreadItem | null>(null);
  const [threadPosts, setThreadPosts] = useState<GlobalPostItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Thread Edit & Delete State
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [editThreadTitle, setEditThreadTitle] = useState("");
  const [editThreadContent, setEditThreadContent] = useState("");
  const [isSavingThread, setIsSavingThread] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Post Edit & Delete State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Post Moderation State (Mute & Warn by Thread Creator / Admin)
  const [mutingPostId, setMutingPostId] = useState<string | null>(null);
  const [warningPostId, setWarningPostId] = useState<string | null>(null);
  const [activePostMuteMenuId, setActivePostMuteMenuId] = useState<string | null>(null);

  // Modal / Form state for creating thread
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmittingThread, startThreadTransition] = useTransition();
  const inFlightThreadRef = useRef(false);

  // Reply state
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, startReplyTransition] = useTransition();
  const inFlightReplyRef = useRef(false);

  // Load threads for category with 50-item pagination
  const loadCategoryThreads = async (categoryId: string, pageToLoad: number) => {
    setIsLoadingThreads(true);
    try {
      const res = await getCategoryThreads(categoryId, pageToLoad, 50);
      if (res.success && res.data) {
        setThreads(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
          setCurrentPage(res.pagination.page);
        }
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        toast.error(res.error || t("failedLoadDiscussions"));
      }
    } catch {
      toast.error(t("networkErrorLoadingCategory"));
    } finally {
      setIsLoadingThreads(false);
    }
  };

  // Change category handler
  const handleSelectCategory = async (cat: GlobalCategoryItem) => {
    if (selectedCategory?.id === cat.id) return;
    setSelectedCategory(cat);
    setActiveThread(null);
    await loadCategoryThreads(cat.id, 1);
  };

  // Open thread detail view
  const handleSelectThread = async (thread: GlobalThreadItem) => {
    setActiveThread(thread);
    setIsEditingThread(false);
    setEditingPostId(null);
    setIsLoadingDetails(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    try {
      const res = await getThreadDetails(thread.id);
      if (res.success && res.data) {
        setActiveThread(res.data.thread);
        setThreadPosts(res.data.posts);
      } else {
        toast.error(res.error || t("failedLoadThreadDetails"));
      }
    } catch {
      toast.error(t("errorLoadingComments"));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Submit new thread
  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightThreadRef.current) return;
    if (!selectedCategory) return;

    if (!newTitle.trim() || !newContent.trim()) {
      toast.error(t("fillBothTitleContent"));
      return;
    }

    inFlightThreadRef.current = true;
    startThreadTransition(async () => {
      try {
        const res = await createGlobalThreadAction(
          selectedCategory.id,
          newTitle.trim(),
          newContent.trim()
        );

        if (!res.success) {
          if (res.errorCode === "RATE_LIMITED" || res.error === "RATE_LIMIT_EXCEEDED") {
            toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
          } else if (res.errorCode === "MODERATION_BLOCKED") {
            toast.error(t("automodShieldPrefix") + (res.error || t("threadBlockedAutomod")));
          } else if (res.errorCode === "LEVEL_TOO_LOW") {
            toast.error(res.error || t("level2RequiredCreate"));
          } else if (res.errorCode === "TRUST_SCORE_TOO_LOW") {
            toast.error(res.error || t("trustRequiredCreate"));
          } else if (res.errorCode === "USER_MUTED") {
            toast.error(t("muteRestrictionPrefix") + (res.error || t("mutedFromCreatingTopics")));
          } else {
            toast.error(res.error || t("publishFailed", { error: "" }));
          }
          return;
        }

        toast.success(t("topicPublishedSuccess"));
        setNewTitle("");
        setNewContent("");
        setIsCreateModalOpen(false);

        if (res.data) {
          setThreads((prev) => [res.data as GlobalThreadItem, ...prev]);
          handleSelectThread(res.data as GlobalThreadItem);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? t("publishFailed", { error: err.message }) : t("unexpectedPublishError"));
      } finally {
        inFlightThreadRef.current = false;
      }
    });
  };

  // Thread Edit handlers
  const handleStartEditThread = () => {
    if (!activeThread) return;
    setEditThreadTitle(activeThread.title);
    setEditThreadContent(activeThread.content);
    setIsEditingThread(true);
  };

  const handleCancelEditThread = () => {
    setIsEditingThread(false);
    setEditThreadTitle("");
    setEditThreadContent("");
  };

  const handleSaveEditThread = async () => {
    if (!activeThread) return;
    const trimmedTitle = editThreadTitle.trim();
    const trimmedContent = editThreadContent.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast.error(t("titleContentEmpty"));
      return;
    }

    setIsSavingThread(true);
    try {
      const res = await editGlobalThreadAction(activeThread.id, trimmedContent, trimmedTitle);
      if (!res.success) {
        if (res.errorCode === "MODERATION_BLOCKED") {
          toast.error(t("automodShieldPrefix") + (res.error || t("contentRejectedAutomod")));
        } else {
          toast.error(res.error || t("failedUpdateDiscussion"));
        }
        return;
      }

      if (res.data) {
        const updated = res.data;
        setActiveThread(updated);
        setThreads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setIsEditingThread(false);
        toast.success(t("topicUpdatedSuccess"));
      }
    } catch {
      toast.error(t("topicUpdateError"));
    } finally {
      setIsSavingThread(false);
    }
  };

  const handleConfirmDeleteThread = async () => {
    if (!activeThread) return;

    setIsDeletingThread(true);
    try {
      const res = await deleteGlobalThreadAction(activeThread.id);
      if (!res.success) {
        toast.error(res.error || t("failedDeleteTopic"));
        return;
      }

      setThreads((prev) => prev.filter((item) => item.id !== activeThread.id));
      setActiveThread(null);
      setIsDeleteDialogOpen(false);
      toast.success(t("topicRemovedSuccess"));
    } catch {
      toast.error(t("topicDeleteError"));
    } finally {
      setIsDeletingThread(false);
    }
  };

  // Post Edit & Delete handlers
  const handleStartEditPost = (post: GlobalPostItem) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content);
  };

  const handleCancelEditPost = () => {
    setEditingPostId(null);
    setEditPostContent("");
  };

  const handleSaveEditPost = async (postId: string) => {
    const trimmed = editPostContent.trim();
    if (!trimmed) {
      toast.error(t("replyContentEmpty"));
      return;
    }

    setIsSavingPost(true);
    try {
      const res = await editGlobalPostAction(postId, trimmed);
      if (!res.success) {
        if (res.errorCode === "MODERATION_BLOCKED") {
          toast.error(t("automodShieldPrefix") + (res.error || t("replyRejectedAutomod")));
        } else {
          toast.error(res.error || t("failedUpdateReply"));
        }
        return;
      }

      if (res.data) {
        const updated = res.data;
        setThreadPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
        setEditingPostId(null);
        setEditPostContent("");
        toast.success(t("replyUpdatedSuccess"));
      }
    } catch {
      toast.error(t("replyUpdateError"));
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async (postId: string, isSuspicious = false) => {
    setDeletingPostId(postId);
    try {
      const res = await deleteGlobalPostAction(postId, isSuspicious);
      if (!res.success) {
        toast.error(res.error || t("failedDeleteReply"));
        return;
      }

      setThreadPosts((prev) => prev.filter((p) => p.id !== postId));
      setActiveThread((prev) =>
        prev ? { ...prev, reply_count: Math.max(0, (prev.reply_count || 1) - 1) } : null
      );
      toast.success(isSuspicious ? t("replyQuarantinedSuccess") : t("replyDeletedSuccess"));
    } catch {
      toast.error(t("replyDeleteError"));
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleWarnPost = async (post: GlobalPostItem) => {
    if (!activeThread) return;
    setWarningPostId(post.id);
    try {
      const res = await warnGlobalPostUser(post.id, activeThread.id);
      if (!res.success) {
        toast.error(res.error || t("failedSendWarning"));
        return;
      }
      toast.success(t("warningIssued", { name: post.author_name }));
    } catch {
      toast.error(t("warningIssueError"));
    } finally {
      setWarningPostId(null);
    }
  };

  const handleMutePost = async (post: GlobalPostItem, duration: MuteDuration) => {
    if (!activeThread) return;
    setMutingPostId(post.id);
    setActivePostMuteMenuId(null);
    try {
      const res = await muteGlobalPostUser(post.id, duration, activeThread.id);
      if (!res.success) {
        toast.error(res.error || t("muteUserError"));
        return;
      }
      toast.success(t("userMuted", { name: post.author_name, duration }));
    } catch {
      toast.error(t("muteUserError"));
    } finally {
      setMutingPostId(null);
    }
  };

  // Submit reply
  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightReplyRef.current) return;
    if (!activeThread || !replyContent.trim()) return;

    inFlightReplyRef.current = true;
    startReplyTransition(async () => {
      try {
        const res = await replyGlobalThreadAction(activeThread.id, replyContent.trim());

        if (!res.success) {
          if (res.errorCode === "RATE_LIMITED" || res.error === "RATE_LIMIT_EXCEEDED") {
            toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
          } else if (res.errorCode === "MODERATION_BLOCKED") {
            toast.error(t("automodShieldPrefix") + (res.error || t("replyBlockedAutomod")));
          } else if (res.errorCode === "LEVEL_TOO_LOW") {
            toast.error(res.error || t("level2RequiredReply"));
          } else if (res.errorCode === "TRUST_SCORE_TOO_LOW") {
            toast.error(res.error || t("trustRequiredReply"));
          } else if (res.errorCode === "USER_MUTED") {
            toast.error(t("muteRestrictionPrefix") + (res.error || t("mutedFromCommenting")));
          } else {
            toast.error(res.error || t("failedPostComment"));
          }
          return;
        }

        toast.success(t("replyTransmittedSuccess"));
        setReplyContent("");
        if (res.data) {
          setThreadPosts((prev) => [...prev, res.data as GlobalPostItem]);
          setActiveThread((prev) =>
            prev ? { ...prev, reply_count: (prev.reply_count || 0) + 1 } : null
          );
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? `Reply Failed: ${err.message}`
            : "An unexpected error occurred while posting your reply."
        );
      } finally {
        inFlightReplyRef.current = false;
      }
    });
  };

  const categoriesList: GlobalCategoryItem[] = (() => {
    const list = [...initialCategories];
    for (const def of GLOBAL_CATEGORIES) {
      if (!list.some((c) => c.slug === def.id || c.id === def.id)) {
        list.push({
          id: def.id,
          slug: def.id,
          name: def.title,
          description: def.description,
          icon: def.icon,
          display_order: list.length + 1,
          thread_count: 0,
        });
      }
    }
    return list;
  })();

  const userTrustScore = userEligibility.trustScore ?? 30;
  const multDetails = getTrustMultiplierDetails(userTrustScore);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {/* Global Forum Community Trust Multiplier Banner */}
      {userEligibility.isAuthenticated && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-void-surface via-void-surface/90 to-void-deep border border-void-border backdrop-blur-xl shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-void-deep border border-void-border flex items-center justify-center shrink-0 shadow-inner">
              <Zap className="w-4 h-4 text-plasma-cyan" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>{t("forumXpRewardNotice")}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                {t("forumXpRewardSubtitle")}
              </p>
            </div>
          </div>

          <div
            data-testid="forum-trust-xp-multiplier-badge"
            data-multiplier={multDetails.multiplier}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black shrink-0 self-start sm:self-auto ${multDetails.badgeClass}`}
          >
            <span>{t(multDetails.translationKey)}</span>
          </div>
        </div>
      )}

      {/* Categories Bar */}
      <ForumCategoryBar
        categoriesList={categoriesList}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* Main Forum Content Area: List or Detail */}
      {activeThread ? (
        <ForumThreadDetail
          activeThread={activeThread}
          selectedCategory={selectedCategory}
          threadPosts={threadPosts}
          isLoadingDetails={isLoadingDetails}
          userEligibility={userEligibility}
          locale={locale}
          t={t}
          formatRelativeTime={formatRelativeTime}
          onBack={() => setActiveThread(null)}
          onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
          isEditingThread={isEditingThread}
          editThreadTitle={editThreadTitle}
          setEditThreadTitle={setEditThreadTitle}
          editThreadContent={editThreadContent}
          setEditThreadContent={setEditThreadContent}
          isSavingThread={isSavingThread}
          isDeletingThread={isDeletingThread}
          onStartEditThread={handleStartEditThread}
          onCancelEditThread={handleCancelEditThread}
          onSaveEditThread={handleSaveEditThread}
          editingPostId={editingPostId}
          editPostContent={editPostContent}
          setEditPostContent={setEditPostContent}
          isSavingPost={isSavingPost}
          deletingPostId={deletingPostId}
          warningPostId={warningPostId}
          mutingPostId={mutingPostId}
          activePostMuteMenuId={activePostMuteMenuId}
          setActivePostMuteMenuId={setActivePostMuteMenuId}
          onStartEditPost={handleStartEditPost}
          onCancelEditPost={handleCancelEditPost}
          onSaveEditPost={handleSaveEditPost}
          onDeletePost={handleDeletePost}
          onWarnPost={handleWarnPost}
          onMutePost={handleMutePost}
          replyContent={replyContent}
          setReplyContent={setReplyContent}
          isSubmittingReply={isSubmittingReply}
          onSubmitReply={handlePostReply}
        />
      ) : (
        <ForumThreadList
          selectedCategory={selectedCategory}
          threads={threads}
          pagination={pagination}
          currentPage={currentPage}
          isLoadingThreads={isLoadingThreads}
          userEligibility={userEligibility}
          locale={locale}
          t={t}
          formatRelativeTime={formatRelativeTime}
          onSelectThread={handleSelectThread}
          onPageChange={(page) => selectedCategory && loadCategoryThreads(selectedCategory.id, page)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      )}

      {/* CREATE & DELETE THREAD MODALS */}
      <ForumModals
        isCreateModalOpen={isCreateModalOpen}
        onCloseCreateModal={() => setIsCreateModalOpen(false)}
        selectedCategory={selectedCategory}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newContent={newContent}
        setNewContent={setNewContent}
        isSubmittingThread={isSubmittingThread}
        onCreateThread={handleCreateThread}
        isDeleteDialogOpen={isDeleteDialogOpen}
        onCloseDeleteDialog={() => setIsDeleteDialogOpen(false)}
        activeThread={activeThread}
        isDeletingThread={isDeletingThread}
        onConfirmDeleteThread={handleConfirmDeleteThread}
        t={t}
      />
    </div>
  );
}
