"use client";

import { useState, useEffect, useTransition, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { 
  X, 
  Bell, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  Radio, 
  Check, 
  Loader2, 
  SlidersHorizontal,
  Globe 
} from "lucide-react";
import { useTranslations } from "next-intl";
import { 
  getNotificationPreferences, 
  updateNotificationPreferences, 
  type NotificationPreferences 
} from "@/actions/notifications";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const subscribe = () => () => {};

export function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
  const t = useTranslations("Notifications");
  const tCommon = useTranslations("Common");
  const isMounted = useSyncExternalStore(subscribe, () => true, () => false);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: "",
    alert: true,
    moderation: true,
    progression: true,
    action_required: true,
    system: true,
    notification_language: "en",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    getNotificationPreferences()
      .then((res) => {
        if (!ignore && res.success && res.data) {
          setPreferences({
            ...res.data,
            notification_language: res.data.notification_language || "en",
          });
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to load notification preferences:", err);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const handleToggle = (key: keyof Omit<NotificationPreferences, "user_id" | "updated_at" | "notification_language">) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLanguageChange = (lang: string) => {
    setPreferences((prev) => ({
      ...prev,
      notification_language: lang,
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await updateNotificationPreferences({
          alert: preferences.alert,
          moderation: preferences.moderation,
          progression: preferences.progression,
          action_required: preferences.action_required,
          system: preferences.system,
          notification_language: preferences.notification_language || "en",
        });

        if (res.success) {
          setFeedbackMsg(t("savedSuccess"));
          setTimeout(() => {
            setFeedbackMsg(null);
            onClose();
          }, 1200);
        } else {
          toast.error(res.error || t("savePreferences"));
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("savePreferences"));
      }
    });
  };

  if (!isOpen || !isMounted) return null;

  const categories: Array<{
    key: keyof Omit<NotificationPreferences, "user_id" | "updated_at" | "notification_language">;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }> = [
    {
      key: "alert",
      title: t("prefAlert"),
      desc: t("prefAlertDesc"),
      icon: Bell,
      accentColor: "text-plasma-cyan",
    },
    {
      key: "moderation",
      title: t("prefModeration"),
      desc: t("prefModerationDesc"),
      icon: ShieldCheck,
      accentColor: "text-rup-emerald",
    },
    {
      key: "progression",
      title: t("prefProgression"),
      desc: t("prefProgressionDesc"),
      icon: Zap,
      accentColor: "text-hyper-violet",
    },
    {
      key: "action_required",
      title: t("prefActionRequired"),
      desc: t("prefActionRequiredDesc"),
      icon: AlertTriangle,
      accentColor: "text-nova-flare",
    },
    {
      key: "system",
      title: t("prefSystem"),
      desc: t("prefSystemDesc"),
      icon: Radio,
      accentColor: "text-plasma-cyan",
    },
  ];

  const languageOptions = [
    { code: "en", flag: "🇬🇧", label: t("langEn") },
    { code: "es", flag: "🇪🇸", label: t("langEs") },
    { code: "de", flag: "🇩🇪", label: t("langDe") },
    { code: "fr", flag: "🇫🇷", label: t("langFr") },
    { code: "it", flag: "🇮🇹", label: t("langIt") },
    { code: "pt", flag: "🇵🇹", label: t("langPt") },
    { code: "ru", flag: "🇷🇺", label: t("langRu") },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-deep/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-void-surface border border-void-border rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-pref-title"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-hyper-violet/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-void-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-hyper-violet/20 border border-hyper-violet/40 flex items-center justify-center text-hyper-violet shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 id="notif-pref-title" className="text-base font-bold text-white tracking-tight">
                {t("prefTitle")}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("prefSubtitle")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep border border-transparent hover:border-void-border focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer"
            aria-label={tCommon("closeModal")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Category Toggles & Language Selector */}
        <div className="py-4 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-plasma-cyan" />
              <span className="text-xs font-semibold">{t("calibratingFrequencies")}</span>
            </div>
          ) : (
            <>
              {/* Language Selection Card */}
              <div className="p-4 rounded-xl bg-void-deep/80 border border-void-border space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shrink-0 mt-0.5 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-gray-200 tracking-wide">
                      {t("languagePrefTitle")}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                      {t("languagePrefDesc")}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <label htmlFor="notif-language-select" className="sr-only">
                    {t("languageSelectorLabel")}
                  </label>
                  <Select
                    value={preferences.notification_language || "en"}
                    onValueChange={(val) => handleLanguageChange(val)}
                  >
                    <SelectTrigger
                      id="notif-language-select"
                      className="w-full bg-void-surface border-void-border text-white text-xs font-semibold hover:border-plasma-cyan/50 focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan/50 transition-all shadow-inner"
                      aria-label={t("languageSelectorLabel")}
                    >
                      <SelectValue placeholder={t("languageSelectorLabel")}>
                        {(() => {
                          const currentOpt = languageOptions.find(
                            (opt) => opt.code === (preferences.notification_language || "en")
                          );
                          return currentOpt ? (
                            <span className="flex items-center gap-2">
                              <span className="text-base leading-none select-none">{currentOpt.flag}</span>
                              <span className="font-semibold text-white">{currentOpt.label}</span>
                            </span>
                          ) : null;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-void-surface border-void-border text-white shadow-2xl z-[99999] rounded-xl">
                      {languageOptions.map((opt) => (
                        <SelectItem
                          key={opt.code}
                          value={opt.code}
                          className="flex items-center gap-2.5 cursor-pointer hover:bg-plasma-cyan/10 focus:bg-plasma-cyan/15 transition-colors py-2.5 px-3 rounded-lg"
                        >
                          <span className="flex items-center gap-2 text-xs">
                            <span className="text-base leading-none select-none shrink-0">{opt.flag}</span>
                            <span className="font-medium text-gray-200">{opt.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notification Category Toggles */}
              <div className="space-y-3">
                {categories.map(({ key, title, desc, icon: IconComponent, accentColor }) => {
                  const isEnabled = preferences[key];
                  return (
                    <div
                      key={key}
                      onClick={() => handleToggle(key)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isEnabled
                          ? "bg-void-deep/80 border-void-border hover:border-plasma-cyan/40"
                          : "bg-void-deep/40 border-void-border/50 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg bg-void-surface border border-void-border flex items-center justify-center shrink-0 mt-0.5 ${accentColor}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-200 tracking-wide">
                            {title}
                          </h4>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                            {desc}
                          </p>
                        </div>
                      </div>

                      {/* Cosmic Toggle Switch */}
                      <div
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${
                          isEnabled ? "bg-plasma-cyan shadow-[0_0_12px_rgba(0,229,255,0.4)]" : "bg-void-surface border border-void-border"
                        }`}
                      >
                        <div
                          className={`bg-void-deep w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                            isEnabled ? "translate-x-5" : "translate-x-0 bg-gray-500"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-void-border flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            {feedbackMsg && (
              <span className="text-xs font-bold text-rup-emerald flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{feedbackMsg}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
            >
              {t("cancel")}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || isLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-plasma-cyan text-void-deep hover:bg-plasma-cyan/90 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("saving")}</span>
                </>
              ) : (
                <span>{t("savePreferences")}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
