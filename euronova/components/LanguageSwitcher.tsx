"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "es", label: "Español", short: "ES", flagUrl: "https://flagcdn.com/w20/es.png" },
  { code: "en", label: "English", short: "EN", flagUrl: "https://flagcdn.com/w20/gb.png" },
  { code: "de", label: "Deutsch", short: "DE", flagUrl: "https://flagcdn.com/w20/de.png" },
  { code: "fr", label: "Français", short: "FR", flagUrl: "https://flagcdn.com/w20/fr.png" },
  { code: "it", label: "Italiano", short: "IT", flagUrl: "https://flagcdn.com/w20/it.png" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[1];

  const changeLanguage = (newLocale: string) => {
    setIsOpen(false);
    router.replace(pathname, { locale: newLocale });
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-void-surface hover:bg-void-surface/90 border border-void-border hover:border-plasma-cyan text-xs font-bold text-gray-200 transition-all shrink-0 cursor-pointer"
        aria-label="Select Language"
      >
        <img
          src={currentLang.flagUrl}
          alt={currentLang.short}
          className="w-4 h-auto rounded-[2px]"
        />
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
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                locale === lang.code
                  ? "bg-plasma-cyan/15 text-plasma-cyan font-bold"
                  : "text-gray-300 hover:bg-void-deep hover:text-white"
              }`}
            >
              <img
                src={lang.flagUrl}
                alt={lang.label}
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
