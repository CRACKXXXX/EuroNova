"use client";

import { useSyncExternalStore, useCallback } from "react";

export type CookieConsentStatus = "granted" | "accepted" | "necessary_only" | "denied" | "rejected" | null;

/**
 * Checks whether cookie consent has been granted (e.g. "granted", "accepted", or "necessary_only").
 * Strict fail-closed under GDPR and ePrivacy Directive: returns false if not explicitly granted.
 */
export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = localStorage.getItem("euronova_cookie_consent");
    return val === "granted" || val === "accepted" || val === "necessary_only";
  } catch {
    return false;
  }
}

function getConsentSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("euronova_cookie_consent");
  } catch {
    return null;
  }
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

/**
 * Custom React hook for reactive Cookie Consent state management.
 * Integrates with CookieBanner and CookieConsentGatekeeper custom events.
 */
export function useCookieConsent() {
  const rawStatus = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    () => null
  );

  const isGranted = rawStatus === "granted" || rawStatus === "accepted" || rawStatus === "necessary_only";
  const isExplicitlyDenied = rawStatus === "denied" || rawStatus === "rejected";
  const isPendingConsent = rawStatus === null;

  const openPreferences = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("euronova:open-cookie-preferences"));
    }
  }, []);

  const saveConsent = useCallback((choice: "granted" | "necessary_only" | "denied") => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("euronova_cookie_consent", choice);
      document.cookie = `euronova_consent=${choice}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("euronova:consent-changed", { detail: { choice } }));
    } catch (e) {
      console.error("Failed to save cookie consent:", e);
    }
  }, []);

  return {
    rawStatus,
    isGranted,
    isExplicitlyDenied,
    isPendingConsent,
    openPreferences,
    saveConsent,
  };
}

