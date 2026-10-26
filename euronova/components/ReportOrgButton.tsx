"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Flag, X, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { submitGlobalReportAction } from "@/actions/reports";

interface ReportOrgButtonProps {
  orgId: string;
  orgName: string;
}

const subscribe = () => () => {};

export function ReportOrgButton({ orgId, orgName }: ReportOrgButtonProps) {
  const t = useTranslations("Reports");
  const tCommon = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("fake_accreditation");
  const [details, setDetails] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await submitGlobalReportAction({
        targetType: "organization",
        targetId: orgId,
        targetTitle: orgName,
        reason,
        description: details,
      });

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      setIsOpen(false);
      setDetails("");
      setToastMessage(t("reportOrgSuccess"));
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
        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-void-border bg-void-deep/80 hover:border-nova-flare/40 text-gray-400 hover:text-nova-flare focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none text-xs font-semibold transition-all cursor-pointer shadow-sm group"
        title={t("reportOrgTitle")}
      >
        <Flag className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-gray-500 group-hover:text-nova-flare" />
        <span>{t("reportOrg")}</span>
      </button>

      {/* Global Toast */}
      {toastMessage && mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-[10000] flex items-center gap-3 bg-void-surface border border-rup-emerald/40 text-white px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(0,230,118,0.25)] animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-rup-emerald shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Report Modal */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void-deep/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
          <div className="bg-void-surface border border-nova-flare/40 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-[0_0_50px_rgba(255,46,99,0.2)] animate-in zoom-in-95 duration-300 relative flex flex-col">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={tCommon("closeModal")}
              className="absolute top-5 right-5 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-void-deep focus-visible:ring-2 focus-visible:ring-nova-flare focus-visible:outline-none transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-nova-flare/15 border border-nova-flare/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,46,99,0.3)]">
                <ShieldAlert className="w-6 h-6 text-nova-flare" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t("reportOrg")}
                </h3>
                <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">{orgName}</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-nova-flare/10 border border-nova-flare/30 text-nova-flare text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  {t("violationCategory")}
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-plasma-cyan transition-colors cursor-pointer"
                >
                  <option value="fake_accreditation">{t("reasonsOrg.fakeAccreditation")}</option>
                  <option value="unauthorized_fee">{t("reasonsOrg.unauthorizedFee")}</option>
                  <option value="safety_concern">{t("reasonsOrg.safetyConcern")}</option>
                  <option value="scam">{t("reasonsOrg.scam")}</option>
                  <option value="other">{t("reasonsOrg.other")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  {t("commentaryEvidence")}
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  required
                  maxLength={2000}
                  placeholder={t("orgViolationPlaceholder")}
                  className="w-full bg-void-deep border border-void-border rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-void-deep transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-nova-flare text-white hover:bg-nova-flare/90 shadow-[0_0_15px_rgba(255,46,99,0.4)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("transmitting")}</span>
                    </>
                  ) : (
                    <span>{t("submitReport")}</span>
                  )}
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
