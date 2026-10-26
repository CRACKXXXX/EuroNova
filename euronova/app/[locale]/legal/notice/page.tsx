import Link from "next/link";
import { ArrowLeft, Building2, ShieldAlert, FileCode2, Scale, ExternalLink, Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function LegalNoticePage() {
  const t = await getTranslations("LegalNotice");

  return (
    <div className="min-h-screen bg-void-deep text-gray-300">
      <div className="max-w-4xl mx-auto space-y-10 px-4 sm:px-6 lg:px-8 py-12">
        {/* Retorno */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-plasma-cyan" />
            <span>{t("backCommandCenter")}</span>
          </Link>
        </div>

        {/* Cabecera Principal */}
        <div className="relative overflow-hidden rounded-3xl border border-void-border bg-void-surface/90 p-8 sm:p-10 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-hyper-violet/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-hyper-violet/30 bg-hyper-violet/10 text-hyper-violet text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>{t("compliantBadge")}</span>
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
          {/* 1. Service Provider Details */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Building2 className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec1Title")}</h2>
            </div>
            <p>{t("sec1Desc")}</p>
            <div className="bg-void-deep/90 border border-void-border rounded-xl p-5 font-mono text-xs sm:text-sm text-gray-200 space-y-2">
              <p><strong>{t("sec1Entity")}</strong> {t("sec1EntityVal")}</p>
              <p><strong>{t("sec1Email")}</strong> {t("sec1EmailVal")}</p>
              <p><strong>{t("sec1Location")}</strong> {t("sec1LocationVal")}</p>
              <p><strong>{t("sec1Purpose")}</strong> {t("sec1PurposeVal")}</p>
            </div>
          </section>

          {/* 2. Terms of Access */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Globe className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec2Title")}</h2>
            </div>
            <p>{t("sec2Desc")}</p>
          </section>

          {/* 3. Intellectual Property */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <FileCode2 className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec3Title")}</h2>
            </div>
            <p>{t.rich("sec3Desc", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}</p>
          </section>

          {/* 4. External Links */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <ExternalLink className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec4Title")}</h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">{t("sec4Desc")}</p>
          </section>

          {/* 5. Cookies */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <ShieldAlert className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec5Title")}</h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">{t("sec5Desc")}</p>
          </section>

          {/* 6. Jurisdiction */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Scale className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec6Title")}</h2>
            </div>
            <p className="text-xs sm:text-sm">{t.rich("sec6Desc", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
