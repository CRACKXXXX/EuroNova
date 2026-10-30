"use client";

import { useState, useTransition, useSyncExternalStore, useRef } from "react";
import { createPortal } from "react-dom";
import { Flag, X, CheckCircle2, ShieldAlert, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { submitProjectReportAction } from "@/actions/reports";
import { toast } from "sonner";

interface ReportMissionButtonProps {
  projectId: string;
  projectTitle: string;
}

const subscribe = () => () => {};

export function ReportMissionButton({ projectId, projectTitle }: ReportMissionButtonProps) {
  const t = useTranslations("ProjectDetails");
  const tErrors = useTranslations("Errors");
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("scam");
  const [details, setDetails] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const safeT = (key: string, fallback: string) => {
    try {
      const val = t(key);
      if (!val || val === `ProjectDetails.${key}` || val.endsWith(`.${key}`)) return fallback;
      return val;
    } catch {
      return fallback;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await submitProjectReportAction({
          projectId,
          projectTitle,
          reason,
          description: details,
        });

        if (res.error) {
          if (res.error === "RATE_LIMIT_EXCEEDED") {
            toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
            setErrorMessage(tErrors("rateLimitExceeded"));
          } else {
            setErrorMessage(res.error);
          }
          return;
        }

        setIsOpen(false);
        setDetails("");
        setToastMessage(
          safeT(
            "reportSuccess",
            "Report received! Orbital moderators will review this transmission within 24 hours."
          )
        );
        setTimeout(() => setToastMessage(null), 4500);
      } finally {
        inFlightRef.current = false;
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg border border-void-border bg-void-deep/60 hover:border-nova-flare/40 text-gray-400 hover:text-nova-flare focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none text-xs font-semibold transition-all cursor-pointer shadow-sm group"
        title={safeT("reportMission", "Report Transmission")}
      >
        <Flag className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        <span>{safeT("reportMission", "Report Transmission")}</span>
      </button>

      {/* Report Modal */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void-deep/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
          <div className="bg-void-surface border border-nova-flare/40 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(255,46,99,0.2)] animate-in zoom-in-95 duration-300 relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("closeModal")}
              className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,46,99,0.3)]">
                <ShieldAlert className="w-5 h-5 text-nova-flare" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {safeT("reportMission", "Report Transmission")}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-1">{projectTitle}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              {safeT(
                "reportDesc",
                "Help us maintain verified, quality opportunities. Flag suspicious behavior, unauthorized fees, or broken infopacks."
              )}
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-nova-flare/15 border border-nova-flare/40 text-nova-flare text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  {safeT("reportReason", "Reason for Report")}
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-nova-flare"
                >
                  <option value="scam">
                    {safeT("reportReasonScam", "Suspicious or Potentially Fraudulent Entity")}
                  </option>
                  <option value="fee">
                    {safeT("reportReasonFee", "Unauthorized or Illegal Participation Fee")}
                  </option>
                  <option value="inactive">
                    {safeT("reportReasonInactive", "Organization Unresponsive or Inactive")}
                  </option>
                  <option value="broken">
                    {safeT("reportReasonBroken", "Broken Infopack or Application Link")}
                  </option>
                  <option value="other">
                    {safeT("reportReasonOther", "Other Safety Concern")}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  {safeT("reportDetails", "Additional Information")}
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={2000}
                  placeholder={safeT(
                    "reportDetailsPlaceholder",
                    "Provide any relevant details for orbital moderators..."
                  )}
                  className="w-full bg-void-deep border border-void-border rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-nova-flare resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-void-border bg-void-deep hover:bg-void-surface text-gray-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-nova-flare hover:bg-nova-flare/90 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,46,99,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {isPending
                    ? safeT("reportSubmitting", "Transmitting...")
                    : safeT("reportSubmit", "Submit to Admin")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Success Toast */}
      {toastMessage && mounted && createPortal(
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-top-5 duration-400">
          <div className="bg-void-surface/95 border border-nova-flare/60 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_0_35px_rgba(255,46,99,0.3)] flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-nova-flare/20 border border-nova-flare/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,46,99,0.4)]">
              <CheckCircle2 className="w-5 h-5 text-nova-flare" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-nova-flare">
                {t("reportDispatched")}
              </p>
              <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                {toastMessage}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
