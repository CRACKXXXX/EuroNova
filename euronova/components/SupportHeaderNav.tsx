"use client";

import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Home, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export function SupportHeaderNav() {
  const router = useRouter();
  const tCommon = useTranslations("Common");
  const tHeader = useTranslations("Header");

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 flex flex-wrap items-center justify-between gap-4">
      {/* Botón interactivo Volver Atrás */}
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-void-surface/80 hover:bg-void-surface border border-void-border/80 hover:border-plasma-cyan/50 text-xs font-semibold text-gray-300 hover:text-white transition-all shadow-sm group cursor-pointer"
        aria-label={tCommon("goBack")}
      >
        <ArrowLeft className="w-3.5 h-3.5 text-plasma-cyan transition-transform group-hover:-translate-x-0.5" />
        <span>{tCommon("goBack")}</span>
      </button>

      {/* Rastro de Migas de Pan (Breadcrumbs) */}
      <nav aria-label={tCommon("breadcrumb")} className="flex items-center gap-2 text-xs text-gray-400 font-medium">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-plasma-cyan transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>{tHeader("home")}</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <span className="text-gray-200 font-semibold" aria-current="page">
          {tHeader("supportEuroNova")}
        </span>
      </nav>
    </div>
  );
}
