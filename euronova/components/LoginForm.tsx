"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { login } from "@/app/[locale]/login/actions";
import { useTranslations } from "next-intl";
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface LoginFormProps {
  onToggleView?: () => void;
}

const subscribe = () => () => {};

export function LoginForm({ onToggleView }: LoginFormProps) {
  const router = useRouter();
  const t = useTranslations("Login");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await login(null, formData);
        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          setShowToast(true);
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 850);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred during authentication.");
      }
    });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            {t("email")}
          </label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            {t("password")}
          </label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
            placeholder={t("passwordPlaceholder")}
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-nova-flare/15 border border-nova-flare/50 text-nova-flare font-semibold text-xs flex items-center gap-2.5 animate-in zoom-in-95 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Morphing Cosmic Submit Button */}
        <button
          type="submit"
          disabled={isPending || showToast}
          className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer text-void-deep ${
            isPending || showToast
              ? "bg-plasma-cyan text-void-deep shadow-[0_0_25px_rgba(0,229,255,0.6)] animate-pulse scale-[0.99]"
              : "bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:scale-[1.01] active:scale-[0.99]"
          } disabled:cursor-not-allowed`}
        >
          {isPending || showToast ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin text-void-deep shrink-0" />
              <span className="tracking-wide text-sm font-extrabold">
                {t("loggingIn")}
              </span>
            </>
          ) : (
            <>
              <span>{t("loginBtn")}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </>
          )}
        </button>

        {onToggleView && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onToggleView}
              className="text-gray-400 hover:text-plasma-cyan text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {t("noAccount")}
            </button>
          </div>
        )}
      </form>

      {/* Cosmic Glassmorphism Success Toast */}
      {showToast && mounted && createPortal(
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-top-5 duration-500">
          <div className="bg-void-surface/90 border border-plasma-cyan/60 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_0_35px_rgba(0,229,255,0.3)] flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-plasma-cyan/20 border border-plasma-cyan/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              <CheckCircle2 className="w-5 h-5 text-plasma-cyan animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-plasma-cyan">
                {t("transmissionConfirmed")}
              </p>
              <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                {t("loginSuccess")}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
