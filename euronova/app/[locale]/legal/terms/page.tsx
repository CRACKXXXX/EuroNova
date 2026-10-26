import Link from "next/link";
import { ArrowLeft, Scale, ShieldCheck, Globe, Building, CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const t = await getTranslations("LegalTerms");

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-plasma-cyan/30 bg-plasma-cyan/10 text-plasma-cyan text-xs font-bold uppercase tracking-wider">
              <Scale className="w-4 h-4" />
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
          {/* 1. Purpose */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Globe className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec1Title")}</h2>
            </div>
            <p>
              {t.rich("sec1Desc1", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <p>{t("sec1Desc2")}</p>
          </section>

          {/* 2. User Accounts */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <CheckCircle2 className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec2Title")}</h2>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
              <li><strong>{t("sec2Item1")}</strong> {t("sec2Item1Desc")}</li>
              <li><strong>{t("sec2Item2")}</strong> {t("sec2Item2Desc")}</li>
              <li><strong>{t("sec2Item3")}</strong> {t("sec2Item3Desc")}</li>
            </ul>
          </section>

          {/* 3. Role as Intermediary */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Building className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec3Title")}</h2>
            </div>
            <div className="p-4 rounded-xl bg-void-deep/90 border border-void-border text-xs sm:text-sm space-y-2">
              <p className="font-semibold text-white">
                {t("sec3NoticeTitle")}
              </p>
              <p className="text-gray-300">
                {t.rich("sec3NoticeDesc1", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <p className="text-gray-400">
                {t("sec3NoticeDesc2")}
              </p>
            </div>
          </section>

          {/* 4. External Applications */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Scale className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec4Title")}</h2>
            </div>
            <p className="text-xs sm:text-sm">
              {t.rich("sec4Desc", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </p>
          </section>

          {/* 5. Code of Conduct */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <ShieldCheck className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec5Title")}</h2>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
              <li>{t("sec5Item1")}</li>
              <li>{t("sec5Item2")}</li>
              <li>{t("sec5Item3")}</li>
            </ul>
          </section>

          {/* 6. Intellectual Property */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Scale className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec6Title")}</h2>
            </div>
            <p className="text-xs sm:text-sm">
              {t.rich("sec6Desc", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </section>

          {/* 7. Limitation of Liability */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <ShieldCheck className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec7Title")}</h2>
            </div>
            <p className="text-xs sm:text-sm">{t("sec7Desc")}</p>
          </section>

          {/* 8. Jurisdiction */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Scale className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec8Title")}</h2>
            </div>
            <p className="text-xs sm:text-sm">
              {t.rich("sec8Desc", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <p className="text-xs text-gray-500 font-mono pt-1">
              {t("sec8Contact")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
