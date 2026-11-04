"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { login } from "@/app/[locale]/login/actions";
import { useTranslations } from "next-intl";
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { createClient } from "@/utils/supabase/client";

interface LoginFormProps {
  onToggleView?: () => void;
  onForgotPassword?: () => void;
}

const subscribe = () => () => {};

export function LoginForm({ onToggleView, onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Login");
  const tErrors = useTranslations("Errors");
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { isGranted } = useCookieConsent();

  const handleGoogleLogin = async () => {
    // Strict GDPR / ePrivacy Compliance Check:
    // Block OAuth until consent has been granted to prevent illegal third-party telemetry / cross-origin cookies
    if (!isGranted) {
      window.dispatchEvent(new CustomEvent("euronova:open-cookie-preferences"));
      toast.warning(t("cookieConsentRequired"), {
        id: "cookie-oauth-blocker",
        icon: "🍪",
        duration: 5000,
      });
      return;
    }

    try {
      setIsGooglePending(true);
      setError(null);
      const supabase = createClient();
      const nextUrl = searchParams?.get("next") || "/dashboard";

      // Set short-lived destination cookie before redirect to ensure clean OAuth URL
      document.cookie = `euronova_auth_next=${encodeURIComponent(nextUrl)}; path=/; max-age=3600; SameSite=Lax`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthError) {
        setIsGooglePending(false);
        setError(oauthError.message);
        toast.error(oauthError.message);
      }
    } catch (err: unknown) {
      setIsGooglePending(false);
      const msg = err instanceof Error ? err.message : t("unexpectedError");
      setError(msg);
      toast.error(msg);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await login(null, formData);
        if (result?.error) {
          if (result.error === "RATE_LIMIT_EXCEEDED") {
            toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
            setError(tErrors("rateLimitExceeded"));
          } else if (
            result.error === "ERR_EMAIL_NOT_CONFIRMED" ||
            result.error.toLowerCase().includes("email not confirmed")
          ) {
            toast.error(t("errEmailNotConfirmed"), { id: "email-not-confirmed-toast", icon: "✉️" });
            setError(t("errEmailNotConfirmed"));
          } else if (
            result.error === "ERR_INVALID_CREDENTIALS" ||
            result.error.toLowerCase().includes("invalid login credentials")
          ) {
            setError(t("errInvalidCredentials"));
          } else {
            setError(result.error);
          }
        } else if (result?.success) {
          setShowToast(true);
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 850);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("unexpectedError"));
      }
    });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
      >
        {searchParams?.get("registered") === "true" && (
          <div className="p-4 rounded-xl bg-rup-emerald/15 border border-rup-emerald/50 text-rup-emerald font-medium text-xs flex items-start gap-2.5 animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-rup-emerald" />
            <div className="space-y-0.5">
              <p className="font-bold">{t("signupCheckEmailTitle")}</p>
              <p className="text-gray-300 leading-relaxed">{t("signupCheckEmailSuccess")}</p>
            </div>
          </div>
        )}

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
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">
              {t("password")}
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-plasma-cyan hover:underline transition-colors cursor-pointer"
              >
                {t("forgotPassword")}
              </button>
            )}
          </div>
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

      {/* Social OAuth Section with Strict Zero-Bypass GDPR Blocker */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-void-border"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-void-surface px-2.5 text-gray-400 font-medium">{t("orContinueWith")}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleGoogleLogin}
          aria-disabled={!isGranted || isGooglePending}
          disabled={isGooglePending}
          className={`w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md ${
            !isGranted
              ? "bg-void-deep/60 border border-void-border/60 text-gray-400 opacity-60 cursor-not-allowed hover:border-nova-flare/40"
              : isGooglePending
              ? "bg-void-deep/80 border border-plasma-cyan text-plasma-cyan cursor-wait"
              : "bg-void-deep/80 border border-void-border hover:border-gray-400 hover:bg-void-deep text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer"
          }`}
        >
          {isGooglePending ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin text-plasma-cyan shrink-0" />
              <span>{t("loggingIn")}</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{t("google")}</span>
            </>
          )}
          {!isGranted && !isGooglePending && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-void-border/60 text-gray-400 border border-void-border">
              <Lock className="w-2.5 h-2.5 text-plasma-cyan" />
              <span>{t("cookiesRequired")}</span>
            </span>
          )}
        </button>

        {!isGranted && (
          <p className="text-[11px] text-center text-gray-400 font-mono">
            {t("cookieConsentNotice")}{" "}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("euronova:open-cookie-preferences"));
              }}
              className="text-plasma-cyan hover:underline cursor-pointer font-semibold inline-flex items-center gap-0.5"
            >
              {t("manageCookiePreferences")}
            </button>
          </p>
        )}
      </div>

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
