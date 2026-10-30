"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { signup } from "@/app/[locale]/login/actions";
import { useTranslations } from "next-intl";
import { Sparkles, CheckCircle2, AlertCircle, User, Building, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface RegisterFormProps {
  onToggleView?: () => void;
}

const subscribe = () => () => {};

export function RegisterForm({ onToggleView }: RegisterFormProps) {
  const router = useRouter();
  const t = useTranslations("Login");
  const tErrors = useTranslations("Errors");
  const [role, setRole] = useState<"youth" | "org">("youth");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("role", role);

    startTransition(async () => {
      try {
        const result = await signup(null, formData);
        if (result?.error) {
          if (result.error === "RATE_LIMIT_EXCEEDED") {
            toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
            setError(tErrors("rateLimitExceeded"));
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
        setError(err instanceof Error ? err.message : "An unexpected error occurred during account creation.");
      }
    });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
      >
        {/* Role Selector */}
        <div className="space-y-2.5">
          <label className="text-sm font-medium text-gray-300">
            {t("role")}
          </label>
          <div className="grid grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => setRole("youth")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer ${
                role === "youth"
                  ? "bg-plasma-cyan/15 border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                  : "bg-void-deep/60 border-void-border text-gray-400 hover:border-gray-600 hover:text-gray-300"
              }`}
            >
              <User className={`w-5 h-5 mb-1.5 ${role === "youth" ? "text-plasma-cyan" : ""}`} />
              <span className="text-xs font-bold tracking-wide">{t("roleYouth")}</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("org")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer ${
                role === "org"
                  ? "bg-hyper-violet/15 border-hyper-violet text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-void-deep/60 border-void-border text-gray-400 hover:border-gray-600 hover:text-gray-300"
              }`}
            >
              <Building className={`w-5 h-5 mb-1.5 ${role === "org" ? "text-hyper-violet" : ""}`} />
              <span className="text-xs font-bold tracking-wide">{t("roleOrg")}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            {role === "org" ? t("orgName") : t("fullName")}
          </label>
          <input
            type="text"
            name="fullName"
            required
            className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
            placeholder={role === "org" ? t("orgNamePlaceholder") : t("fullNamePlaceholder")}
          />
        </div>

        {/* Strict Age Gate (Art. 8 GDPR & Erasmus+ Minimum Age 13) */}
        {role === "youth" && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <label htmlFor="birth_date" className="text-sm font-medium text-gray-300">
              {t("birthDate")}
            </label>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              required
              max={new Date().toISOString().split("T")[0]}
              className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all [color-scheme:dark]"
            />
            <p className="text-[11px] text-gray-400 font-mono">
              {t("birthDateHelper")}
            </p>
          </div>
        )}

        {role === "org" && (
          <div className="p-3.5 rounded-xl bg-void-deep/70 border border-void-border flex items-start gap-3 animate-in fade-in duration-300">
            <input
              type="checkbox"
              id="org_age_declaration"
              name="org_age_declaration"
              required
              className="mt-1 w-4 h-4 rounded border-void-border bg-void-surface text-hyper-violet focus:ring-hyper-violet cursor-pointer accent-hyper-violet shrink-0"
            />
            <label htmlFor="org_age_declaration" className="text-xs text-gray-300 leading-snug cursor-pointer select-none">
              {t("orgAgeDeclaration")}
            </label>
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
          <label className="text-sm font-medium text-gray-300">
            {t("password")}
          </label>
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            className="w-full bg-void-deep/80 border border-void-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
            placeholder={t("passwordPlaceholder")}
          />
        </div>

        {/* Auditable GDPR Art. 7 Consent Checkbox */}
        <div className="p-3.5 rounded-xl bg-void-deep/70 border border-void-border flex items-start gap-3">
          <input
            type="checkbox"
            id="accepted_tos"
            name="accepted_tos"
            required
            className="mt-1 w-4 h-4 rounded border-void-border bg-void-surface text-plasma-cyan focus:ring-plasma-cyan cursor-pointer accent-plasma-cyan shrink-0"
          />
          <label htmlFor="accepted_tos" className="text-xs text-gray-300 leading-snug cursor-pointer select-none">
            {t("acceptTosPrefix")}{" "}
            <Link
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-plasma-cyan hover:underline font-semibold"
            >
              {t("termsOfService")}
            </Link>{" "}
            {t("andThe")}{" "}
            <Link
              href="/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-plasma-cyan hover:underline font-semibold"
            >
              {t("privacyPolicy")}
            </Link>{" "}
            <span className="text-gray-400 font-mono text-[11px]">{t("gdprCompliant")}</span>
          </label>
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
              ? "bg-rup-emerald text-void-deep shadow-[0_0_25px_rgba(0,230,118,0.6)] animate-pulse scale-[0.99]"
              : "bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:scale-[1.01] active:scale-[0.99]"
          } disabled:cursor-not-allowed`}
        >
          {isPending || showToast ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin text-void-deep shrink-0" />
              <span className="tracking-wide text-sm font-extrabold">
                {t("creatingAccount")}
              </span>
            </>
          ) : (
            <>
              <span>{t("registerBtn")}</span>
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
              {t("hasAccount")}
            </button>
          </div>
        )}
      </form>

      {/* Cosmic Glassmorphism Success Toast */}
      {showToast && mounted && createPortal(
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-top-5 duration-500">
          <div className="bg-void-surface/90 border border-rup-emerald/60 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_0_35px_rgba(0,230,118,0.3)] flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-rup-emerald/20 border border-rup-emerald/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,230,118,0.4)]">
              <CheckCircle2 className="w-5 h-5 text-rup-emerald animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-rup-emerald">
                {t("welcomeToastTitle")}
              </p>
              <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                {t("registerSuccess")}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
