"use client";

import { Suspense } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { PublicHeader } from "@/components/PublicHeader";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

function ResetPasswordContent() {
  const t = useTranslations("Login");
  const tCommon = useTranslations("Common");

  return (
    <div className="min-h-screen bg-void-deep flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Header Público Fijo */}
      <PublicHeader />

      {/* Efectos Cósmicos de Fondo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-hyper-violet/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-plasma-cyan/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Tarjeta de Acceso con Deep Glassmorphism */}
      <div className="z-10 w-full max-w-md bg-void-surface/60 backdrop-blur-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-void-border rounded-2xl p-6 sm:p-8 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/logo-big.png" 
            alt={tCommon("logoAlt")} 
            width={300} 
            height={80} 
            priority 
            sizes="(max-width: 480px) 100vw, 300px"
            style={{ width: "auto", height: "auto" }}
            className="w-auto h-auto max-w-full drop-shadow-[0_0_25px_rgba(0,229,255,0.15)]" 
          />
          <h2 className="sr-only">EuroNova</h2>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-4 tracking-tight text-center">
            {t("resetPasswordHeading")}
          </h1>
          <p className="text-gray-400 mt-2 text-xs sm:text-sm font-light text-center">
            {t("resetPasswordSubheading")}
          </p>
        </div>

        <ResetPasswordForm />
      </div>

      {/* Browser Translation Tip (2-Line Dedicated Card) */}
      <div className="z-10 w-full max-w-md mt-6 p-4 rounded-xl bg-void-surface/60 border border-void-border/80 backdrop-blur-2xl flex items-start gap-3.5 shadow-2xl">
        <div className="w-9 h-9 rounded-xl bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)] mt-0.5">
          <Globe className="w-4 h-4 text-plasma-cyan animate-pulse" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs sm:text-sm font-bold text-white leading-snug">
            {t("translationTipTitle")}
          </p>
          <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed font-mono">
            {t("translationTipDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void-deep" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

