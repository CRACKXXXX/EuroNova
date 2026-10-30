"use client";

import { toast } from "sonner";

export const RATE_LIMIT_TOAST_ID = "rate-limit-toast";

/**
 * Dispatches a global rate limit event across the window and triggers a deduplicated Sonner toast.
 */
export function notifyRateLimitExceeded(customMessage?: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("euronova:rate-limited", {
        detail: { message: customMessage },
      })
    );
  }
}

/**
 * Checks if a response object represents a rate limit exceeded error,
 * and triggers visual warning feedback if so.
 */
export function isRateLimitError(res: unknown): boolean {
  if (!res || typeof res !== "object") return false;
  const candidate = res as { error?: string; errorCode?: string };
  return candidate.error === "RATE_LIMIT_EXCEEDED" || candidate.errorCode === "RATE_LIMITED";
}

/**
 * Helper to display the rate limit warning toast with deduplication.
 */
export function showRateLimitToast(message: string): void {
  toast.warning(message, {
    id: RATE_LIMIT_TOAST_ID,
    icon: "⏳",
    duration: 5000,
  });
}

