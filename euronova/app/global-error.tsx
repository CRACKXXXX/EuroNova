"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw, RefreshCw } from "lucide-react";
import { reportCrashTelemetry } from "@/lib/telemetry";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global Root Layout Crash Shield.
 * Invoked by Next.js App Router when an unhandled exception occurs inside the
 * root layout, template, or root hydration boundary.
 * Renders an isolated <html> and <body> with full Cosmic Dark Mode styling.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    void reportCrashTelemetry(error, {
      digest: error.digest,
      route: typeof window !== "undefined" ? window.location.pathname : "root-layout",
    });
  }, [error]);

  const handleHardReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#08090E] text-white flex items-center justify-center p-4 antialiased selection:bg-[#00E5FF] selection:text-[#08090E] font-sans">
        {/* Ambient Cosmic Deep-Space Glow */}
        <div
          aria-hidden="true"
          className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#FF2E63]/10 rounded-full blur-[180px]" />
          <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-[#00E5FF]/5 rounded-full blur-[160px]" />
        </div>

        <main className="w-full max-w-lg bg-[#111420] border border-[#1E2640] rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center space-y-6">
          {/* Critical Fault Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#FF2E63]/15 border border-[#FF2E63]/30 flex items-center justify-center text-[#FF2E63] shadow-[0_0_35px_rgba(255,46,99,0.3)]">
            <AlertOctagon className="w-8 h-8" />
          </div>

          {/* Incident Headers */}
          <div className="space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-[#FF2E63]/10 text-[#FF2E63] border border-[#FF2E63]/25">
              ROOT TELEMETRY SHIELD
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cosmic Shield Engaged
            </h1>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              An unexpected anomaly disrupted the root application layout. Our telemetry
              engine has scrubbed all PII and dispatched diagnostics to the control grid.
            </p>
          </div>

          {/* Secure Incident Digest */}
          {error.digest && (
            <div className="bg-[#08090E] border border-[#1E2640] rounded-xl px-4 py-2.5 text-left font-mono text-[11px] text-gray-500 overflow-x-auto">
              <span className="text-gray-400 font-semibold">Incident Digest: </span>
              <span className="text-[#00E5FF] font-medium">{error.digest}</span>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#00E5FF] text-[#08090E] font-extrabold text-sm transition-all duration-300 hover:bg-cyan-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,229,255,0.35)] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recover Session</span>
            </button>

            <button
              type="button"
              onClick={handleHardReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#08090E] hover:bg-[#111420] border border-[#1E2640] hover:border-gray-600 text-gray-300 hover:text-white font-semibold text-sm transition-all duration-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
