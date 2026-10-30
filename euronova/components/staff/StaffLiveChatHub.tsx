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
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
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

  const [selectedChannel, setSelectedChannel] = useState<StaffChatChannel>(verifiedInitialChannel);
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<
    StaffChatMessage[],
    StaffChatMessage
  >(messages, (state, newMsg) => [...state, newMsg]);
  const [inputContent, setInputContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Safeguard: If role changes or current channel becomes unreadable, auto-switch
  useEffect(() => {
    if (!canReadChannel(selectedChannel, currentUserRole)) {
      const fallback = visibleChannels[0]?.id || "general";
      setSelectedChannel(fallback);
    }
  }, [selectedChannel, currentUserRole, visibleChannels]);

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
        // Non-blocking refresh
      }
    }

    // 1. Supabase Realtime channel subscription
    const channelSub = supabase
      .channel(`staff_chat_${selectedChannel}`)
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

    // 2. Resilient 8-second interval fallback
    const intervalId = setInterval(() => {
      void refreshMessages();
    }, 8000);

    return () => {
      clearInterval(intervalId);
      void supabase.removeChannel(channelSub);
    };
  }, [selectedChannel]);

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [optimisticMessages.length, isLoading, scrollToBottom]);

  const handleSelectChannel = (channel: StaffChatChannel) => {
    if (channel === selectedChannel) return;
    setIsLoading(true);
    setSelectedChannel(channel);
  };

  const canBroadcastInChannel = canWriteChannel(selectedChannel, currentUserRole);

  // Transmit Message with React 19 Optimistic UI
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputContent.trim();
    if (!trimmed || isSubmitting) return;

    if (!canBroadcastInChannel) {
      toast.error("You do not have broadcasting clearance in this channel.");
      return;
    }

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: StaffChatMessage = {
      id: tempId,
      channel: selectedChannel,
      userId: currentUserId || "staff-optimistic-id",
      authorName: "You",
      authorRole: currentUserRole,
      content: trimmed,
      isPinned: false,
      createdAt: new Date().toISOString(),
    };

    setInputContent("");
    setIsSubmitting(true);
    scrollToBottom();

    startTransition(async () => {
      addOptimisticMessage(optimisticMsg);
      try {
        const res = await postStaffChatMessage({
          channel: selectedChannel,
          content: trimmed,
        });

        if (res.success && res.data) {
          setMessages((prev) => [...prev, res.data as StaffChatMessage]);
          scrollToBottom();
        } else {
          toast.error(res.error || "Failed to send message.");
          setInputContent(trimmed);
        }
      } catch (err) {
        console.error("Optimistic send error:", err);
        toast.error("Failed to transmit message.");
        setInputContent(trimmed);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Pin Message
  const handleTogglePin = (messageId: string) => {
    if (currentUserRole === "support") {
      toast.error("Support specialists cannot pin announcements.");
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
        toast.success(res.data?.isPinned ? "Message pinned to channel." : "Message unpinned.");
      } else {
        toast.error(res.error || "Failed to update pin.");
      }
    });
  };

  // Delete Message
  const handleDeleteMessage = (messageId: string) => {
    startTransition(async () => {
      const res = await deleteStaffChatMessage(messageId);
      if (res.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        toast.success("Message removed from staff logs.");
      } else {
        toast.error(res.error || "Failed to delete message.");
      }
    });
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);
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
      className={`flex flex-col bg-void-surface border border-void-border rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md ${embedded ? "h-[700px] w-full" : "h-[750px] max-w-6xl mx-auto"
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
              <h2 className="text-base font-black text-white tracking-tight">
                STAFF LIVE COMMS <span className="text-plasma-cyan">HUB</span>
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rup-emerald animate-pulse" />
                Live Grid
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Encrypted channel strictly restricted to verified EuroNova staff.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white bg-void-deep border border-void-border hover:border-gray-600 transition-all cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Channels */}
        <div className="w-60 sm:w-68 bg-void-deep/70 border-r border-void-border flex flex-col p-3 space-y-1 shrink-0 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-plasma-cyan" />
            <span>Staff Channels</span>
          </div>

          {visibleChannels.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            const isWritable = canWriteChannel(ch.id, currentUserRole);

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleSelectChannel(ch.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${isSelected
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
              Active Clearance
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
                  Read Only
                </span>
              )}
              <span className="text-[10px] font-mono text-gray-500">
                {messages.length} transmissions
              </span>
            </div>
          </div>

          {/* Pinned Announcements Bar */}
          {pinnedMessages.length > 0 && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-start gap-3 text-xs">
              <Pin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 fill-amber-400/20" />
              <div className="flex-1 overflow-hidden">
                <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block">
                  Pinned Announcement
                </span>
                <p className="text-gray-200 line-clamp-2 text-xs">
                  {pinnedMessages[pinnedMessages.length - 1].content}
                </p>
              </div>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-plasma-cyan" />
                <span>Connecting to staff communication stream...</span>
              </div>
            ) : optimisticMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-void-surface border border-void-border flex items-center justify-center text-gray-500">
                  <Hash className="w-6 h-6 text-plasma-cyan" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  Welcome to #{selectedChannel}
                </h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  This channel is currently quiet. Be the first staff specialist to initiate a transmission.
                </p>
              </div>
            ) : (
              optimisticMessages.map((msg) => {
                const isOptimistic = msg.id.startsWith("optimistic-");
                const badgeInfo = ROLE_BADGE_CONFIG[msg.authorRole];
                const isAuthor = currentUserId ? msg.userId === currentUserId : false;
                const canModerate =
                  !isOptimistic &&
                  (isAuthor ||
                    currentUserRole === "root" ||
                    currentUserRole === "admin" ||
                    currentUserRole === "moderator");
                const canPin =
                  !isOptimistic &&
                  (currentUserRole === "root" ||
                    currentUserRole === "admin" ||
                    currentUserRole === "moderator");

                return (
                  <div
                    key={msg.id}
                    className={`group rounded-2xl p-4 transition-all border ${isOptimistic
                        ? "bg-plasma-cyan/5 border-plasma-cyan/40 opacity-80 animate-pulse"
                        : msg.isPinned
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-void-surface/70 border-void-border hover:border-void-border/90"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="w-7 h-7 rounded-lg bg-void-deep border border-void-border flex items-center justify-center text-xs font-black text-plasma-cyan font-mono">
                          {msg.authorName.slice(0, 2).toUpperCase()}
                        </div>
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
                            TRANSMITTING...
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}

                        {msg.isPinned && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5 fill-amber-300" />
                            PINNED
                          </span>
                        )}
                      </div>

                      {/* Message Actions */}
                      {!isOptimistic && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {canPin && (
                            <button
                              type="button"
                              onClick={() => handleTogglePin(msg.id)}
                              disabled={isPending}
                              title={msg.isPinned ? "Unpin message" : "Pin message"}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${msg.isPinned
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  : "bg-void-deep border-void-border text-gray-400 hover:text-white"
                                }`}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                          )}
                          {canModerate && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              disabled={isPending}
                              title="Delete message"
                              className="p-1.5 rounded-lg bg-void-deep border border-void-border text-gray-400 hover:text-nova-flare hover:border-nova-flare/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 mt-2.5 leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Bar: Input or Restriction Banner */}
          <div className="p-4 bg-void-surface/90 border-t border-void-border">
            {!canBroadcastInChannel ? (
              <div className="p-3.5 rounded-xl bg-void-surface/90 border border-void-border flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-gray-400">
                  <Lock className="w-4 h-4 text-plasma-cyan shrink-0" />
                  <span>
                    <strong className="text-white">Read-Only Channel:</strong> You have viewing clearance. Broadcasting is restricted by operational role hierarchy.
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 shrink-0">
                  MONITORED
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder={`Transmit message to #${selectedChannel} (Enter to send, Shift+Enter for new line)...`}
                    className="w-full bg-void-deep/90 border border-void-border focus:border-plasma-cyan rounded-xl p-3 text-xs text-white placeholder-gray-500 resize-none outline-none transition-all pr-12 focus:shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !inputContent.trim()}
                    title="Send message"
                    className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-plasma-cyan text-void-deep font-bold hover:bg-plasma-cyan/90 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_10px_rgba(0,229,255,0.3)] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
                  <span>Markdown formatting supported</span>
                  <span>Press Enter to send</span>
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
