"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createTicket } from "./actions";
import { Mail, Phone, MessageSquare, Send, Sparkles, Globe, MessageCircle, Paperclip, Image as ImageIcon, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const ALLOWED_REASONS = [
  "apply_support",
  "survey_moderation",
  "trust_score_dispute",
  "scraper_issue",
  "technical",
  "account",
  "projects",
  "billing",
  "other",
] as const;

export function SupportForm() {
  const t = useTranslations("SupportForm");
  const tErrors = useTranslations("Errors");
  const searchParams = useSearchParams();
  const rawReason = searchParams.get("reason") || "";
  const defaultReason = (ALLOWED_REASONS as readonly string[]).includes(rawReason) ? rawReason : "";

  const [contactMethod, setContactMethod] = useState<"website" | "email" | "whatsapp">("website");
  const [selectedReason, setSelectedReason] = useState(defaultReason);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [subjectValue, setSubjectValue] = useState(
    defaultReason === "apply_support"
      ? "Application for EuroNova Community Support Specialist (Level 10+)"
      : ""
  );

  const [state, action, isPending] = useActionState(createTicket, null);
  const inFlightRef = useRef(false);

  const [prevSuccess, setPrevSuccess] = useState<boolean>(false);
  if (state?.success && !prevSuccess) {
    setPrevSuccess(true);
    setSelectedFiles([]);
  }

  useEffect(() => {
    if (state?.error === "RATE_LIMIT_EXCEEDED") {
      toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⚠️" });
    }
  }, [state?.error, tErrors]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSizeBytes = 5 * 1024 * 1024;
    const newFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (selectedFiles.length + newFiles.length >= 3) {
        toast.warning(t("attachmentMaxCount"));
        break;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`${file.name}: ${t("attachmentTooLarge")}`);
        continue;
      }
      if (!allowedMimeTypes.includes(file.type)) {
        toast.error(`${file.name}: ${t("attachmentInvalidType")}`);
        continue;
      }
      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles].slice(0, 3));
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAction = async (formData: FormData) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      formData.delete("attachments");
      for (const file of selectedFiles) {
        formData.append("attachments", file);
      }
      await action(formData);
    } finally {
      inFlightRef.current = false;
    }
  };

  return (
    <form action={handleAction} className="space-y-6">
      {selectedReason === "apply_support" && (
        <div className="p-4 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 text-rup-emerald text-xs flex items-center gap-3 animate-in fade-in shadow-[0_0_15px_rgba(0,230,118,0.15)]">
          <Sparkles className="w-5 h-5 shrink-0" />
          <span>
            <strong>{t("vanguardAppPrefix")}</strong> {t("vanguardAppDesc")}
          </span>
        </div>
      )}

      {/* Preferred Contact Method Multi-Channel Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">
          {t("preferredContactMethod")}
        </label>
        <input type="hidden" name="preferredContactMethod" value={contactMethod} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setContactMethod("website")}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              contactMethod === "website"
                ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                : "bg-void-deep border-void-border text-gray-400 hover:text-white hover:border-gray-700 hover:bg-void-surface"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{t("contactMethodWebsite")}</span>
          </button>

          <button
            type="button"
            onClick={() => setContactMethod("email")}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              contactMethod === "email"
                ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                : "bg-void-deep border-void-border text-gray-400 hover:text-white hover:border-gray-700 hover:bg-void-surface"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>{t("contactMethodEmail")}</span>
          </button>

          <button
            type="button"
            onClick={() => setContactMethod("whatsapp")}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
              contactMethod === "whatsapp"
                ? "bg-rup-emerald/15 border-rup-emerald text-rup-emerald shadow-[0_0_20px_rgba(0,230,118,0.25)]"
                : "bg-void-deep border-void-border text-gray-400 hover:text-white hover:border-gray-700 hover:bg-void-surface"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t("contactMethodWhatsapp")}</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            {contactMethod === "whatsapp" ? t("phoneWhatsappRequired") : t("phone")}
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              name="phone"
              required={contactMethod === "whatsapp"}
              maxLength={30}
              className={`w-full bg-void-deep border rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none uiverse-input-glow ${
                contactMethod === "whatsapp"
                  ? "border-rup-emerald/60 focus:border-rup-emerald"
                  : "border-void-border focus:border-plasma-cyan"
              }`}
              placeholder={
                contactMethod === "whatsapp"
                  ? t("phoneWhatsappPlaceholder")
                  : t("phonePlaceholder")
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t("subject")}</label>
          <input
            type="text"
            name="subject"
            required
            maxLength={150}
            value={subjectValue}
            onChange={(e) => setSubjectValue(e.target.value)}
            className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan uiverse-input-glow"
            placeholder={t("subjectPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t("reason")}</label>
          <select
            name="reason"
            required
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan uiverse-input-glow appearance-none cursor-pointer"
          >
            <option value="">{t("selectReason")}</option>
            <option value="apply_support">{t("reasonApplySupport")}</option>
            <option value="survey_moderation">{t("reasonSurveyModeration")}</option>
            <option value="trust_score_dispute">{t("reasonTrustScoreDispute")}</option>
            <option value="scraper_issue">{t("reasonScraperIssue")}</option>
            <option value="technical">{t("reasonTechnical")}</option>
            <option value="account">{t("reasonAccount")}</option>
            <option value="projects">{t("reasonProjects")}</option>
            <option value="billing">{t("reasonBilling")}</option>
            <option value="other">{t("reasonOther")}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">{t("content")}</label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-4 w-4 h-4 text-gray-500 pointer-events-none" />
          <textarea
            name="content"
            required
            rows={5}
            maxLength={5000}
            className="w-full bg-void-deep border border-void-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan uiverse-input-glow"
            placeholder={
              selectedReason === "apply_support"
                ? t("applySupportPlaceholder")
                : t("contentPlaceholder")
            }
          />
        </div>
      </div>

      {/* Photo Attachments Multi-Uploader (Max 3, 5MB each, JPG/PNG/WEBP) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-plasma-cyan" />
            <span>{t("attachmentsLabel")}</span>
          </label>
          <span className="text-xs text-gray-500 font-mono">
            {selectedFiles.length}/3
          </span>
        </div>

        {selectedFiles.length < 3 && (
          <label className="flex flex-col items-center justify-center p-4 border border-dashed border-void-border hover:border-plasma-cyan/60 rounded-xl bg-void-deep/60 hover:bg-void-deep cursor-pointer transition-all duration-300 hover:scale-[1.01] group">
            <Upload className="w-5 h-5 text-gray-500 group-hover:text-plasma-cyan transition-colors mb-1" />
            <span className="text-xs text-gray-400 group-hover:text-gray-200">
              {t("attachmentsHint")}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isPending || selectedFiles.length >= 3}
              onChange={handleFileSelect}
            />
          </label>
        )}

        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-surface border border-void-border text-xs text-gray-300 shadow-sm"
              >
                <ImageIcon className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-gray-500 hover:text-nova-flare transition-colors p-0.5 cursor-pointer"
                  aria-label={t("removeAttachment")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {state?.error && (
        <div className="p-4 rounded-xl bg-nova-flare/20 border border-nova-flare text-nova-flare text-sm font-medium text-center shadow-[0_0_15px_rgba(255,46,99,0.2)]">
          {state.error === "RATE_LIMIT_EXCEEDED"
            ? tErrors("rateLimitExceeded")
            : state.error === "AUTH_REQUIRED"
              ? tErrors("authRequired")
              : state.error}
        </div>
      )}

      {state?.success ? (
        <div className="p-6 rounded-2xl bg-rup-emerald/20 border border-rup-emerald text-center space-y-2 shadow-[0_0_25px_rgba(0,230,118,0.2)]">
          <p className="text-rup-emerald font-bold text-lg">{t("success")}</p>
          <p className="text-rup-emerald/80 text-sm">{t("successDesc")}</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="w-full font-bold py-4 px-4 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center gap-2 text-void-deep bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] hover:scale-[1.015] active:scale-[0.985] disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          <span>{isPending ? t("submitting") : t("submit")}</span>
        </button>
      )}
    </form>
  );
}
