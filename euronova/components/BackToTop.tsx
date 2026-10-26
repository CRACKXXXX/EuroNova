"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const t = useTranslations("Common");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={t("backToTop")}
      className="fixed bottom-6 right-6 z-50 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-void-surface/80 hover:bg-void-surface text-plasma-cyan border border-plasma-cyan/40 hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none shadow-[0_0_20px_rgba(0,229,255,0.25)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] backdrop-blur-xl transition-all duration-300 group cursor-pointer hover:scale-110 active:scale-95 animate-in fade-in zoom-in-75"
    >
      <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
