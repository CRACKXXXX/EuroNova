"use client";

import { useState, useRef, useEffect, useTransition, Suspense } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, routing } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

type AppLocale = (typeof routing.locales)[number];

interface LanguageOption {
  code: AppLocale;
  label: string;
  short: string;
  flagUrl: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "es", label: "Español", short: "ES", flagUrl: "https://flagcdn.com/w20/es.png" },
  { code: "en", label: "English", short: "EN", flagUrl: "https://flagcdn.com/w20/gb.png" },
  { code: "de", label: "Deutsch", short: "DE", flagUrl: "https://flagcdn.com/w20/de.png" },
  { code: "fr", label: "Français", short: "FR", flagUrl: "https://flagcdn.com/w20/fr.png" },
  { code: "it", label: "Italiano", short: "IT", flagUrl: "https://flagcdn.com/w20/it.png" },
  { code: "ru", label: "Русский", short: "RU", flagUrl: "https://flagcdn.com/w20/ru.png" },
  { code: "pt", label: "Português", short: "PT", flagUrl: "https://flagcdn.com/w20/pt.png" },
];

function setLocaleCookie(locale: string) {
  if (typeof document !== "undefined") {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

function LanguageSwitcherInner() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[1];

  const changeLanguage = (newLocale: AppLocale) => {
    setIsOpen(false);
    if (newLocale === locale) return;

    // Explicitly update NEXT_LOCALE cookie on client side (1 year expiration)
    setLocaleCookie(newLocale);

    // Reconstruct full path preserving query parameters
    const queryString = searchParams?.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.replace(targetUrl, { locale: newLocale });
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0 select-none" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isPending}
        className={`flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg bg-void-surface hover:bg-void-surface/90 border border-void-border hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none text-xs font-bold text-gray-200 transition-all shrink-0 cursor-pointer ${
          isPending ? "opacity-70 pointer-events-none" : ""
        }`}
        aria-label={t("selectLanguage")}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 text-plasma-cyan animate-spin" />
        ) : (
          <Image
            src={currentLang.flagUrl}
            alt={currentLang.short}
            width={16}
            height={12}
            unoptimized
            style={{ width: "auto", height: "auto" }}
            className="w-4 h-auto rounded-[2px]"
          />
        )}
        <span>{currentLang.short}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 bg-void-surface border border-void-border rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              disabled={isPending}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-xs font-semibold text-left transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none ${
                locale === lang.code
                  ? "bg-plasma-cyan/15 text-plasma-cyan font-bold"
                  : "text-gray-300 hover:bg-void-deep hover:text-white"
              }`}
            >
              <Image
                src={lang.flagUrl}
                alt={lang.label}
                width={16}
                height={12}
                unoptimized
                style={{ width: "auto", height: "auto" }}
                className="w-4 h-auto rounded-[2px]"
              />
              <span className="flex-1">{lang.label}</span>
              <span className="text-[10px] text-gray-500 font-mono uppercase">
                {lang.short}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg bg-void-surface border border-void-border text-xs font-bold text-gray-400 shrink-0">
          <span className="w-4 h-3 bg-void-border rounded animate-pulse" />
          <span>--</span>
        </div>
      }
    >
      <LanguageSwitcherInner />
    </Suspense>
  );
}
