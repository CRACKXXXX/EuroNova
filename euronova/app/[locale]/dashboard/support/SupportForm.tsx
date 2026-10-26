"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createTicket } from "./actions";
import { Mail, Phone, MessageSquare, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function SupportForm() {
  const t = useTranslations("SupportForm");
  const searchParams = useSearchParams();
  const defaultReason = searchParams.get("reason") || "";

  const [selectedReason, setSelectedReason] = useState(defaultReason);
  const [subjectValue, setSubjectValue] = useState(
    defaultReason === "apply_support"
      ? "Application for EuroNova Community Support Specialist (Level 10+)"
      : ""
  );

  const [state, action, isPending] = useActionState(createTicket, null);

  return (
    <form action={action} className="space-y-6">
      {selectedReason === "apply_support" && (
        <div className="p-4 rounded-xl bg-rup-emerald/10 border border-rup-emerald/30 text-rup-emerald text-xs flex items-center gap-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 shrink-0" />
          <span>
            <strong>{t("vanguardAppPrefix")}</strong> {t("vanguardAppDesc")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t("email")}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="email"
              name="email"
              required
              maxLength={120}
              className="w-full bg-void-deep border border-void-border rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder={t("emailPlaceholder")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t("phone")}</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              name="phone"
              maxLength={30}
              className="w-full bg-void-deep border border-void-border rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder={t("phonePlaceholder")}
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
            className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
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
            className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all appearance-none cursor-pointer"
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
          <MessageSquare className="absolute left-3 top-4 w-4 h-4 text-gray-500" />
          <textarea
            name="content"
            required
            rows={5}
            maxLength={5000}
            className="w-full bg-void-deep border border-void-border rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            placeholder={
              selectedReason === "apply_support"
                ? "Describe your European mobility background, countries visited, spoken languages, and why you wish to assist fellow volunteers on EuroNova..."
                : t("contentPlaceholder")
            }
          />
        </div>
      </div>

      {state?.error && (
        <div className="p-4 rounded-lg bg-nova-flare/20 border border-nova-flare text-nova-flare text-sm font-medium text-center">
          {state.error}
        </div>
      )}

      {state?.success ? (
        <div className="p-6 rounded-lg bg-rup-emerald/20 border border-rup-emerald text-center space-y-2">
          <p className="text-rup-emerald font-bold text-lg">{state.success}</p>
          <p className="text-rup-emerald/80 text-sm">{t("successDesc")}</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="w-full font-bold py-4 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-void-deep bg-plasma-cyan hover:bg-plasma-cyan/80 shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          {isPending ? t("submitting") : t("submit")}
        </button>
      )}
    </form>
  );
}
