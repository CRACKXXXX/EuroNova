"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function PublicHeader() {
  const t = useTranslations("Common");

  return (
    <header className="fixed top-0 left-0 right-0 w-full h-20 bg-void-deep/80 backdrop-blur-2xl border-b border-void-border/70 z-50 transition-all">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6 sm:px-8 lg:px-12">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          aria-label={t("homeAriaLabel")}
          className="flex items-center gap-3 group min-h-[44px] min-w-[44px] rounded-lg focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none"
        >
          <div className="hidden sm:block">
            <Image
              src="/logo-big.png"
              alt={t("logoAlt")}
              width={150}
              height={40}
              priority
              sizes="(max-width: 640px) 38px, 150px"
              style={{ width: "auto", height: "auto" }}
              className="h-10 w-auto object-contain rounded-md group-hover:scale-105 transition-transform drop-shadow-[0_0_20px_rgba(0,229,255,0.25)]"
            />
          </div>
          <div className="block sm:hidden">
            <Image
              src="/logo-small.png"
              alt={t("logoAlt")}
              width={38}
              height={38}
              priority
              sizes="38px"
              style={{ width: "auto", height: "auto" }}
              className="h-9 w-auto object-contain rounded-md group-hover:scale-110 transition-transform"
            />
          </div>
        </Link>

        {/* Right: Language Switcher */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
