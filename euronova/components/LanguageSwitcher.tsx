"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "es", label: "ES", flagUrl: "https://flagcdn.com/w20/es.png" },
  { code: "en", label: "EN", flagUrl: "https://flagcdn.com/w20/gb.png" },
  { code: "de", label: "DE", flagUrl: "https://flagcdn.com/w20/de.png" },
  { code: "fr", label: "FR", flagUrl: "https://flagcdn.com/w20/fr.png" },
  { code: "it", label: "IT", flagUrl: "https://flagcdn.com/w20/it.png" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const changeLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-2 mt-4 px-2">
      <Globe className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex bg-void-surface border border-void-border rounded-lg overflow-hidden flex-wrap">
        {LANGUAGES.map((lang, index) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${index !== 0 ? 'border-l border-void-border' : ''} ${
              locale === lang.code
                ? "bg-plasma-cyan/20 text-plasma-cyan"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <img src={lang.flagUrl} alt={lang.label} className="w-4 h-auto rounded-[2px]" />
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
