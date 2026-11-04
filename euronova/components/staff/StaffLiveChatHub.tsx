"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback, useOptimistic, useMemo } from "react";
import {
  Send,
  Hash,
  Pin,
  Trash2,
  Lock,
  Shield,
  Headphones,
  Sparkles,
  Loader2,
  Radio,
  Megaphone,
  Pencil,
  CornerDownRight,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { AvatarFallback } from "@/components/AvatarFallback";
import { ROLE_BADGE_CONFIG, type UserRole } from "@/lib/rolesTypes";
import {
  STAFF_CHANNELS,
  canReadChannel,
  canWriteChannel,
  type StaffChatChannel,
  type StaffChatMessage,
} from "@/lib/staffChatTypes";
import {
  getStaffChatMessages,
  postStaffChatMessage,
  editStaffChatMessage,
  togglePinStaffChatMessage,
  deleteStaffChatMessage,
} from "@/actions/staffChat";

interface StaffLiveChatHubProps {
  currentUserRole: UserRole;
  currentUserId?: string;
  initialChannel?: StaffChatChannel;
  embedded?: boolean;
  onClose?: () => void;
}

export function StaffLiveChatHub({
  currentUserRole,
  currentUserId,
  initialChannel = "general",
  embedded = false,
  onClose,
}: StaffLiveChatHubProps) {
  const t = useTranslations("StaffChat");

  // Compute visible channels strictly based on read access clearance
  const visibleChannels = useMemo(() => {
    return STAFF_CHANNELS.filter((ch) => canReadChannel(ch.id, currentUserRole));
  }, [currentUserRole]);

  // Ensure initial channel is authorized; fallback to first accessible channel
  const verifiedInitialChannel = useMemo<StaffChatChannel>(() => {
    if (canReadChannel(initialChannel, currentUserRole)) {
      return initialChannel;
    }
    return visibleChannels[0]?.id || "general";
  }, [initialChannel, currentUserRole, visibleChannels]);

  const [userSelectedChannel, setUserSelectedChannel] = useState<StaffChatChannel>(verifiedInitialChannel);

  // Derived selected channel: auto-falls back to first authorized channel if permission changes
  const selectedChannel = useMemo<StaffChatChannel>(() => {
    if (canReadChannel(userSelectedChannel, currentUserRole)) {
      return userSelectedChannel;
    }
    return visibleChannels[0]?.id || "general";
  }, [userSelectedChannel, currentUserRole, visibleChannels]);

  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<
    StaffChatMessage[],
    StaffChatMessage
  >(messages, (state, newMsg) => [...state, newMsg]);

  // Dynamic user ID resolution for bulletproof ownership checks without synchronous effect setState
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      const supabase = createClient();
      void supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) {
          setFetchedUserId(data.user.id);
        }
      });
    }
  }, [currentUserId]);

  const resolvedUserId = currentUserId || fetchedUserId || undefined;

  const [inputContent, setInputContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Attachment state for Staff Live Chat (always enabled for staff)
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("fileSizeExceeded"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error(t("fileTypeNotAllowed"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setAttachedFile(file);
  };

  // Discord-like Reply & Edit State
  const [replyingTo, setReplyingTo] = useState<StaffChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<StaffChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Historical Pin Navigation State
  const [activePinIndex, setActivePinIndex] = useState(0);
  const [isPinDropdownOpen, setIsPinDropdownOpen] = useState(false);

  // Container ref for scoped scrolling without global page jumps
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll strictly scoped to the chat container without affecting window.scrollY
  const scrollToBottom = useCallback((smooth = true) => {
    const container = chatFeedRef.current;
    if (!container) return;
    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Smooth scroll to target message strictly inside chatFeedRef (zero window.scrollY alteration)
  const handleScrollToMessage = useCallback((messageId: string) => {
    const container = chatFeedRef.current;
    const el =
      document.getElementById(`msg-${messageId}`) ||
      document.getElementById(`staff-message-${messageId}`);

    if (container && el) {
      // Calculate relative vertical offset inside the scrollable container
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
      const targetScroll = relativeTop - (container.clientHeight / 2) + (el.clientHeight / 2);

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });

      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === messageId ? null : curr));
      }, 2500);
    } else {
      toast.info(t("targetOutsideView"));
    }
  }, [t]);

  // Channel switch and initial fetch
  useEffect(() => {
    let ignore = false;

    async function fetchChannelMessages() {
      try {
        const res = await getStaffChatMessages(selectedChannel);
        if (!ignore && res.success && res.data) {
          setMessages(res.data);
        }
      } catch (err) {
        console.error("Failed to load staff messages:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void fetchChannelMessages();

    return () => {
      ignore = true;
    };
  }, [selectedChannel]);

  // Real-time Supabase subscription + 8-second polling fallback
  useEffect(() => {
    const supabase = createClient();

    async function refreshMessages() {
      try {
        const res = await getStaffChatMessages(selectedChannel);
        if (res.success && res.data) {
          setMessages(res.data);
        }
      } catch {
        // Silent polling catch
      }
    }

    const channel = supabase
      .channel(`realtime-staff-chat-${selectedChannel}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_chat_messages",
          filter: `channel=eq.${selectedChannel}`,
        },
        () => {
          void refreshMessages();
        }
      )
      .subscribe();

    const intervalId = setInterval(() => {
      void refreshMessages();
    }, 8000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [selectedChannel]);

  // Auto-scroll on initial load or new message
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isLoading, selectedChannel, scrollToBottom, messages.length]);

  const canBroadcastInChannel = useMemo(() => {
    return canWriteChannel(selectedChannel, currentUserRole);
  }, [selectedChannel, currentUserRole]);

  const handleSelectChannel = (chId: StaffChatChannel) => {
    if (chId === selectedChannel) return;
    setUserSelectedChannel(chId);
    setIsLoading(true);
    setInputContent("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setReplyingTo(null);
    setEditingMessage(null);
    setActivePinIndex(0);
    setIsPinDropdownOpen(false);
  };

  // Reply handlers
  const handleStartReply = (msg: StaffChatMessage) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    textareaRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Edit handlers
  const handleStartEdit = (msg: StaffChatMessage) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setInputContent(msg.content);
    textareaRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputContent("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setReplyingTo(null);
  };

  // Transmit Message or Save Edited Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let trimmed = inputContent.trim();
    if (attachedFile) {
      trimmed = trimmed ? `${trimmed}\n\n📎 [Attachment: ${attachedFile.name}]` : `📎 [Attachment: ${attachedFile.name}]`;
    }
    if (!trimmed || isSubmitting) return;

    if (!canBroadcastInChannel) {
      toast.error(t("noBroadcastClearance"));
      return;
    }

    // Mode A: Editing Existing Message
    if (editingMessage) {
      setIsSubmitting(true);
      const targetId = editingMessage.id;
      handleCancelEdit();

      startTransition(async () => {
        try {
          const res = await editStaffChatMessage({
            messageId: targetId,
            content: trimmed,
          });

          if (res.success && res.data) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, content: trimmed, isEdited: true, updatedAt: new Date().toISOString() } : m
              )
            );
            toast.success(t("msgUpdatedSuccess"));
          } else {
            toast.error(res.error || t("msgUpdateFailed"));
            setInputContent(trimmed);
          }
        } catch (err) {
          console.error("Edit message error:", err);
          toast.error(t("msgUpdateFailed"));
          setInputContent(trimmed);
        } finally {
          setIsSubmitting(false);
        }
      });
      return;
    }

    // Mode B: Posting New Message (with optional inline reply)
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: StaffChatMessage = {
      id: tempId,
      channel: selectedChannel,
      userId: resolvedUserId || "staff-optimistic-id",
      authorName: "You",
      authorRole: currentUserRole,
      content: trimmed,
      isPinned: false,
      isEdited: false,
      replyToId: replyingTo?.id || null,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            authorName: replyingTo.authorName,
            content: replyingTo.deletedAt ? t("deletedMessage") : replyingTo.content,
          }
        : null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };

    const currentReplyToId = replyingTo?.id || null;
    setInputContent("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setReplyingTo(null);
    setIsSubmitting(true);
    scrollToBottom(true);

    startTransition(async () => {
      addOptimisticMessage(optimisticMsg);
      try {
        const res = await postStaffChatMessage({
          channel: selectedChannel,
          content: trimmed,
          replyToId: currentReplyToId,
        });

        if (res.success && res.data) {
          setMessages((prev) => [...prev, res.data as StaffChatMessage]);
          scrollToBottom(true);
        } else {
          toast.error(res.error || t("msgSendFailed"));
          setInputContent(trimmed);
        }
      } catch (err) {
        console.error("Optimistic send error:", err);
        toast.error(t("msgSendFailed"));
        setInputContent(trimmed);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline, Esc to cancel edit/reply
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      if (editingMessage) {
        e.preventDefault();
        handleCancelEdit();
      } else if (replyingTo) {
        e.preventDefault();
        handleCancelReply();
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Pin Message
  const handleTogglePin = (messageId: string) => {
    if (currentUserRole === "support") {
      toast.error(t("supportCannotPin"));
      return;
    }

    startTransition(async () => {
      const res = await togglePinStaffChatMessage(messageId);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isPinned: Boolean(res.data?.isPinned) } : m
          )
        );
        toast.success(res.data?.isPinned ? t("msgPinnedSuccess") : t("msgUnpinnedSuccess"));
      } else {
        toast.error(res.error || t("pinStatusFailed"));
      }
    });
  };

  // Soft Delete Message
  const handleDeleteMessage = (messageId: string) => {
    startTransition(async () => {
      const res = await deleteStaffChatMessage(messageId);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m
          )
        );
        toast.success(t("msgDeletedSuccess"));
      } else {
        toast.error(res.error || t("msgDeleteFailed"));
      }
    });
  };

  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.isPinned && !m.deletedAt);
  }, [messages]);

  const safePinIndex =
    activePinIndex >= pinnedMessages.length ? Math.max(0, pinnedMessages.length - 1) : activePinIndex;
  const currentPin = pinnedMessages[safePinIndex] || null;

  const activeChannelMeta = STAFF_CHANNELS.find((c) => c.id === selectedChannel);

  // Helper for rendering channel icon
  const getChannelIcon = (chId: StaffChatChannel, isSelected: boolean) => {
    if (chId === "admin_command" || chId === "admin-command") {
      return <Lock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-nova-flare" : "text-gray-500"}`} />;
    }
    if (chId.startsWith("announcements_")) {
      return <Megaphone className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-400" : "text-amber-500/70"}`} />;
    }
    if (chId.startsWith("moderator_") || chId === "moderation-ops") {
      return <Shield className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-400" : "text-amber-500/70"}`} />;
    }
    if (chId.startsWith("support_") || chId === "support-tickets") {
      return <Headphones className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-rup-emerald" : "text-rup-emerald/70"}`} />;
    }
    return <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-plasma-cyan" : "text-gray-400"}`} />;
  };

  return (
    <div
      className={`flex flex-col bg-void-surface border border-void-border rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md ${
        embedded ? "h-[700px] w-full" : "h-[750px] max-w-6xl mx-auto"
      }`}
    >
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-void-deep/90 border-b border-void-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/40 flex items-center justify-center text-plasma-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight uppercase">
                {t("terminalBadge")}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rup-emerald animate-pulse" />
                {t("liveGrid")}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {t("encryptedSub")}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white bg-void-deep border border-void-border hover:border-gray-600 transition-all cursor-pointer"
          >
            {t("cancel")}
          </button>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Channels */}
        <div className="w-60 sm:w-68 bg-void-deep/70 border-r border-void-border flex flex-col p-3 space-y-1 shrink-0 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-plasma-cyan" />
            <span>{t("staffChannels")}</span>
          </div>

          {visibleChannels.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            const isWritable = canWriteChannel(ch.id, currentUserRole);

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleSelectChannel(ch.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                  isSelected
                    ? "bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    : "text-gray-400 hover:text-white hover:bg-void-surface border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {getChannelIcon(ch.id, isSelected)}
                  <span className="truncate">{ch.name}</span>
                </div>

                {!isWritable && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-void-deep border border-void-border text-gray-500 group-hover:text-gray-400 shrink-0">
                    RO
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-auto p-3 rounded-xl bg-void-surface/80 border border-void-border text-[11px] space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              {t("activeClearance")}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-plasma-cyan animate-pulse" />
              <span className="font-mono font-bold text-white uppercase text-[10px]">
                {currentUserRole.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Pane: Messages Feed & Input */}
        <div className="flex-1 flex flex-col bg-void-deep/40 overflow-hidden">
          {/* Active Channel Header */}
          <div className="px-6 py-3 bg-void-surface/50 border-b border-void-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-sm">
                #{selectedChannel}
              </span>
              <span className="text-gray-500 text-[11px] hidden sm:inline">
                — {activeChannelMeta?.description}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!canBroadcastInChannel && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {t("readOnlyNotice")}
                </span>
              )}
              <span className="text-[10px] font-mono text-gray-500">
                {messages.length} {t("transmissions")}
              </span>
            </div>
          </div>

          {/* Historically Accurate Pinned Announcements Navigator */}
          {pinnedMessages.length > 0 && currentPin && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex flex-col gap-2 text-xs relative">
              <div className="flex items-center justify-between gap-3">
                <div
                  onClick={() => handleScrollToMessage(currentPin.id)}
                  className="flex items-start gap-3 flex-1 overflow-hidden cursor-pointer group/pin"
                  title={t("jumpToPinTitle")}
                >
                  <Pin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 fill-amber-400/20 group-hover/pin:scale-110 transition-transform" />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block">
                        {t("pinnedAnnouncement")}
                      </span>
                      {pinnedMessages.length > 1 && (
                        <span className="text-[10px] font-mono text-amber-400/80">
                          ({safePinIndex + 1} of {pinnedMessages.length})
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-amber-400/80 group-hover/pin:text-amber-300 flex items-center gap-1 ml-auto sm:ml-2">
                        <span>{t("jumpToPin")}</span>
                        <span>↓</span>
                      </span>
                    </div>
                    <p className="text-gray-200 line-clamp-1 text-xs mt-0.5">
                      {currentPin.content}
                    </p>
                  </div>
                </div>

                {/* Pin Controls: Prev/Next and Toggle List if multiple pins exist */}
                {pinnedMessages.length > 1 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePinIndex((prev) => (prev > 0 ? prev - 1 : pinnedMessages.length - 1));
                      }}
                      title={t("prevPin")}
                      className="p-1 rounded-md bg-void-deep/80 hover:bg-void-deep text-amber-400 hover:text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePinIndex((prev) => (prev < pinnedMessages.length - 1 ? prev + 1 : 0));
                      }}
                      title={t("nextPin")}
                      className="p-1 rounded-md bg-void-deep/80 hover:bg-void-deep text-amber-400 hover:text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPinDropdownOpen((prev) => !prev);
                      }}
                      title={t("showAllPins")}
                      className="px-2 py-1 rounded-md bg-void-deep/80 hover:bg-void-deep text-amber-400 hover:text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                    >
                      {t("pinnedAnnouncement")} ({pinnedMessages.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Dropdown list of all historical pins */}
              {isPinDropdownOpen && pinnedMessages.length > 1 && (
                <div className="mt-1 p-2 rounded-xl bg-void-surface border border-amber-500/30 shadow-2xl space-y-1.5 max-h-48 overflow-y-auto animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 block">
                    {t("pinnedAnnouncement")} ({pinnedMessages.length})
                  </span>
                  {pinnedMessages.map((pin, idx) => (
                    <div
                      key={pin.id}
                      onClick={() => {
                        setActivePinIndex(idx);
                        setIsPinDropdownOpen(false);
                        handleScrollToMessage(pin.id);
                      }}
                      className={`p-2 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-3 text-xs border ${
                        idx === safePinIndex
                          ? "bg-amber-500/20 border-amber-500/40 text-white"
                          : "bg-void-deep/70 border-void-border text-gray-300 hover:bg-void-deep hover:border-amber-500/30"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-white text-[11px] truncate">
                            {pin.authorName}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono" suppressHydrationWarning>
                            {new Date(pin.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[11px] text-gray-300">
                          {pin.content}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 hover:underline shrink-0 mt-0.5">
                        {t("jumpToPin")} →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Feed strictly scoped to chatFeedRef */}
          <div ref={chatFeedRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-plasma-cyan" />
                <span>{t("connecting")}</span>
              </div>
            ) : optimisticMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-void-surface border border-void-border flex items-center justify-center text-gray-500">
                  <Hash className="w-6 h-6 text-plasma-cyan" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  {t("welcomeChannel", { channel: selectedChannel })}
                </h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  {t("noTransmissions")}
                </p>
              </div>
            ) : (
              optimisticMessages.map((msg) => {
                const isOptimistic = msg.id.startsWith("optimistic-");
                const badgeInfo = ROLE_BADGE_CONFIG[msg.authorRole];
                const isAuthor = resolvedUserId ? msg.userId === resolvedUserId : false;
                const isDeleted = Boolean(msg.deletedAt);

                // Permissions: users can ONLY edit their own messages
                const canEdit = !isOptimistic && !isDeleted && isAuthor;

                // Permissions: users can soft-delete their own messages, or root/admin can moderate
                const canDelete =
                  !isOptimistic &&
                  !isDeleted &&
                  (isAuthor || currentUserRole === "root" || currentUserRole === "admin");

                const canPin =
                  !isOptimistic &&
                  !isDeleted &&
                  (currentUserRole === "root" ||
                    currentUserRole === "admin" ||
                    currentUserRole === "moderator");

                const canReply = !isOptimistic && !isDeleted && canBroadcastInChannel;
                const isHighlighted = highlightedMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    data-message-id={msg.id}
                    className={`group rounded-2xl p-4 transition-all duration-300 border ${
                      isHighlighted
                        ? "ring-2 ring-plasma-cyan shadow-[0_0_30px_rgba(0,229,255,0.45)] bg-plasma-cyan/15 scale-[1.01]"
                        : isOptimistic
                        ? "bg-plasma-cyan/5 border-plasma-cyan/40 opacity-80 animate-pulse"
                        : msg.isPinned
                        ? "bg-amber-500/5 border-amber-500/30"
                        : "bg-void-surface/70 border-void-border hover:border-void-border/90"
                    }`}
                  >
                    {/* Inline Discord-style Reply Preview Above Message */}
                    {msg.replyTo && (
                      <div
                        onClick={() => handleScrollToMessage(msg.replyTo!.id)}
                        className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2 hover:text-plasma-cyan cursor-pointer transition-colors group/reply select-none pl-2 border-l-2 border-void-border hover:border-plasma-cyan"
                        title={t("clickToJump")}
                      >
                        <CornerDownRight className="w-3 h-3 text-gray-500 group-hover/reply:text-plasma-cyan shrink-0" />
                        <span className="font-semibold text-gray-300 group-hover/reply:text-white">
                          @{msg.replyTo.authorName}:
                        </span>
                        <span className="truncate max-w-xs sm:max-w-md text-gray-400 group-hover/reply:text-gray-200">
                          {msg.replyTo.content}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <AvatarFallback
                          src={msg.authorAvatar}
                          userId={msg.userId}
                          name={msg.authorName}
                          sizeClassName="w-7 h-7"
                          className="rounded-lg border-void-border shrink-0"
                        />
                        <span className="font-bold text-white text-xs">
                          {msg.authorName}
                        </span>

                        {badgeInfo && (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeInfo.badgeClass}`}
                          >
                            {badgeInfo.label}
                          </span>
                        )}

                        {isOptimistic ? (
                          <span className="text-[10px] text-plasma-cyan font-mono flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            {t("transmissions").toUpperCase()}...
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-mono" suppressHydrationWarning>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}

                        {msg.isPinned && !isDeleted && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5 fill-amber-300" />
                            {t("pinnedAnnouncement")}
                          </span>
                        )}
                      </div>

                      {/* Discord-like Message Action Bar on Hover */}
                      {!isOptimistic && !isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-void-deep/80 p-0.5 rounded-xl border border-void-border">
                          {canReply && (
                            <button
                              type="button"
                              onClick={() => handleStartReply(msg)}
                              title={t("replyMessage")}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-void-surface transition-all cursor-pointer"
                            >
                              <CornerDownRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              title={t("editMessage")}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-void-surface transition-all cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canPin && (
                            <button
                              type="button"
                              onClick={() => handleTogglePin(msg.id)}
                              disabled={isPending}
                              title={msg.isPinned ? t("unpinMessage") : t("pinMessage")}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                msg.isPinned
                                  ? "text-amber-300 bg-amber-500/20 hover:bg-amber-500/30"
                                  : "text-gray-400 hover:text-white hover:bg-void-surface"
                              }`}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              disabled={isPending}
                              title={t("deleteMessage")}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-nova-flare hover:bg-void-surface transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Content: Active text or Soft-deleted placeholder */}
                    <div className="mt-2 text-xs leading-relaxed">
                      {isDeleted ? (
                        <span className="italic text-gray-500 font-mono">
                          {t("deletedMessage")}
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-gray-200 whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          {msg.isEdited && (
                            <span className="text-[10px] text-gray-500 font-mono italic">
                              {t("editedTag")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Bar: Input or Restriction Banner */}
          <div className="p-4 bg-void-surface/90 border-t border-void-border">
            {!canBroadcastInChannel ? (
              <div className="p-3.5 rounded-xl bg-void-surface/90 border border-void-border flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-gray-400">
                  <Lock className="w-4 h-4 text-plasma-cyan shrink-0" />
                  <span>
                    {t("readOnlyNotice")}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 shrink-0">
                  RO
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-2">
                {/* Replying-To Preview Banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-void-deep/90 border border-plasma-cyan/40 rounded-xl text-xs text-gray-300 shadow-sm animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 truncate">
                      <CornerDownRight className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
                      <span className="text-[11px] text-gray-400">{t("replyingTo")}</span>
                      <span className="text-[11px] font-bold text-plasma-cyan">@{replyingTo.authorName}</span>
                      <span className="text-[11px] text-gray-400 truncate max-w-xs sm:max-w-md">
                        &quot;{replyingTo.deletedAt ? t("deletedMessage") : replyingTo.content}&quot;
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-void-surface transition-colors cursor-pointer"
                      title={t("cancelReply")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Editing Message Banner */}
                {editingMessage && (
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-void-deep/90 border border-amber-500/40 rounded-xl text-xs text-gray-300 shadow-sm animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 truncate">
                      <Pencil className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-amber-300 font-bold">{t("editingMessage")}</span>
                      <span className="text-[11px] text-gray-400 truncate max-w-xs sm:max-w-md">
                        &quot;{editingMessage.content}&quot;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">{t("escapeToCancel")}</span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-void-surface transition-colors cursor-pointer"
                        title={t("cancelEdit")}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* File Attachment Preview Chip */}
                {attachedFile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-void-deep/90 border border-plasma-cyan/40 rounded-xl text-xs text-plasma-cyan shadow-sm animate-in fade-in duration-150 w-fit">
                    <Paperclip className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
                    <span className="font-medium text-white truncate max-w-xs">{attachedFile.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      ({(attachedFile.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="p-0.5 rounded text-gray-400 hover:text-nova-flare transition-colors cursor-pointer"
                      title={t("removeAttachment")}
                      aria-label={t("removeAttachment")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder={
                      editingMessage
                        ? t("editMessage")
                        : t("placeholder", { channel: selectedChannel })
                    }
                    className={`w-full bg-void-deep/90 border rounded-xl p-3 text-xs text-white placeholder-gray-500 resize-none outline-none transition-all pr-20 ${
                      editingMessage
                        ? "border-amber-500/50 focus:border-amber-400 focus:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "border-void-border focus:border-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    }`}
                  />
                  <div className="absolute right-2.5 bottom-3.5 flex items-center gap-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                      title={t("attachFile")}
                      aria-label={t("attachFile")}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-plasma-cyan/10 transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 text-plasma-cyan" />
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (!inputContent.trim() && !attachedFile)}
                      title={editingMessage ? t("saveChanges") : t("pressEnter")}
                      className={`p-2 rounded-lg font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
                        editingMessage
                          ? "bg-amber-500 text-void-deep hover:bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                          : "bg-plasma-cyan text-void-deep hover:bg-plasma-cyan/90 shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editingMessage ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
                  <span>{t("markdownSupport")}</span>
                  <span>{editingMessage ? t("saveChanges") : t("pressEnter")}</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffLiveChatHub;
