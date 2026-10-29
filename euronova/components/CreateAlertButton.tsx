"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCircle2, Sparkles, Filter } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

const emptySubscribe = () => () => {};

export function CreateAlertButton({ className = "" }: { className?: string }) {
  const t = useTranslations("Projects");
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("instant");
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const safeT = (key: string, fallback: string) => {
    try {
      const val = t(key);
      if (!val || val === `Projects.${key}` || val.endsWith(`.${key}`)) return fallback;
      return val;
    } catch {
      return fallback;
    }
  };

  // Extraer filtros activos para mostrarlos en el modal
  const activeFilters: { label: string; value: string }[] = [];
  const q = searchParams.get("q");
  if (q) activeFilters.push({ label: "Keyword", value: q });
  const dest = searchParams.get("dest");
  if (dest) activeFilters.push({ label: "Destination", value: dest });
  const types = searchParams.get("types");
  if (types) activeFilters.push({ label: "Type", value: types });
  const themes = searchParams.get("themes");
  if (themes) activeFilters.push({ label: "Themes", value: themes });
  const rup = searchParams.get("rup");
  if (rup === "true") activeFilters.push({ label: "Region", value: "ORs Flights" });
  const lastMinute = searchParams.get("last_minute");
  if (lastMinute === "true") activeFilters.push({ label: "Priority", value: "Last Minute" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    startTransition(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setIsOpen(false);
        setToastMessage(safeT("alertActivated", "Mission alert calibrated! You will receive new matching transmissions."));
        setTimeout(() => setToastMessage(null), 4500);
      } catch {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl border border-void-border bg-void-surface hover:border-plasma-cyan/50 text-gray-300 hover:text-white focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-all text-xs font-semibold shadow-sm cursor-pointer group ${className}`}
        title={safeT("createAlertTitle", "Create Mission Radar Alert")}
      >
        <Bell className="w-4 h-4 text-plasma-cyan group-hover:scale-110 transition-transform" />
        <span>{safeT("createAlert", "Create Alert")}</span>
      </button>

      {/* Alert Calibration Modal */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void-deep/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
          <div className="bg-void-surface border border-plasma-cyan/40 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(0,229,255,0.15)] animate-in zoom-in-95 duration-300 relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("closeModal")}
              className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                <Bell className="w-5 h-5 text-plasma-cyan" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {safeT("createAlertTitle", "Create Mission Radar Alert")}
                </h3>
                <p className="text-xs text-gray-400">
                  {safeT("createAlertDesc", "Get notified as soon as new missions match your active search filters.")}
                </p>
              </div>
            </div>

            {/* Active Filters Summary */}
            <div className="p-3 rounded-xl bg-void-deep border border-void-border/70 mb-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-plasma-cyan uppercase tracking-wider">
                <Filter className="w-3 h-3" />
                <span>{t("activeRadarCriteria")}</span>
              </div>
              {activeFilters.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeFilters.map((f, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-void-surface text-[10px] text-gray-300 border border-void-border"
                    >
                      <strong className="text-white">{f.label}:</strong> {f.value}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  {t("allActiveTransmissions")}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  {safeT("alertEmail", "Notification Email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("alertPlaceholderEmail")}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  {safeT("alertFrequency", "Telemetry Frequency")}
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-plasma-cyan"
                >
                  <option value="instant">{safeT("alertInstant", "Instant (As soon as published)")}</option>
                  <option value="weekly">{safeT("alertWeekly", "Weekly Orbital Digest")}</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-void-border bg-void-deep hover:bg-void-surface text-gray-300 text-xs font-semibold transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending || !email}
                  className="flex-1 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isPending ? t("calibrating") : safeT("activateAlert", "Activate Alert")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Success Toast */}
      {toastMessage && mounted && createPortal(
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-top-5 duration-400">
          <div className="bg-void-surface/95 border border-plasma-cyan/60 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_0_35px_rgba(0,229,255,0.3)] flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-plasma-cyan/20 border border-plasma-cyan/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              <CheckCircle2 className="w-5 h-5 text-plasma-cyan animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-plasma-cyan">
                {t("radarAlertCalibrated")}
              </p>
              <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                {toastMessage}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
