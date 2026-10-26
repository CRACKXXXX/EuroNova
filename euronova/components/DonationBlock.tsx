"use client";

import { useState } from "react";
import { Heart, Server, Copy, Check, ExternalLink, ShieldCheck, Sparkles, Scale, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export function DonationBlock() {
  const t = useTranslations("DonationBlock");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  const IBAN_NUMBER = "ES9021004216502200161934";
  const REVOLUT_URL = "https://revolut.me/joelrodjur";
  const PAYPAL_URL = "https://www.paypal.me/JOELRJPAYPAL";

  return (
    <section id="donations" className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Ambient background glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center">
        <div className="w-[500px] h-[300px] bg-hyper-violet/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-[400px] h-[250px] bg-plasma-cyan/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="bg-void-surface/90 border border-void-border/80 hover:border-plasma-cyan/40 rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-300">
        {/* Top Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-void-border/60">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("freeBadge")}</span>
          </div>

          <div className="inline-flex items-center gap-2 text-xs text-gray-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-rup-emerald" />
            <span>{t("developerProject")}</span>
          </div>
        </div>

        {/* Header & Story */}
        <div className="max-w-3xl mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>{t("supportTitle")}</span>
            <Heart className="w-7 h-7 text-nova-flare fill-nova-flare/20 shrink-0 animate-pulse" />
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed">
            {t("story1")}
          </p>
          <p className="mt-2.5 text-xs sm:text-sm text-gray-400 leading-relaxed">
            {t.rich("story2", {
              strong: (chunks) => <strong className="text-white">{chunks}</strong>,
            })}
          </p>
        </div>

        {/* Donation Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Channel 1: SEPA IBAN */}
          <div className="bg-void-deep/90 border border-void-border hover:border-plasma-cyan/50 rounded-2xl p-6 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-plasma-cyan font-mono">
                  {t("sepaBadge")}
                </span>
                <Server className="w-4 h-4 text-gray-500 group-hover:text-plasma-cyan transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{t("sepaTitle")}</h3>
              <p className="text-xs text-gray-400 mb-4 leading-snug">
                {t("sepaDesc")}
              </p>
              <div className="bg-void-surface px-3 py-2 rounded-xl border border-void-border font-mono text-xs text-gray-200 select-all break-all">
                {IBAN_NUMBER}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(IBAN_NUMBER, "iban")}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-void-surface hover:bg-plasma-cyan/15 border border-void-border hover:border-plasma-cyan/40 text-xs font-bold text-white hover:text-plasma-cyan transition-all cursor-pointer"
            >
              {copiedKey === "iban" ? (
                <>
                  <Check className="w-4 h-4 text-rup-emerald" />
                  <span className="text-rup-emerald">{t("ibanCopied")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t("copyIban")}</span>
                </>
              )}
            </button>
          </div>

          {/* Channel 2: Revolut */}
          <div className="bg-void-deep/90 border border-void-border hover:border-hyper-violet/50 rounded-2xl p-6 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-hyper-violet font-mono">
                  {t("revolutBadge")}
                </span>
                <span className="text-xs font-mono text-gray-400">@joelrodjur</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{t("revolutTitle")}</h3>
              <p className="text-xs text-gray-400 mb-4 leading-snug">
                {t("revolutDesc")}
              </p>
              <div className="bg-void-surface px-3 py-2 rounded-xl border border-void-border font-mono text-xs text-gray-300 truncate">
                revolut.me/joelrodjur
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <a
                href={REVOLUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-hyper-violet/20 hover:bg-hyper-violet/30 border border-hyper-violet/40 text-xs font-bold text-white transition-all text-center"
              >
                <span>{t("openRevolut")}</span>
                <ExternalLink className="w-3.5 h-3.5 text-hyper-violet" />
              </a>
              <button
                type="button"
                onClick={() => handleCopy("revolut.me/joelrodjur", "revolut")}
                className="p-2.5 rounded-xl bg-void-surface hover:bg-hyper-violet/15 border border-void-border hover:border-hyper-violet/40 text-gray-300 hover:text-white transition-all"
                title={t("copyRevolut")}
              >
                {copiedKey === "revolut" ? (
                  <Check className="w-4 h-4 text-rup-emerald" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Channel 3: PayPal */}
          <div className="bg-void-deep/90 border border-void-border hover:border-nova-flare/50 rounded-2xl p-6 flex flex-col justify-between transition-all group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-nova-flare font-mono">
                  {t("paypalBadge")}
                </span>
                <Heart className="w-4 h-4 text-gray-500 group-hover:text-nova-flare transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{t("paypalTitle")}</h3>
              <p className="text-xs text-gray-400 mb-4 leading-snug">
                {t("paypalDesc")}
              </p>
              <div className="bg-void-surface px-3 py-2 rounded-xl border border-void-border font-mono text-xs text-gray-300 truncate">
                paypal.me/JOELRJPAYPAL
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <a
                href={PAYPAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-nova-flare/20 hover:bg-nova-flare/30 border border-nova-flare/40 text-xs font-bold text-white transition-all text-center"
              >
                <span>{t("donatePaypal")}</span>
                <ExternalLink className="w-3.5 h-3.5 text-nova-flare" />
              </a>
              <button
                type="button"
                onClick={() => handleCopy(PAYPAL_URL, "paypal")}
                className="p-2.5 rounded-xl bg-void-surface hover:bg-nova-flare/15 border border-void-border hover:border-nova-flare/40 text-gray-300 hover:text-white transition-all"
                title={t("copyPaypal")}
              >
                {copiedKey === "paypal" ? (
                  <Check className="w-4 h-4 text-rup-emerald" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Immutable P2P Fiscal & Legal Shield */}
        <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-void-deep/80 border border-void-border/90 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-hyper-violet/10 border border-hyper-violet/30 text-hyper-violet shrink-0 mt-0.5">
              <Scale className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-gray-200 tracking-wide">
                  {t("fiscalShieldTitle")}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-void-surface border border-void-border text-[10px] font-mono text-gray-400">
                  <ShieldAlert className="w-3 h-3 text-nova-flare" />
                  <span>{t("nonCommercialTag")}</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed font-light">
                {t("fiscalShieldDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-void-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 text-center sm:text-left">
          <span>
            {t("footerCommitment")}
          </span>
          <span className="font-mono text-plasma-cyan shrink-0">
            {t("footerThanks")}
          </span>
        </div>
      </div>
    </section>
  );
}
