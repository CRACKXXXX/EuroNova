"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/app/[locale]/login/actions";
import { useTranslations } from "next-intl";
import { Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const t = useTranslations("Login");
  const tErrors = useTranslations("Errors");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    // Set destination cookie to ensure the user lands on /reset-password upon return
    document.cookie = `euronova_auth_next=${encodeURIComponent("/reset-password")}; path=/; max-age=3600; SameSite=Lax`;

    startTransition(async () => {
      try {
        const result = await requestPasswordReset(null, formData);
        if (result?.error) {
          if (result.error === "RATE_LIMIT_EXCEEDED") {
            toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
            setError(tErrors("rateLimitExceeded"));
          } else {
            setError(result.error);
          }
        } else if (result?.success) {
          setIsSubmitted(true);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("unexpectedError"));
      }
    });
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center py-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/40 flex items-center justify-center shadow-[0_0_25px_rgba(0,229,255,0.25)]">
          <CheckCircle2 className="w-8 h-8 text-plasma-cyan animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {t("resetEmailSentTitle")}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed max-w-sm mx-auto">
            {t("resetEmailSentDesc")}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-void-deep/80 border border-void-border hover:border-plasma-cyan hover:text-plasma-cyan text-white shadow-md cursor-pointer text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("backToLogin")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          {t("email")}
        </label>
        <div className="relative">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all text-sm"
            placeholder={t("emailPlaceholder")}
          />
          <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
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
        disabled={isPending}
        className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer text-void-deep ${
          isPending
            ? "bg-plasma-cyan text-void-deep shadow-[0_0_25px_rgba(0,229,255,0.6)] animate-pulse scale-[0.99]"
            : "bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:scale-[1.01] active:scale-[0.99]"
        } disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <>
            <Sparkles className="w-5 h-5 animate-spin text-void-deep shrink-0" />
            <span className="tracking-wide text-sm font-extrabold">
              {t("sendingResetLink")}
            </span>
          </>
        ) : (
          <span>{t("sendResetLink")}</span>
        )}
      </button>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-gray-400 hover:text-plasma-cyan text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t("backToLogin")}</span>
        </button>
      </div>
    </form>
  );
}
