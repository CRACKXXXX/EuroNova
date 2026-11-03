"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Star, Send, AlertCircle, CheckCircle2, Loader2, Lock, ShieldAlert } from "lucide-react";
import { submitOrgReview } from "@/actions/reviews";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";

interface ReviewFormProps {
  orgId: string;
  userLevel?: number;
  isYouth?: boolean;
  userXp?: number;
  isAuthenticated?: boolean;
}

export function ReviewForm({
  orgId,
  userLevel = 1,
  isYouth = false,
  userXp = 0,
  isAuthenticated = true,
}: ReviewFormProps) {
  const t = useTranslations("OrgReviews");
  const tErrors = useTranslations("Errors");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [liveLevel, setLiveLevel] = useState<number>(userLevel);
  const [liveXp, setLiveXp] = useState<number>(userXp);
  const inFlightRef = useRef(false);

  // Sync state if initial props change
  useEffect(() => {
    setLiveLevel(userLevel);
    setLiveXp(userXp);
  }, [userLevel, userXp]);

  // Listen to in-session XP / level upgrades
  useEffect(() => {
    const handleXpUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ xpGained?: number; level?: number }>;
      if (custom.detail?.level) {
        setLiveLevel(custom.detail.level);
      }
      if (custom.detail?.xpGained) {
        setLiveXp((prev) => prev + (custom.detail.xpGained || 0));
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("euronova:xp-updated", handleXpUpdated);
      return () => window.removeEventListener("euronova:xp-updated", handleXpUpdated);
    }
  }, []);

  const isLocked = !isAuthenticated || !isYouth || liveLevel < 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg(t("levelRequirementError"));
      return;
    }
    if (inFlightRef.current) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg(t("ratingRequired"));
      return;
    }

    if (!reviewText.trim() || reviewText.trim().length < 5) {
      setErrorMsg(t("reviewMinLength"));
      return;
    }

    inFlightRef.current = true;
    startTransition(async () => {
      try {
        const res = await submitOrgReview(orgId, rating, reviewText);
        if (res.error) {
          if (res.error === "RATE_LIMIT_EXCEEDED") {
            toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
            setErrorMsg(tErrors("rateLimitExceeded"));
          } else if (res.error === "LEVEL_2_REQUIRED") {
            setErrorMsg(t("levelRequirementError"));
          } else {
            setErrorMsg(res.error);
          }
        } else {
          setSuccessMsg(t("successMessage"));
          setReviewText("");
          setRating(5);
          if (res.xpGained) {
            toast.success(t("reviewSubmittedToast", { xp: res.xpGained }), { icon: "⭐" });
            if (res.leveledUp && res.newLevel) {
              toast.success(t("levelUpToast", { level: res.newLevel }), { icon: "🚀" });
            }
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("euronova:xp-updated", { 
                  detail: { xpGained: res.xpGained, level: res.newLevel } 
                })
              );
            }
          }
          setTimeout(() => setSuccessMsg(null), 5000);
        }
      } finally {
        inFlightRef.current = false;
      }
    });
  };

  // ESTADO BLOQUEADO: Si no está autenticado, no es participante youth o no tiene Nivel 2 mínimo
  if (isLocked) {
    const safeXp = Math.max(0, liveXp);
    const progressPercent = Math.min(100, Math.max(0, Math.round((safeXp / 100) * 100)));

    return (
      <div className="bg-void-surface border border-void-border rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        {/* Ambient Warm Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Status Badge Superior */}
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t("lockedBadge")}</span>
          </span>
        </div>

        {/* 2. Título Principal */}
        <h3 className="text-xl font-bold text-white mb-2.5 flex items-center gap-2">
          <span>{t("lockedTitle")}</span>
        </h3>

        {/* 3. Descripción Informativa */}
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          {t("lockedDesc")}
        </p>

        {/* 4. Indicador de Nivel Actual y Progreso a Nivel 2 */}
        {isAuthenticated && isYouth && (
          <div className="p-4 rounded-xl bg-void-deep/90 border border-void-border space-y-2.5 mb-5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-gray-300">
                {t("currentLevelStatus", { level: liveLevel, xp: safeXp })}
              </span>
              <span className="font-mono text-amber-400 font-bold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-[11px] shrink-0">
                {progressPercent}%
              </span>
            </div>

            {/* Barra de Progreso */}
            <div className="w-full h-2 rounded-full bg-void-surface overflow-hidden border border-void-border/60">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-plasma-cyan rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-xs text-gray-400 leading-normal pt-1">
              {t("earnXpTip")}
            </p>
          </div>
        )}

        {/* 5. Acción para Desbloquear */}
        <div className="pt-1">
          {!isAuthenticated ? (
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-plasma-cyan/15 hover:bg-plasma-cyan text-plasma-cyan hover:text-void-deep border border-plasma-cyan/40 hover:border-plasma-cyan font-bold text-sm transition-all text-center shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_20px_rgba(0,229,255,0.35)]"
            >
              <span>{t("signInToReview")}</span>
            </Link>
          ) : (
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-void-deep hover:bg-amber-400/10 text-gray-200 hover:text-amber-300 border border-void-border hover:border-amber-400/40 font-semibold text-sm transition-all text-center leading-snug shadow-md group"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span>{t("goToProfileBtn")}</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-void-surface border border-void-border rounded-2xl p-4 sm:p-6 shadow-xl">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 flex items-center gap-2 min-w-0 break-words">
        <Star className="w-5 h-5 text-plasma-cyan fill-plasma-cyan shrink-0" />
        <span className="break-words">{t("writeReview")}</span>
      </h3>
      <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-6 break-words">
        {t("beTheFirst")}
      </p>

      {errorMsg && (
        <div className="mb-5 p-4 rounded-xl bg-nova-flare/10 border border-nova-flare/30 flex items-start gap-3 text-nova-flare text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-4 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 flex items-start gap-3 text-rup-emerald text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de Estrellas (1 a 5) */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {t("ratingLabel")}
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 rounded-lg hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                  aria-label={t("rateStarAria", { star })}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      active
                        ? "text-plasma-cyan fill-plasma-cyan filter drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                  />
                </button>
              );
            })}
            <span className="text-sm font-semibold text-plasma-cyan ml-2">
              {hoverRating || rating} / 5
            </span>
          </div>
        </div>

        {/* Textarea para la Reseña */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {t("reviewTextLabel")}
          </label>
          <textarea
            rows={4}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={t("reviewTextPlaceholder")}
            maxLength={2000}
            disabled={isPending}
            className="w-full bg-void-deep border border-void-border rounded-xl p-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all resize-y custom-scrollbar"
          />
        </div>

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-plasma-cyan bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t("submitting")}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{t("submitBtn")}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
