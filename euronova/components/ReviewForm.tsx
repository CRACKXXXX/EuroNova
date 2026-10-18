"use client";

import { useState, useTransition } from "react";
import { Star, Send, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { submitOrgReview } from "@/actions/reviews";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ReviewFormProps {
  orgId: string;
}

export function ReviewForm({ orgId }: ReviewFormProps) {
  const t = useTranslations("OrgReviews");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg("Please select a rating between 1 and 5 stars.");
      return;
    }

    if (!reviewText.trim() || reviewText.trim().length < 5) {
      setErrorMsg("Please write at least a few words describing your experience.");
      return;
    }

    startTransition(async () => {
      const res = await submitOrgReview(orgId, rating, reviewText);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(t("successMessage"));
        setReviewText("");
        setRating(5);
        if (res.xpGained) {
          toast.success(`Verified Review Submitted! +${res.xpGained} XP awarded.`, { icon: "⭐" });
          if (res.leveledUp && res.newLevel) {
            toast.success(`LEVEL UP! You reached Level ${res.newLevel}!`, { icon: "🚀" });
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
    });
  };

  return (
    <div className="bg-void-surface border border-void-border rounded-2xl p-6 shadow-xl">
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <Star className="w-5 h-5 text-plasma-cyan fill-plasma-cyan" />
        {t("writeReview")}
      </h3>
      <p className="text-sm text-gray-400 mb-6">
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
                  aria-label={`Rate ${star} stars`}
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
