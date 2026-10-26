"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Flag, X, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { submitSurveyReportAction } from "@/actions/reports";

interface ReportSurveyButtonProps {
  surveyId: string;
  surveyQuestion: string;
}

const subscribe = () => () => {};

export function ReportSurveyButton({ surveyId, surveyQuestion }: ReportSurveyButtonProps) {
  const t = useTranslations("Reports");
  const tCommon = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate_content");
  const [details, setDetails] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await submitSurveyReportAction({
        surveyId,
        surveyQuestion,
        reason,
        description: details,
      });

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      setIsOpen(false);
      setDetails("");
      setToastMessage(t("reportSurveySuccess"));
      setTimeout(() => setToastMessage(null), 5000);
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
        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-void-border/80 bg-void-deep/60 hover:border-nova-flare/40 text-gray-400 hover:text-nova-flare focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none text-xs font-semibold transition-all cursor-pointer shadow-xs group"
        title={t("reportSurveyTitle")}
      >
        <Flag className="w-3 h-3 text-gray-500 group-hover:text-nova-flare transition-colors" />
        <span className="text-[11px]">{t("reportSurvey")}</span>
      </button>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-void-surface border border-rup-emerald/40 text-rup-emerald shadow-[0_0_25px_rgba(0,230,118,0.2)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-white">{toastMessage}</span>
        </div>
      )}

      {/* Modal Dialog */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-void-surface border border-void-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={tCommon("closeModal")}
              className="absolute top-5 right-5 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-void-deep focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-nova-flare/10 text-nova-flare border border-nova-flare/20 uppercase tracking-wider">
                <ShieldAlert className="w-3 h-3" />
                <span>360º Moderation Shield</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {t("reportCommunitySurvey")}
              </h3>
              <p className="text-xs text-gray-400">
                {t.rich("reportingSurveyIntro", {
                  question: surveyQuestion,
                  italic: (chunks) => <span className="text-gray-200 font-semibold italic">{chunks}</span>,
                })}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-nova-flare/10 border border-nova-flare/30 text-nova-flare text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t("reasonForReport")}
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-nova-flare"
                >
                  <option value="inappropriate_content">{t("reasonsSurvey.inappropriate")}</option>
                  <option value="spam_or_commercial">{t("reasonsSurvey.spam")}</option>
                  <option value="hate_speech">{t("reasonsSurvey.hateSpeech")}</option>
                  <option value="misleading_information">{t("reasonsSurvey.misleading")}</option>
                  <option value="other">{t("reasonsSurvey.other")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t("additionalDetailsOptional")}
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={t("surveyContextPlaceholder")}
                  className="w-full bg-void-deep border border-void-border rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-nova-flare resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-nova-flare hover:bg-nova-flare/90 text-white shadow-[0_0_20px_rgba(255,46,99,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("transmitReport")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
