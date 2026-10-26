"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import {
  MessageSquare,
  Send,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Building,
  User,
  Sparkles,
  Loader2,
  Lock,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  Check,
  X,
  Reply,
  VolumeX,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import Image from "next/image";
import {
  getProjectMessages,
  postProjectMessage,
  editProjectMessage,
  deleteProjectMessage,
  warnProjectForumUser,
  muteProjectForumUser,
  getProjectForumEligibility,
  type ForumMessageItem,
  type ProjectForumEligibility,
  type MuteDuration,
  type ForumPaginationMetadata,
} from "@/actions/forum";
import { MUTE_DURATION_OPTIONS } from "@/lib/moderationConstants";

interface ProjectForumProps {
  projectId: string;
  projectTitle: string;
}

export function ProjectForum({ projectId, projectTitle }: ProjectForumProps) {
  const t = useTranslations("ProjectForum");
  const format = useFormatter();

  const formatRelativeTime = (dateString: string): string => {
    try {
      return format.relativeTime(new Date(dateString));
    } catch {
      return format.dateTime(new Date(dateString), {
        month: "short",
        day: "numeric",
      });
    }
  };

  const [messages, setMessages] = useState<ForumMessageItem[]>([]);
  const [eligibility, setEligibility] = useState<ProjectForumEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<ForumPaginationMetadata | null>(null);

  // Edit & Delete state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Nested Replies state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  // Moderation state: Mute & Warn
  const [activeMuteMenuId, setActiveMuteMenuId] = useState<string | null>(null);
  const [mutingId, setMutingId] = useState<string | null>(null);
  const [warningId, setWarningId] = useState<string | null>(null);

  const loadMessagesPage = async (pageToLoad: number) => {
    setIsLoading(true);
    try {
      const msgRes = await getProjectMessages(projectId, pageToLoad, 50);
      if (msgRes.success) {
        setMessages(msgRes.messages);
        if (msgRes.pagination) {
          setPagination(msgRes.pagination);
          setCurrentPage(msgRes.pagination.page);
        }
      } else {
        toast.error(msgRes.error || "Could not load forum messages.");
      }
    } catch (err: unknown) {
      console.error("Error loading forum page:", err);
      toast.error(err instanceof Error ? err.message : "Could not load forum page.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load real messages and user eligibility on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [msgRes, eligRes] = await Promise.all([
          getProjectMessages(projectId, 1, 50),
          getProjectForumEligibility(projectId),
        ]);

        if (isMounted) {
          if (msgRes.success) {
            setMessages(msgRes.messages);
            if (msgRes.pagination) {
              setPagination(msgRes.pagination);
              setCurrentPage(msgRes.pagination.page);
            }
          }
          setEligibility(eligRes);
        }
      } catch (err: unknown) {
        console.error("Error loading forum data:", err);
        if (isMounted) {
          toast.error(err instanceof Error ? err.message : "Error loading forum data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const isGated = eligibility !== null && !eligibility.canPost;
  const canReplyToQuestions = Boolean(eligibility?.canReply);
  const isCoordinatorOrAdmin = Boolean(
    eligibility?.isProjectCoordinator ||
      eligibility?.role === "admin" ||
      eligibility?.userRole === "root" ||
      eligibility?.userRole === "admin" ||
      eligibility?.userRole === "moderator"
  );

  // Separate root messages from 1-level deep nested replies
  const { rootMessages, repliesByParent } = useMemo(() => {
    const roots: ForumMessageItem[] = [];
    const repliesMap = new Map<string, ForumMessageItem[]>();

    for (const msg of messages) {
      if (msg.parent_id) {
        const list = repliesMap.get(msg.parent_id) || [];
        list.push(msg);
        repliesMap.set(msg.parent_id, list);
      } else {
        roots.push(msg);
      }
    }

    return { rootMessages: roots, repliesByParent: repliesMap };
  }, [messages]);

  const handlePostMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);

    if (isGated) {
      const gateMsg =
        eligibility?.reason ||
        "Reach Level 2 (100 XP) to participate in project Q&A to prevent spam.";
      toast.error(gateMsg);
      return;
    }

    const trimmed = newContent.trim();
    if (!trimmed) {
      const emptyErr = t("emptyMessage");
      setModerationError(emptyErr);
      toast.error(emptyErr);
      return;
    }

    startTransition(async () => {
      try {
        const res = await postProjectMessage(projectId, trimmed);

        if (!res.success) {
          const errorMsg =
            res.error ||
            "Transmission Blocked: Message violated auto-moderation rules.";
          setModerationError(errorMsg);
          toast.error(errorMsg);
          return;
        }

        if (res.message) {
          setMessages((prev) => [...prev, res.message!]);
          setNewContent("");
          const successMsg = t("postSuccess");
          toast.success(successMsg);
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? `Transmission Failed: ${err.message}`
            : "An unexpected error occurred while transmitting your message.";
        setModerationError(errorMsg);
        toast.error(errorMsg);
      }
    });
  };

  const handleSendReply = async (parentId: string) => {
    if (eligibility && !eligibility.canReply) {
      toast.error(t("replyRestrictedError"));
      return;
    }

    if (isGated) {
      toast.error(
        eligibility?.reason ||
          "Reach Level 2 (100 XP) to participate in project Q&A to prevent spam."
      );
      return;
    }

    const trimmed = replyContent.trim();
    if (!trimmed) {
      toast.error(t("emptyReplyError"));
      return;
    }

    setIsReplying(true);
    try {
      const res = await postProjectMessage(projectId, trimmed, undefined, parentId);

      if (!res.success) {
        toast.error(res.error || "Could not transmit reply.");
        return;
      }

      if (res.message) {
        setMessages((prev) => [...prev, res.message!]);
        setReplyingToId(null);
        setReplyContent("");
        toast.success(t("replySuccess"));
      }
    } catch (err) {
      console.error("Error posting nested reply:", err);
      toast.error(t("replyPostError"));
    } finally {
      setIsReplying(false);
    }
  };

  const handleStartEdit = (msg: ForumMessageItem) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (messageId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      toast.error(t("emptyMessageError"));
      return;
    }

    setIsEditing(true);
    try {
      const res = await editProjectMessage(messageId, trimmed);
      if (!res.success) {
        toast.error(res.error || "Message could not be updated.");
        return;
      }

      if (res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? res.message! : m))
        );
        setEditingId(null);
        setEditContent("");
        toast.success(t("editSuccess"));
      }
    } catch (err) {
      console.error("Error editing message:", err);
      toast.error(t("editMessageError"));
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (messageId: string, isSuspicious = false) => {
    setDeletingId(messageId);
    try {
      const res = await deleteProjectMessage(messageId, isSuspicious);
      if (!res.success) {
        toast.error(res.error || "Failed to delete message.");
        return;
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId && m.parent_id !== messageId));
      toast.success(t("deleteSuccess"));
    } catch (err) {
      console.error("Error deleting message:", err);
      toast.error(t("deleteMessageError"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleWarn = async (msg: ForumMessageItem) => {
    setWarningId(msg.id);
    try {
      const res = await warnProjectForumUser(msg.id, projectId);
      if (!res.success) {
        toast.error(res.error || "Failed to issue warning.");
        return;
      }
      toast.success(t("warningIssuedSuccess", { name: msg.author_name }));
    } catch (err) {
      console.error("Error warning user:", err);
      toast.error(t("warningSendError"));
    } finally {
      setWarningId(null);
    }
  };

  const handleMute = async (msg: ForumMessageItem, durationMinutes: MuteDuration) => {
    setMutingId(msg.id);
    setActiveMuteMenuId(null);
    try {
      const res = await muteProjectForumUser(msg.id, durationMinutes, projectId);
      if (!res.success) {
        toast.error(res.error || "Failed to mute user.");
        return;
      }
      toast.success(t("userMutedSuccess", { name: msg.author_name, mins: durationMinutes }));
    } catch (err) {
      console.error("Error muting user:", err);
      toast.error(t("muteUserError"));
    } finally {
      setMutingId(null);
    }
  };

  // Render a single message card (works for root messages and nested replies)
  const renderMessageCard = (msg: ForumMessageItem, isNested = false) => {
    const isCoordinator = msg.author_role === "coordinator";
    const isAdmin = msg.author_role === "admin";
    const authorLevel = msg.author_level ?? (isAdmin || isCoordinator ? 99 : 1);
    const initials = msg.author_name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const currentUserId = eligibility?.userId;
    const isAuthor = Boolean(currentUserId && currentUserId === msg.user_id);
    const canEdit = isAuthor;
    const canDelete = isAuthor || isCoordinatorOrAdmin;
    const canModerateUser = isCoordinatorOrAdmin && !isAuthor;

    return (
      <div
        key={msg.id}
        className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 relative ${
          isNested
            ? "bg-void-surface/80 border-void-border/70 hover:border-void-border shadow-md"
            : isCoordinator
            ? "bg-void-surface/95 border-2 border-plasma-cyan/60 shadow-[0_0_25px_rgba(0,229,255,0.12)] ring-1 ring-plasma-cyan/20"
            : isAdmin
            ? "bg-void-surface/95 border-2 border-hyper-violet/60 shadow-[0_0_25px_rgba(99,102,241,0.12)] ring-1 ring-hyper-violet/20"
            : "bg-void-deep/80 border border-void-border/80 hover:border-gray-700"
        }`}
      >
        {/* Author Metadata Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {msg.avatar_url ? (
              <div
                className={`relative w-9 h-9 rounded-full overflow-hidden shrink-0 border bg-void-deep ${
                  isCoordinator
                    ? "border-plasma-cyan/60 shadow-[0_0_10px_rgba(0,229,255,0.25)]"
                    : isAdmin
                    ? "border-hyper-violet/60 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                    : "border-void-border"
                }`}
              >
                <div className="absolute inset-0 bg-void-border/50 animate-pulse pointer-events-none" />
                <Image
                  src={msg.avatar_url}
                  alt={msg.author_name}
                  width={36}
                  height={36}
                  unoptimized
                  style={{ width: "auto", height: "auto" }}
                  className="relative w-9 h-9 rounded-full object-cover"
                />
              </div>
            ) : (
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                  isCoordinator
                    ? "bg-plasma-cyan/20 border-plasma-cyan text-plasma-cyan shadow-[0_0_10px_rgba(0,229,255,0.25)]"
                    : isAdmin
                    ? "bg-hyper-violet/20 border-hyper-violet text-hyper-violet shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                    : "bg-void-surface border-void-border text-gray-300"
                }`}
              >
                {initials || <User className="w-4 h-4" />}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {msg.author_name}
                </span>

                {/* Author Exact Level Pill */}
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                    isCoordinator
                      ? "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/40"
                      : isAdmin
                      ? "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/40"
                      : "bg-void-deep text-plasma-cyan border-plasma-cyan/30 shadow-[0_0_8px_rgba(0,229,255,0.1)]"
                  }`}
                >
                  {t("authorLevel", { level: authorLevel })}
                </span>

                {/* 4-Tier Staff & Role Badges */}
                {msg.author_user_role === "admin" && (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-plasma-cyan/20 to-hyper-violet/30 text-plasma-cyan border border-plasma-cyan/60 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_12px_rgba(0,229,255,0.35)]">
                    <span>🛡️</span>
                    <span>EURO-NOVA ADMIN</span>
                  </span>
                )}

                {msg.author_user_role === "moderator" && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                    <span>⚔️</span>
                    <span>MODERATOR</span>
                  </span>
                )}

                {msg.author_user_role === "support" && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(0,230,118,0.2)]">
                    <span>🎧</span>
                    <span>SUPPORT</span>
                  </span>
                )}

                {/* Organization Coordinator Badge */}
                {isCoordinator && msg.author_user_role !== "admin" && (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/50 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                    <Building className="w-3 h-3" />
                    <span>{t("coordinatorBadge")}</span>
                  </span>
                )}

                {/* Default Verified Volunteer for general users */}
                {!isCoordinator && !msg.author_user_role && !isAdmin && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rup-emerald/10 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1 shadow-[0_0_8px_rgba(0,230,118,0.1)]">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Volunteer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Edit, Warn, Mute Dropdown, Delete */}
          <div className="flex items-center gap-1 shrink-0 relative">
            {canEdit && editingId !== msg.id && (
              <button
                type="button"
                onClick={() => handleStartEdit(msg)}
                disabled={isEditing}
                title={t("editBtn")}
                aria-label={t("editBtn")}
                className="p-1.5 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-plasma-cyan/10 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* NGO & Admin Powers: Warn Button */}
            {canModerateUser && (
              <button
                type="button"
                onClick={() => handleWarn(msg)}
                disabled={warningId === msg.id}
                title={t("warnUserTitle")}
                aria-label={t("warnUser")}
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                {warningId === msg.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* NGO & Admin Powers: Mute User Dropdown */}
            {canModerateUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMuteMenuId(activeMuteMenuId === msg.id ? null : msg.id)
                  }
                  disabled={mutingId === msg.id}
                  title={t("muteUserTitle")}
                  aria-label={t("muteUser")}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 transition-colors cursor-pointer flex items-center gap-0.5 disabled:opacity-50"
                >
                  {mutingId === msg.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-nova-flare" />
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <ChevronDown className="w-2.5 h-2.5" />
                    </>
                  )}
                </button>

                {activeMuteMenuId === msg.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-void-surface border border-nova-flare/40 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-void-border/60">
                      {t("muteTimeOut")}
                    </div>
                    {MUTE_DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => handleMute(msg, opt.minutes)}
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

            {/* Delete Button */}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(msg.id, !isAuthor)}
                disabled={deletingId === msg.id}
                title={t("deleteBtn") || "Delete"}
                aria-label={t("deleteBtn") || "Delete"}
                className="p-1.5 rounded-lg text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 transition-colors cursor-pointer"
              >
                {deletingId === msg.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-nova-flare" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Message Content or Inline Edit Form */}
        {editingId === msg.id ? (
          <div className="space-y-2.5 pl-12 pt-1 animate-in fade-in duration-200">
            <textarea
              rows={3}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={3000}
              disabled={isEditing}
              className="w-full bg-void-surface border border-plasma-cyan/70 focus:border-plasma-cyan rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-plasma-cyan resize-none transition-all"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isEditing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-void-border text-gray-400 hover:text-white text-xs transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>{t("cancelBtn") || "Cancel"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit(msg.id)}
                disabled={isEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-plasma-cyan text-void-deep font-bold text-xs hover:brightness-110 shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isEditing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                <span>{t("saveBtn") || "Save"}</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed pl-12 whitespace-pre-wrap break-words">
            {msg.content}
          </p>
        )}

        {/* Footer: Reply trigger & Timestamp */}
        <div className="flex items-center justify-between pt-2 border-t border-void-border/40 pl-12">
          {!isNested ? (
            canReplyToQuestions ? (
              <button
                type="button"
                onClick={() => {
                  if (replyingToId === msg.id) {
                    setReplyingToId(null);
                    setReplyContent("");
                  } else {
                    setReplyingToId(msg.id);
                    setReplyContent(`@${msg.author_name} `);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-plasma-cyan hover:underline cursor-pointer transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>{replyingToId === msg.id ? t("cancelReply") : t("reply")}</span>
              </button>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 cursor-not-allowed opacity-75 group/replygate"
                title={t("restrictedActionTitle")}
              >
                <Reply className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-gray-500">{t("reply")}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-void-deep border border-void-border text-gray-400 group-hover/replygate:border-plasma-cyan/40 group-hover/replygate:text-plasma-cyan transition-colors">
                  {t("restrictedReplyHint")}
                </span>
              </div>
            )
          ) : (
            <span className="text-[10px] text-gray-500 font-mono">{t("nestedAnswer")}</span>
          )}

          <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-500" />
            {formatRelativeTime(msg.created_at)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-void-surface border border-void-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden"
      data-project-id={projectId}
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-plasma-cyan/5 rounded-full blur-3xl pointer-events-none" />

      {/* Forum Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-void-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)] shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>{t("title")}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1 shadow-[0_0_10px_rgba(0,230,118,0.15)]">
                <ShieldCheck className="w-3 h-3" />
                <span>{t("hyperStrictShield")}</span>
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {projectTitle ? `${projectTitle} • ` : ""}
              {t("subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Hyper-Strict Auto-Moderation Notice */}
      <div className="p-3.5 rounded-2xl bg-void-deep/90 border border-plasma-cyan/30 flex items-center gap-3 text-xs text-plasma-cyan shadow-inner">
        <ShieldAlert className="w-4 h-4 shrink-0 text-plasma-cyan animate-pulse" />
        <span className="font-semibold leading-relaxed">
          {t("antiPhishingNotice")}
        </span>
      </div>

      {/* Moderation Error Banner */}
      {moderationError && (
        <div className="p-4 rounded-2xl bg-nova-flare/15 border border-nova-flare/40 flex items-start gap-3 text-xs text-nova-flare animate-in fade-in duration-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="font-bold leading-relaxed">{moderationError}</div>
        </div>
      )}

      {/* Anti-Spam Level 2 Gating Banner */}
      {isGated && (
        <div className="p-4 sm:p-5 rounded-2xl bg-void-deep/95 border border-nova-flare/40 flex items-start gap-3.5 text-xs text-nova-flare shadow-inner animate-in fade-in duration-300">
          <div className="w-9 h-9 rounded-xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center shrink-0 text-nova-flare shadow-[0_0_12px_rgba(255,46,99,0.2)]">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="font-black text-sm text-white flex items-center gap-2 flex-wrap">
              <span>
                {eligibility?.reason ||
                  "Reach Level 2 (100 XP) to participate in project Q&A to prevent spam."}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-void-surface text-nova-flare border border-nova-flare/40 font-bold">
                {t("currentLevelStatus", { level: eligibility?.level ?? 1, xp: eligibility?.xp ?? 0 })}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t("levelGatedHint")}
            </p>
          </div>
        </div>
      )}

      {/* Main Question Submission Form */}
      <form
        onSubmit={handlePostMessage}
        className={`space-y-3 bg-void-deep/70 p-4 sm:p-5 rounded-2xl border transition-all ${
          isGated
            ? "border-void-border/40 opacity-75"
            : "border-void-border/80 focus-within:border-plasma-cyan/50"
        }`}
      >
        <div className="relative">
          <textarea
            rows={3}
            required
            maxLength={3000}
            placeholder={
              isGated
                ? t("lockedPlaceholder")
                : t("placeholder")
            }
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={isPending || isGated}
            className="w-full bg-void-surface border border-void-border rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-[10px] text-gray-500 font-mono">
            {t("shieldActiveNotice")}
          </span>

          <button
            type="submit"
            disabled={isPending || isGated}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGated ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{t("level2Required")}</span>
              </>
            ) : isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("sending")}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{t("sendBtn")}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Community Messages List with 1-Level Nested Replies */}
      <div className="space-y-5 pt-2">
        {isLoading ? (
          <div className="py-12 text-center border border-dashed border-void-border/60 rounded-2xl bg-void-deep/40 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-plasma-cyan animate-spin" />
            <span className="text-xs text-gray-400 font-mono">{t("loadingTransmissions")}</span>
          </div>
        ) : rootMessages.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-void-border/60 rounded-2xl bg-void-deep/40 p-6 space-y-2">
            <Sparkles className="w-8 h-8 text-plasma-cyan/60 mx-auto" />
            <p className="text-sm font-bold text-gray-300">
              {t("noMessages")}
            </p>
            <p className="text-xs text-gray-500">
              {t("inquiryIndexedNotice")}
            </p>
          </div>
        ) : (
          rootMessages.map((msg) => {
            const replies = repliesByParent.get(msg.id) || [];

            return (
              <div key={msg.id} className="space-y-3">
                {/* 1. Root Question Card */}
                {renderMessageCard(msg, false)}

                {/* 2. Nested Replies Container (Indented by 1 level) */}
                {replies.length > 0 && (
                  <div className="pl-6 sm:pl-10 border-l-2 border-void-border/80 space-y-3 pt-1">
                    {replies.map((replyMsg) => renderMessageCard(replyMsg, true))}
                  </div>
                )}

                {/* 3. Inline Reply Form when replying to this message */}
                {replyingToId === msg.id && (
                  <div className="pl-6 sm:pl-10 pt-1 animate-in fade-in duration-200">
                    <div className="p-3.5 rounded-2xl bg-void-deep/90 border border-plasma-cyan/40 space-y-2.5 shadow-lg">
                      <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                        <span className="flex items-center gap-1.5 text-plasma-cyan">
                          <Reply className="w-3.5 h-3.5" />
                          <span>{t("replyingTo", { name: msg.author_name })}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyContent("");
                          }}
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={t("replyPlaceholder")}
                        maxLength={3000}
                        disabled={isReplying}
                        className="w-full bg-void-surface border border-void-border focus:border-plasma-cyan rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-plasma-cyan resize-none transition-all placeholder:text-gray-500"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyContent("");
                          }}
                          disabled={isReplying}
                          className="px-3 py-1.5 rounded-lg border border-void-border text-gray-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t("cancelBtn")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendReply(msg.id)}
                          disabled={isReplying}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-plasma-cyan text-void-deep font-bold text-xs hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.25)] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isReplying ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{t("sendingAnswer")}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>{t("sendAnswer")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* 50-Item Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-void-border/60">
            <div className="text-xs text-gray-400 font-mono">
              {t("paginationPage", {
                page: pagination.page,
                totalPages: pagination.totalPages,
                totalCount: pagination.totalCount,
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrevPage || isLoading}
                onClick={() => loadMessagesPage(currentPage - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-void-border bg-void-surface text-xs font-semibold text-gray-300 hover:text-white hover:border-plasma-cyan/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {t("previous")}
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() => loadMessagesPage(currentPage + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-void-border bg-void-surface text-xs font-semibold text-gray-300 hover:text-white hover:border-plasma-cyan/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {t("next")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
