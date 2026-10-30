"use client";

import { useState, useEffect, useRef, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { 
  Bell, 
  CheckCheck, 
  Settings, 
  Trash2, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  Radio, 
  Compass, 
  ExternalLink,
  Loader2,
  Headphones
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  type NotificationItem, 
  type NotificationType 
} from "@/actions/notifications";
import { NotificationPreferencesModal } from "@/components/NotificationPreferencesModal";

const subscribe = () => () => {};

export function NotificationBell() {
  const router = useRouter();
  const t = useTranslations("Notifications");
  const tSupport = useTranslations("SupportHub");
  const format = useFormatter();
  const isMounted = useSyncExternalStore(subscribe, () => true, () => false);

  const [isOpen, setIsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones al montar y cuando se abre el menú
  const loadNotifications = () => {
    setIsLoading(true);
    getNotifications(30)
      .then((res) => {
        if (res.success && res.data) {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.unreadCount);
        }
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      loadNotifications();
    });

    // Suscripción en tiempo real a la tabla `notifications` para el usuario conectado
    const supabase = createClient();
    const channelTopic = `omnichannel_notifications_${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    // Intervalo de respaldo periódico cada 45 segundos
    const interval = setInterval(() => {
      loadNotifications();
    }, 45000);

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cerrar al pulsar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      try {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        await markAllNotificationsAsRead();
      } catch (err: unknown) {
        console.error("Failed to mark all notifications as read:", err);
      }
    });
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationAsRead(item.id);
    }

    if (item.action_url) {
      setIsOpen(false);
      router.push(item.action_url);
    }
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    deleteNotification(id);
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "alert":
        return <Bell className="w-4 h-4 text-plasma-cyan" />;
      case "moderation":
        return <ShieldCheck className="w-4 h-4 text-rup-emerald" />;
      case "progression":
        return <Zap className="w-4 h-4 text-hyper-violet" />;
      case "action_required":
        return <AlertTriangle className="w-4 h-4 text-nova-flare" />;
      case "system":
      default:
        return <Radio className="w-4 h-4 text-plasma-cyan" />;
    }
  };

  if (!isMounted) {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-void-surface border border-void-border text-gray-400 opacity-60"
          aria-label={t("title")}
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative shrink-0 select-none" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`relative p-2 min-w-[44px] min-h-[44px] rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none ${
          isOpen
            ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]"
            : unreadCount > 0
            ? "bg-void-surface hover:bg-void-surface/90 border-plasma-cyan/40 text-gray-200 hover:border-plasma-cyan hover:text-white shadow-[0_0_12px_rgba(0,229,255,0.15)]"
            : "bg-void-surface hover:bg-void-surface/90 border-void-border text-gray-400 hover:text-gray-200 hover:border-gray-600"
        }`}
        aria-label={t("viewNotifications")}
        title={t("title")}
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`} />

        {/* Real-time Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 h-4 rounded-full bg-nova-flare text-[9px] font-black text-white flex items-center justify-center shadow-[0_0_10px_rgba(255,46,99,0.7)] animate-in zoom-in-75">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-void-surface border border-void-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[520px]">
          {/* Dropdown Header */}
          <div className="p-3.5 border-b border-void-border/80 flex items-center justify-between gap-2 bg-void-deep/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-white tracking-wide truncate">
                {t("title")}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30">
                  {t("newBadge", { count: unreadCount })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-void-deep border border-transparent hover:border-void-border transition-colors cursor-pointer"
                  title={t("markAllRead")}
                  aria-label={t("markAllRead")}
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPreferencesOpen(true);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep border border-transparent hover:border-void-border transition-colors cursor-pointer"
                title={t("preferences")}
                aria-label={t("openSettings")}
              >
                <Settings className="w-4 h-4" />
              </button>

              <Link
                href="/dashboard/support"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-plasma-cyan hover:bg-void-deep border border-transparent hover:border-void-border transition-colors cursor-pointer flex items-center justify-center"
                title={tSupport("hubTitle")}
                aria-label={tSupport("hubTitle")}
              >
                <Headphones className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Scrollable Notification List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-void-border/40">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-plasma-cyan" />
                <span className="text-xs">{t("scanning")}</span>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((item) => {
                const isWarningOrMute =
                  item.type === "action_required" ||
                  item.title.toLowerCase().includes("warn") ||
                  item.title.toLowerCase().includes("mute") ||
                  item.title.toLowerCase().includes("time-out");

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 py-3 h-auto min-h-fit transition-all flex items-start gap-3 cursor-pointer group relative ${
                      item.is_read
                        ? "hover:bg-void-deep/40 opacity-75 hover:opacity-100"
                        : isWarningOrMute
                        ? "bg-nova-flare/10 hover:bg-nova-flare/15 border-l-2 border-nova-flare shadow-sm"
                        : "bg-void-deep/70 hover:bg-void-deep border-l-2 border-plasma-cyan shadow-sm"
                    }`}
                  >
                    {/* Type Icon Badge */}
                    <div className="w-8 h-8 rounded-xl bg-void-surface border border-void-border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-inner">
                      {getTypeIcon(item.type)}
                    </div>

                    {/* Body Content - Truncation Completely Eradicated */}
                    <div className="min-w-0 flex-1 h-auto">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4
                          className={`text-xs font-bold leading-snug whitespace-normal break-words flex-1 ${
                            item.is_read ? "text-gray-300" : isWarningOrMute ? "text-nova-flare" : "text-white"
                          }`}
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-mono shrink-0 pt-0.5 ml-2">
                          {(() => {
                            try {
                              return format.relativeTime(new Date(item.created_at));
                            } catch {
                              return format.dateTime(new Date(item.created_at), { dateStyle: "short" });
                            }
                          })()}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-300 whitespace-normal break-words h-auto leading-relaxed mt-0.5">
                        {item.message}
                      </p>

                      {item.action_url && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-plasma-cyan group-hover:underline">
                          <span>{t("openTransmission")}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Actions / Delete */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-nova-flare transition-opacity cursor-pointer shrink-0 mt-0.5"
                      title={t("dismiss")}
                      aria-label={t("dismiss")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 px-6 text-center space-y-2">
                <Compass className="w-8 h-8 text-gray-500 mx-auto opacity-50 mb-1" />
                <h4 className="text-xs font-bold text-gray-300">
                  {t("emptyTitle")}
                </h4>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                  {t("emptyDesc")}
                </p>
              </div>
            )}
          </div>

          {/* Dropdown Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 border-t border-void-border/80 bg-void-deep/40 text-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPreferencesOpen(true);
                }}
                className="text-[11px] font-semibold text-gray-400 hover:text-plasma-cyan transition-colors cursor-pointer"
              >
                {t("manageFrequencies")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </div>
  );
}
