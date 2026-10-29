"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Cookie, ShieldCheck, Settings, Check, X, ExternalLink, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

const emptySubscribe = () => () => {};

/**
 * Returns whether optional analytics & tracking consent has been granted.
 * Strict fail-closed under GDPR / ePrivacy Directive: returns false if not explicitly granted.
 */
export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem("euronova_cookie_consent");
  return val === "accepted" || val === "granted";
}

/**
 * Placeholder / gatekeeper for third-party analytics initialization.
 * Strictly checks consent before initiating any telemetry scripts.
 */
export function initAnalytics(): boolean {
  if (!hasCookieConsent()) {
    return false;
  }
  return true;
}

function getConsentSnapshot(): "accepted" | "rejected" | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem("euronova_cookie_consent");
  if (val === "accepted" || val === "granted") return "accepted";
  if (val === "rejected" || val === "denied") return "rejected";
  return null;
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

export function CookieBanner() {
  const t = useTranslations("CookieBanner");

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

  const [showPreferences, setShowPreferences] = useState(false);
  const [customAnalyticsToggle, setCustomAnalyticsToggle] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isAnalyticsActive = customAnalyticsToggle !== null ? customAnalyticsToggle : consentStatus === "accepted";

  // Listen to external requests to open cookie preferences (e.g. from /legal/cookies or Footer)
  useEffect(() => {
    const handleOpen = () => {
      setDismissed(false);
      setShowPreferences(true);
    };

    window.addEventListener("euronova:open-cookie-preferences", handleOpen);
    return () => {
      window.removeEventListener("euronova:open-cookie-preferences", handleOpen);
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!mounted || !showPreferences) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showPreferences, mounted]);

  const saveConsent = (choice: "accepted" | "rejected") => {
    try {
      localStorage.setItem("euronova_cookie_consent", choice);
      document.cookie = `euronova_consent=${choice}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("euronova:consent-changed", { detail: { choice } }));
      if (choice === "accepted") {
        initAnalytics();
      }
    } catch {
      // LocalStorage access resilient fallback
    }
    setDismissed(true);
    setShowPreferences(false);
    setCustomAnalyticsToggle(null);
  };

  const handleAcceptAll = () => {
    saveConsent("accepted");
  };

  const handleRejectNonEssential = () => {
    saveConsent("rejected");
  };

  const handleSavePreferences = () => {
    saveConsent(isAnalyticsActive ? "accepted" : "rejected");
  };

  // Only render banner if mounted, user hasn't made a decision yet, not dismissed, and modal is not active
  const shouldRenderBanner = mounted && !dismissed && consentStatus === null && !showPreferences;

  return (
    <>
      {/* 1. Native Initial Bottom Banner (Shown only once for new visitors) */}
      {shouldRenderBanner && (
        <aside
          role="region"
          aria-label={t("title")}
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-5 sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-xl pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="pointer-events-auto w-full bg-[#111420]/95 backdrop-blur-xl border border-[#1E2640] hover:border-plasma-cyan/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_12px_45px_rgba(0,0,0,0.85)] relative overflow-hidden transition-colors">
            {/* Ambient Cosmic Gradients */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-hyper-violet/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-plasma-cyan/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/35 flex items-center justify-center text-plasma-cyan shrink-0 mt-0.5">
                  <Cookie className="w-5 h-5 text-plasma-cyan" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{t("title")}</span>
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-light">
                    {t("description")}
                  </p>
                </div>
              </div>

              {/* Actions: Accept All, Reject Non-Essential, Manage Preferences */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="py-2.5 px-4 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-[#08090E] text-xs font-black transition-all shadow-[0_0_15px_rgba(0,229,255,0.25)] text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t("acceptAll")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="py-2.5 px-4 rounded-xl bg-[#08090E] hover:bg-[#1E2640] border border-[#1E2640] hover:border-gray-500 text-xs font-bold text-gray-300 hover:text-white transition-all text-center cursor-pointer"
                >
                  {t("rejectNonEssential")}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#1E2640]/50 text-xs font-medium text-gray-400 hover:text-plasma-cyan transition-colors text-center cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{t("managePreferences")}</span>
                </button>
              </div>

              {/* Policy Link */}
              <div className="pt-0.5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <Link
                  href="/legal/cookies"
                  className="hover:text-plasma-cyan transition-colors inline-flex items-center gap-1 text-[11px]"
                >
                  <span>{t("policyLink")}</span>
                  <ExternalLink className="w-3 h-3 text-gray-500" />
                </Link>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Centered Modal Dialog for Cookie Preferences (Via Portal) */}
      {showPreferences && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("preferencesTitle")}
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-void-deep/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowPreferences(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-void-surface border border-plasma-cyan/40 shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(0,229,255,0.2)] relative space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Cosmic Gradients */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-hyper-violet/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-plasma-cyan/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/35 flex items-center justify-center text-plasma-cyan shrink-0">
                  <Settings className="w-5 h-5 text-plasma-cyan" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {t("preferencesTitle")}
                  </h3>
                  <p className="text-[11px] font-mono text-plasma-cyan uppercase tracking-wider">
                    GDPR Art. 7(3) & ePrivacy Compliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-void-deep border border-transparent hover:border-void-border transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-light relative z-10">
              {t("preferencesDescription")}
            </p>

            <div className="space-y-3 pt-1 relative z-10">
              {/* Strictly Necessary */}
              <div className="p-3.5 rounded-xl bg-void-deep/90 border border-void-border flex items-center justify-between gap-3">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Lock className="w-3.5 h-3.5 text-plasma-cyan" />
                    <span>{t("essentialTitle")}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {t("essentialDesc")}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-plasma-cyan/15 border border-plasma-cyan/30 text-plasma-cyan">
                  {t("alwaysActive")}
                </span>
              </div>

              {/* Analytics & Telemetry */}
              <div className="p-3.5 rounded-xl bg-void-deep/90 border border-void-border flex items-center justify-between gap-3">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShieldCheck className="w-3.5 h-3.5 text-hyper-violet" />
                    <span>{t("analyticsTitle")}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {t("analyticsDesc")}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isAnalyticsActive}
                    onChange={(e) => setCustomAnalyticsToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-void-surface border border-void-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-plasma-cyan"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 relative z-10">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-void-deep hover:bg-void-surface border border-void-border hover:border-gray-500 text-xs font-bold text-gray-300 hover:text-white transition-all text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="flex-1 py-3 px-4 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep text-xs font-black transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:shadow-[0_0_25px_rgba(0,229,255,0.55)] text-center cursor-pointer"
              >
                {t("savePreferences")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
