"use client";

import { useEffect, type ElementType } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { reportCrashTelemetry } from "@/lib/telemetry";

export interface RouteErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  badge?: string;
  description?: string;
  returnHref?: string;
  returnLabel?: string;
  icon?: ElementType;
}

export function RouteErrorBoundary({
  error,
  reset,
  title,
  badge,
  description,
  returnHref = "/dashboard",
  returnLabel,
  icon: Icon = AlertTriangle,
}: RouteErrorBoundaryProps) {
  const t = useTranslations("Errors");

  useEffect(() => {
    void reportCrashTelemetry(error, {
      digest: error.digest,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);

  const displayTitle = title || t("title");
  const displayBadge = badge || t("badge");
  const displayDesc = description || t("description");
  const displayReturnLabel = returnLabel || t("returnHome");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12 relative animate-in fade-in duration-300">
      {/* Ambient Cosmic Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-nova-flare/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="w-full max-w-lg bg-void-surface border border-void-border/90 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center space-y-6">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center text-nova-flare shadow-[0_0_30px_rgba(255,46,99,0.25)]">
          <Icon className="w-8 h-8" />
        </div>

        {/* Header and Details */}
        <div className="space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-nova-flare/10 text-nova-flare border border-nova-flare/20">
            {displayBadge}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-sm text-gray-400 font-light leading-relaxed">
            {displayDesc}
          </p>
        </div>

        {/* Digest Telemetry if available */}
        {error.digest && (
          <div className="bg-void-deep border border-void-border/60 rounded-xl px-4 py-2 text-left font-mono text-[11px] text-gray-400 overflow-x-auto">
            <span className="text-gray-500 font-semibold">{t("digestLabel")}: </span>
            <span className="text-plasma-cyan/90">{error.digest}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-plasma-cyan text-void-deep font-extrabold text-sm transition-all duration-200 hover:bg-cyan-300 active:scale-95 shadow-[0_0_20px_rgba(0,229,255,0.35)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t("tryAgain")}</span>
          </button>

          {returnHref && (
            <Link
              href={returnHref}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-void-deep hover:bg-void-surface border border-void-border hover:border-gray-500 text-gray-300 hover:text-white font-semibold text-sm transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
              <span>{displayReturnLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
