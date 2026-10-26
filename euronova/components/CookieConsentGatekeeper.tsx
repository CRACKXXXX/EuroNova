"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Cookie, Check, X, ExternalLink, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

const emptySubscribe = () => () => {};

/**
 * Returns whether optional analytics & tracking consent has been granted.
 * Strict fail-closed: returns false if not explicitly granted.
 */
export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("euronova_cookie_consent") === "granted";
}

function getConsentSnapshot(): "granted" | "denied" | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem("euronova_cookie_consent");
  return val === "granted" || val === "denied" ? val : null;
}

function subscribeConsent(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("euronova:consent-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("euronova:consent-changed", callback);
  };
}

interface CookieConsentGatekeeperProps {
  isOpenOverride?: boolean;
  onCloseOverride?: () => void;
}

export function CookieConsentGatekeeper({
  isOpenOverride,
  onCloseOverride,
}: CookieConsentGatekeeperProps) {
  const t = useTranslations("CookieGatekeeper");
  const tCommon = useTranslations("Common");

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const consentStatus = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    () => null
  );

  const [hasDismissed, setHasDismissed] = useState(false);
  const [manuallyOpened, setManuallyOpened] = useState(false);

  // Derive isOpen:
  // 1. If isOpenOverride is explicitly passed as boolean, respect it
  // 2. If manually opened via custom event, open it
  // 3. Otherwise, if mounted, not yet consented and not dismissed, open on first visit
  const isFirstVisit = mounted && consentStatus === null && !hasDismissed;
  const isOpen = typeof isOpenOverride === "boolean" ? isOpenOverride : (manuallyOpened || isFirstVisit);

  useEffect(() => {
    const handleOpenPreferences = () => {
      setHasDismissed(false);
      setManuallyOpened(true);
    };

    window.addEventListener("euronova:open-cookie-preferences", handleOpenPreferences);
    return () => {
      window.removeEventListener("euronova:open-cookie-preferences", handleOpenPreferences);
    };
  }, []);

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (!mounted || !isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, mounted]);

  const handleChoice = (choice: "granted" | "denied") => {
    localStorage.setItem("euronova_cookie_consent", choice);

    // Set secure cookie for server-side / middleware compliance
    document.cookie = `euronova_consent=${choice}; path=/; max-age=31536000; SameSite=Lax`;

    // Notify window for dynamic analytics script gatekeeping
    window.dispatchEvent(new CustomEvent("euronova:consent-changed", { detail: { choice } }));

    setHasDismissed(true);
    setManuallyOpened(false);
    onCloseOverride?.();
  };

  const handleClose = () => {
    setHasDismissed(true);
    setManuallyOpened(false);
    onCloseOverride?.();
  };

  if (!mounted || !isOpen) {
    return null;
  }

  // Render modal directly into document.body via Portal to escape any stacking context
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("gatekeeperAriaLabel")}
      className="fixed inset-0 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999999,
        backgroundColor: "rgba(8, 9, 14, 0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        overflowY: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        pointerEvents: "auto",
      }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 text-white space-y-6 relative animate-in zoom-in-95 duration-200"
        style={{
          position: "relative",
          zIndex: 100000000,
          backgroundColor: "#111420",
          border: "1px solid rgba(0, 229, 255, 0.45)",
          boxShadow: "0 0 60px rgba(0,0,0,0.95), 0 0 35px rgba(0,229,255,0.2)",
          width: "100%",
          maxWidth: "32rem",
          borderRadius: "1.5rem",
          padding: "2rem",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background inside modal */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-hyper-violet/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-plasma-cyan/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Badge */}
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,229,255,0.25)]">
              <Cookie className="w-6 h-6 text-plasma-cyan animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {t("title")}
              </h3>
              <p className="text-[11px] font-mono text-plasma-cyan uppercase tracking-wider">
                {t("badge")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer border border-transparent hover:border-void-border"
            style={{ cursor: "pointer", pointerEvents: "auto" }}
            aria-label={tCommon("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Narrative */}
        <div className="space-y-3 text-xs sm:text-sm text-gray-300 leading-relaxed font-light relative z-10">
          <p>{t("description")}</p>
          <div className="p-3 rounded-xl bg-void-deep/90 border border-void-border/80 text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-2 text-plasma-cyan font-mono text-[11px] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t("noTrackingTitle")}</span>
            </div>
            <p className="text-[11px] leading-snug">
              {t("noTrackingDesc")}
            </p>
          </div>
        </div>

        {/* Current Status Pill */}
        {consentStatus && (
          <div className="p-3 rounded-xl bg-void-deep/90 border border-void-border text-xs font-mono flex items-center justify-between relative z-10">
            <span className="text-gray-400">{t("currentSetting")}</span>
            <span
              className={`font-bold flex items-center gap-1.5 ${
                consentStatus === "granted" ? "text-rup-emerald" : "text-gray-300"
              }`}
            >
              {consentStatus === "granted" && <Check className="w-3.5 h-3.5 text-rup-emerald" />}
              {consentStatus === "granted" ? t("statusGranted") : t("statusDenied")}
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 relative z-10">
          <button
            type="button"
            onClick={() => handleChoice("denied")}
            className="w-full py-3 px-4 rounded-xl bg-void-deep hover:bg-void-surface border border-void-border hover:border-gray-500 text-xs font-bold text-gray-300 hover:text-white transition-all text-center"
            style={{ cursor: "pointer", pointerEvents: "auto" }}
          >
            {t("rejectBtn")}
          </button>

          <button
            type="button"
            onClick={() => handleChoice("granted")}
            className="w-full py-3 px-4 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep text-xs font-black transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:shadow-[0_0_25px_rgba(0,229,255,0.55)] text-center"
            style={{ cursor: "pointer", pointerEvents: "auto" }}
          >
            {t("acceptBtn")}
          </button>
        </div>

        {/* Notice & Audit Link */}
        <div className="pt-1 text-center relative z-10">
          <Link
            href="/legal/cookies"
            onClick={handleClose}
            className="text-xs text-gray-400 hover:text-plasma-cyan transition-colors inline-flex items-center gap-1.5 font-mono"
            style={{ cursor: "pointer", pointerEvents: "auto" }}
          >
            <span>{t("cookieNoticeLink")}</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
