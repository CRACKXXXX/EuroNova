"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { reportCrashTelemetry } from "@/lib/telemetry";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations("Errors");

  useEffect(() => {
    void reportCrashTelemetry(error, {
      digest: error.digest,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative">
      {/* Ambient Cosmic Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-nova-flare/10 rounded-full blur-[180px] pointer-events-none -z-10" />

      <div className="w-full max-w-lg bg-void-surface/90 border border-void-border/80 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center text-nova-flare shadow-[0_0_30px_rgba(255,46,99,0.25)]">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Header and Details */}
        <div className="space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-nova-flare/10 text-nova-flare border border-nova-flare/20">
            {t("badge")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-400 font-light leading-relaxed">
            {t("description")}
          </p>
        </div>

        {/* Digest Telemetry if available */}
        {error.digest && (
          <div className="bg-void-deep/80 border border-void-border/50 rounded-xl px-4 py-2.5 text-left font-mono text-[11px] text-gray-500 overflow-x-auto">
            <span className="text-gray-400 font-semibold">{t("digestLabel")}: </span>
            <span className="text-plasma-cyan/90">{error.digest}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-plasma-cyan text-void-surface font-extrabold text-sm transition-all duration-300 hover:bg-cyan-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,229,255,0.35)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t("tryAgain")}</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-void-surface hover:bg-void-deep border border-void-border hover:border-gray-600 text-gray-300 hover:text-white font-semibold text-sm transition-all duration-200 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{t("returnHome")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
