"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Bulletproof Scroll Restoration for Next.js App Router.
 * Saves vertical scroll position per unique route in sessionStorage.
 * Restores exact pixel position upon history back/forward navigation.
 */
export function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullUrl = `${pathname}${searchParams ? `?${searchParams.toString()}` : ""}`;
  const isPopStateRef = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      isPopStateRef.current = true;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Guarantee that navigating to any route always releases leftover body scroll-lock traps
  useEffect(() => {
    if (typeof document !== "undefined" && document.body.style.overflow === "hidden") {
      document.body.style.overflow = "";
    }
  }, [pathname]);

  useEffect(() => {
    const key = `euronova_scroll_${fullUrl}`;

    // If navigating back, restore position
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        const targetY = parseInt(saved, 10);
        if (!isNaN(targetY)) {
          // Multiple frames to guarantee restoration even while dynamic project cards hydrate
          let count = 0;
          const restore = () => {
            window.scrollTo({ top: targetY, behavior: "instant" });
            count++;
            if (count < 6) {
              requestAnimationFrame(restore);
            }
          };
          requestAnimationFrame(restore);
        }
      }
    }

    // Save position on scroll (throttled)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (typeof window !== "undefined") {
          sessionStorage.setItem(key, window.scrollY.toString());
        }
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [fullUrl]);

  return null;
}
