import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Database, FileText, UserCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("LegalPrivacy");

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
              <Shield className="w-4 h-4" />
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
          {/* 1. Controller */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <UserCheck className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec1Title")}</h2>
            </div>
            <p>
              {t.rich("sec1Desc", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <ul className="list-disc pl-6 space-y-1.5 font-mono text-xs sm:text-sm text-gray-300">
              <li><strong>{t("sec1Entity")}</strong> {t("sec1EntityVal")}</li>
              <li><strong>{t("sec1Email")}</strong> {t("sec1EmailVal")}</li>
              <li><strong>{t("sec1Location")}</strong> {t("sec1LocationVal")}</li>
            </ul>
          </section>

          {/* 2. Collected Data */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Database className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec2Title")}</h2>
            </div>
            <p>{t("sec2Desc")}</p>
            <div className="space-y-3 pt-1">
              <div className="p-4 rounded-xl bg-void-deep/90 border border-void-border">
                <h3 className="font-bold text-white text-sm">{t("sec2GroupATitle")}</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  {t("sec2GroupADesc")}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-void-deep/90 border border-void-border">
                <h3 className="font-bold text-white text-sm">{t("sec2GroupBTitle")}</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  {t("sec2GroupBDesc")}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-void-deep/90 border border-void-border">
                <h3 className="font-bold text-white text-sm">{t("sec2GroupCTitle")}</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  {t("sec2GroupCDesc")}
                </p>
              </div>
            </div>
          </section>

          {/* 3. Legal Basis */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <FileText className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec3Title")}</h2>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
              <li><strong>{t("sec3Basis1")}</strong> {t("sec3Basis1Desc")}</li>
              <li><strong>{t("sec3Basis2")}</strong> {t("sec3Basis2Desc")}</li>
              <li><strong>{t("sec3Basis3")}</strong> {t("sec3Basis3Desc")}</li>
            </ul>
          </section>

          {/* 4. Data Retention */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Lock className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec4Title")}</h2>
            </div>
            <p>{t("sec4Desc")}</p>
            <div className="p-4 rounded-xl bg-nova-flare/10 border border-nova-flare/30 text-xs sm:text-sm text-gray-300">
              <strong className="text-white block mb-1">{t("sec4WipeTitle")}</strong>
              <span>
                {t.rich("sec4WipeDesc", {
                  em: (chunks) => <em>{chunks}</em>,
                })}
              </span>
            </div>
          </section>

          {/* 5. Recipients */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <Eye className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec5Title")}</h2>
            </div>
            <p>{t("sec5Desc")}</p>
            <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm">
              <li><strong>{t("sec5Sub1")}</strong> {t("sec5Sub1Desc")}</li>
              <li><strong>{t("sec5Sub2")}</strong> {t("sec5Sub2Desc")}</li>
            </ul>
          </section>

          {/* 6. User Rights */}
          <section className="bg-void-surface/60 border border-void-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold text-lg sm:text-xl border-b border-void-border/70 pb-3">
              <UserCheck className="w-5 h-5 text-plasma-cyan" />
              <h2 className="text-plasma-cyan">{t("sec6Title")}</h2>
            </div>
            <p>{t("sec6Desc")}</p>
            <div className="bg-void-deep/90 border border-void-border rounded-xl p-4 font-mono text-xs sm:text-sm text-plasma-cyan space-y-1">
              <p>{t("sec6Instruction")}</p>
              <p><strong>{t("sec1Email")}</strong> {t("sec1EmailVal")}</p>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              {t("sec6AepdNotice")}{" "}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noreferrer"
                className="underline text-plasma-cyan"
              >
                {t("sec6AepdUrl")}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
