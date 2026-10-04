"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const changeLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-2 mt-4 px-2">
      <Globe className="w-4 h-4 text-gray-400" />
      <div className="flex bg-void-surface border border-void-border rounded-lg overflow-hidden">
        <button
          onClick={() => changeLanguage("es")}
          className={`px-3 py-1.5 text-xs font-bold transition-colors ${
            locale === "es"
              ? "bg-plasma-cyan/20 text-plasma-cyan"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ES
        </button>
        <button
          onClick={() => changeLanguage("en")}
          className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-void-border ${
            locale === "en"
              ? "bg-plasma-cyan/20 text-plasma-cyan"
              : "text-gray-400 hover:text-white"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => changeLanguage("de")}
          className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-void-border ${
            locale === "de"
              ? "bg-plasma-cyan/20 text-plasma-cyan"
              : "text-gray-400 hover:text-white"
          }`}
        >
          DE
        </button>
        <button
          onClick={() => changeLanguage("fr")}
          className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-void-border ${
            locale === "fr"
              ? "bg-plasma-cyan/20 text-plasma-cyan"
              : "text-gray-400 hover:text-white"
          }`}
        >
          FR
        </button>
        <button
          onClick={() => changeLanguage("it")}
          className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-void-border ${
            locale === "it"
              ? "bg-plasma-cyan/20 text-plasma-cyan"
              : "text-gray-400 hover:text-white"
          }`}
        >
          IT
        </button>
      </div>
    </div>
  );
}
