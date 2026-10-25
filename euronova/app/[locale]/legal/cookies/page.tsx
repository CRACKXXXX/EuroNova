"use client";

import { Link } from "@/i18n/routing";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Cookie, ShieldCheck, Lock, Sliders, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CookiesPolicyPage() {
  const t = useTranslations("LegalCookies");

  const handleOpenPreferences = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("euronova:open-cookie-preferences"));
    }
  };

  return (
    <div className="min-h-screen bg-void-deep text-gray-300">
      <div className="max-w-4xl mx-auto space-y-10 px-4 sm:px-6 lg:px-8 py-12">
        {/* Enlace de Retorno */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-plasma-cyan" />
            <span>{t("backHome")}</span>
          </Link>
        </div>

        {/* Cabecera Principal */}
        <div className="relative overflow-hidden rounded-3xl border border-void-border bg-void-surface/90 p-8 sm:p-10 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-hyper-violet/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rup-emerald/30 bg-rup-emerald/10 text-rup-emerald text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>{t("badge")}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {t.rich("title", {
                accent: (chunks) => <span className="text-plasma-cyan">{chunks}</span>,
              })}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              {t("subtitle")}
            </p>
            <div className="text-xs text-gray-500 font-mono pt-2">
              {t("lastUpdated")}
            </div>
          </div>
        </div>

        {/* Contenido Legal Estructurado */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed">
          {/* 1. What are cookies? */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Cookie className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec1Title")}</h2>
            </div>
            <p>
              {t.rich("sec1Desc", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </section>

          {/* 2. Strictly Necessary Technical Cookies */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Lock className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec2Title")}</h2>
            </div>
            <p>{t("sec2Desc")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border border-void-border rounded-xl overflow-hidden">
                <thead className="bg-void-deep text-plasma-cyan uppercase tracking-wider text-[11px] font-mono">
                  <tr>
                    <th className="p-3 border-b border-void-border">{t("colType")}</th>
                    <th className="p-3 border-b border-void-border">{t("colFunction")}</th>
                    <th className="p-3 border-b border-void-border">{t("colService")}</th>
                    <th className="p-3 border-b border-void-border">{t("colRetention")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-void-border/60 bg-void-surface/40 text-gray-300">
                  <tr>
                    <td className="p-3 font-bold text-white">{t("row1Type")}</td>
                    <td className="p-3 text-gray-300">{t("row1Function")}</td>
                    <td className="p-3 text-gray-400">{t("row1Service")}</td>
                    <td className="p-3 text-gray-400">{t("row1Retention")}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">{t("row2Type")}</td>
                    <td className="p-3 text-gray-300">{t("row2Function")}</td>
                    <td className="p-3 text-gray-400">{t("row2Service")}</td>
                    <td className="p-3 text-gray-400">{t("row2Retention")}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-white">{t("row3Type")}</td>
                    <td className="p-3 text-gray-300">{t("row3Function")}</td>
                    <td className="p-3 text-gray-400">{t("row3Service")}</td>
                    <td className="p-3 text-gray-400">{t("row3Retention")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Optional Telemetry */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <ShieldCheck className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec3Title")}</h2>
            </div>
            <p>
              {t.rich("sec3Desc", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </p>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-void-deep border border-void-border text-xs text-gray-300">
              <CheckCircle2 className="w-5 h-5 text-rup-emerald shrink-0" />
              <span>
                {t.rich("sec3Notice", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </span>
            </div>
          </section>

          {/* 4. Active Revocation */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Sliders className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec4Title")}</h2>
            </div>
            <p>
              {t.rich("sec4Desc", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenPreferences}
                className="py-2.5 px-4 rounded-xl bg-void-deep hover:bg-void-surface border border-plasma-cyan/50 text-plasma-cyan text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Sliders className="w-4 h-4" />
                <span>{t("openPreferencesBtn")}</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Global Minimalist Footer & Gatekeeper Modal */}
      <Footer />
    </div>
  );
}
