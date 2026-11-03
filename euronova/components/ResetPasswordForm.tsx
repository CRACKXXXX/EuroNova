"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, CheckCircle2, AlertCircle, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const router = useRouter();
  const t = useTranslations("Login");
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const verifySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      } else {
        // Listen to auth state change in case session is being set from URL fragment
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            setHasSession(true);
          }
        });

        // Give a generous grace period for session establishment
        const timer = setTimeout(() => {
          setHasSession((prev) => (prev === true ? true : false));
        }, 2000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timer);
        };
      }
    };

    verifySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const newPassword = (formData.get("newPassword") as string)?.trim();
    const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

    if (!newPassword || newPassword.length < 8) {
      setError(t("errPasswordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("errPasswordMismatch"));
      return;
    }

    try {
      setIsUpdating(true);
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setIsUpdating(false);
        setError(updateError.message);
        toast.error(updateError.message);
        return;
      }

      setIsSuccess(true);
      toast.success(t("passwordUpdatedTitle"));
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      setIsUpdating(false);
      const msg = err instanceof Error ? err.message : t("unexpectedError");
      setError(msg);
      toast.error(msg);
    }
  };

  if (hasSession === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <Sparkles className="w-8 h-8 text-plasma-cyan animate-spin" />
        <p className="text-xs text-gray-400 font-mono tracking-wider animate-pulse">
          {t("updatingPassword")}
        </p>
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center py-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-nova-flare/15 border border-nova-flare/40 flex items-center justify-center shadow-[0_0_25px_rgba(255,46,99,0.25)]">
          <AlertCircle className="w-8 h-8 text-nova-flare animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {t("invalidRecoverySessionTitle")}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed max-w-sm mx-auto">
            {t("invalidRecoverySessionDesc")}
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login?view=forgot"
            className="w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-void-deep/80 border border-void-border hover:border-plasma-cyan hover:text-plasma-cyan text-white shadow-md cursor-pointer text-sm"
          >
            <span>{t("requestNewLinkBtn")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center py-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/40 flex items-center justify-center shadow-[0_0_25px_rgba(0,229,255,0.25)]">
          <CheckCircle2 className="w-8 h-8 text-plasma-cyan animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {t("passwordUpdatedTitle")}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed max-w-sm mx-auto">
            {t("passwordUpdatedDesc")}
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Sparkles className="w-5 h-5 text-plasma-cyan animate-spin" />
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
          {t("newPassword")}
        </label>
        <div className="relative">
          <input
            type="password"
            name="newPassword"
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all text-sm"
            placeholder={t("newPasswordPlaceholder")}
          />
          <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          {t("confirmNewPassword")}
        </label>
        <div className="relative">
          <input
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all text-sm"
            placeholder={t("confirmPasswordPlaceholder")}
          />
          <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
        disabled={isUpdating}
        className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer text-void-deep ${
          isUpdating
            ? "bg-plasma-cyan text-void-deep shadow-[0_0_25px_rgba(0,229,255,0.6)] animate-pulse scale-[0.99]"
            : "bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:scale-[1.01] active:scale-[0.99]"
        } disabled:cursor-not-allowed`}
      >
        {isUpdating ? (
          <>
            <Sparkles className="w-5 h-5 animate-spin text-void-deep shrink-0" />
            <span className="tracking-wide text-sm font-extrabold">
              {t("updatingPassword")}
            </span>
          </>
        ) : (
          <>
            <span>{t("updatePasswordBtn")}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </>
        )}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="text-gray-400 hover:text-plasma-cyan text-xs sm:text-sm transition-colors cursor-pointer"
        >
          {t("backToLogin")}
        </Link>
      </div>
    </form>
  );
}

