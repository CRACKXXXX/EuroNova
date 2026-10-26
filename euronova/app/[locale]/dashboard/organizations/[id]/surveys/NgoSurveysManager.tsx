"use client";

import { useState, useTransition } from "react";
import {
  Vote,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ClipboardList,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  CommunitySurveyItem,
  SurveysPaginationResult,
  SurveyType,
  createNgoSurveyAction,
  updateNgoSurveyAction,
  deleteNgoSurveyAction,
  getOrgSurveysAction
} from "@/actions/surveys";
import { OrganizationNavTabs } from "@/components/OrganizationNavTabs";
import { SurveyBuilderClient } from "./SurveyBuilderClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useFormatter, useTranslations } from "next-intl";

interface NgoSurveysManagerProps {
  orgId: string;
  initialSurveys: SurveysPaginationResult;
}

export function NgoSurveysManager({ orgId, initialSurveys }: NgoSurveysManagerProps) {
  const format = useFormatter();
  const t = useTranslations("Surveys");
  const [activeSubTab, setActiveSubTab] = useState<"community_surveys" | "application_dossier">("community_surveys");
  const [surveysData, setSurveysData] = useState<SurveysPaginationResult>(initialSurveys);

  // Creator / Editor State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [surveyType, setSurveyType] = useState<SurveyType>("single_choice");
  const [question, setQuestion] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>(["", ""]);
  const [surveyStatus, setSurveyStatus] = useState<"published" | "draft">("published");

  const [isPending, startTransition] = useTransition();
  const [isLoadingPage, startPageTransition] = useTransition();

  // Handle {t("surveyType")} Change
  const handleTypeChange = (type: SurveyType) => {
    setSurveyType(type);
    if (type === "boolean") {
      setCustomOptions(["Yes", "No"]);
    } else if (customOptions.length < 2) {
      setCustomOptions(["", ""]);
    }
  };

  const handleAddOption = () => {
    if (surveyType === "boolean") return;
    if (customOptions.length >= 8) {
      toast.error(t("max8Options"));
      return;
    }
    setCustomOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (surveyType === "boolean") return;
    if (customOptions.length <= 2) {
      toast.error(t("min2Options"));
      return;
    }
    setCustomOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    setCustomOptions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const resetForm = () => {
    setEditingSurveyId(null);
    setSurveyType("single_choice");
    setQuestion("");
    setCustomOptions(["", ""]);
    setSurveyStatus("published");
    setIsFormOpen(false);
  };

  const handleEditClick = (survey: CommunitySurveyItem) => {
    setEditingSurveyId(survey.id);
    setSurveyType(survey.survey_type);
    setQuestion(survey.question);
    setCustomOptions(survey.options.map((o) => o.option_text));
    setSurveyStatus(survey.status === "closed" ? "draft" : (survey.status as "published" | "draft"));
    setIsFormOpen(true);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim() || question.trim().length < 5) {
      toast.error(t("validQuestionRequired"));
      return;
    }

    const filteredOptions = surveyType === "boolean"
      ? ["Yes", "No"]
      : customOptions.map((o) => o.trim()).filter((o) => o.length > 0);

    if (filteredOptions.length < 2) {
      toast.error(t("min2NonEmptyOptions"));
      return;
    }

    startTransition(async () => {
      if (editingSurveyId) {
        // Update Survey
        const result = await updateNgoSurveyAction({
          surveyId: editingSurveyId,
          question: question.trim(),
          survey_type: surveyType,
          options: filteredOptions,
          status: surveyStatus,
        });

        if (!result.success) {
          toast.error(result.error || t("saveSurveyError"));
          return;
        }

        toast.success(t("surveyUpdatedSuccess"), { icon: "✨" });
      } else {
        // {t("createNewSurvey")}
        const result = await createNgoSurveyAction({
          question: question.trim(),
          survey_type: surveyType,
          options: filteredOptions,
          status: surveyStatus,
        });

        if (!result.success) {
          toast.error(result.error || t("saveSurveyError"));
          return;
        }

        toast.success(t("surveyPublishedSuccess"), { icon: "🚀" });
      }

      // Refresh list
      const freshData = await getOrgSurveysAction(orgId, 1, 50);
      setSurveysData(freshData);
      resetForm();
    });
  };

  const handleDelete = (surveyId: string) => {
    startTransition(async () => {
      const res = await deleteNgoSurveyAction(surveyId);
      if (!res.success) {
        toast.error(res.error || "Failed to delete survey.");
        return;
      }

      toast.success(t("surveyDeletedSuccess"));
      const freshData = await getOrgSurveysAction(orgId, surveysData.page, 50);
      setSurveysData(freshData);
      if (editingSurveyId === surveyId) {
        resetForm();
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > surveysData.totalPages || isLoadingPage) return;

    startPageTransition(async () => {
      const res = await getOrgSurveysAction(orgId, newPage, 50);
      setSurveysData(res);
      window.scrollTo({ top: 300, behavior: "smooth" });
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Navigation Tabs */}
      <OrganizationNavTabs orgId={orgId} isOwner={true} />

      {/* 2. Sub-Tab Switcher between Community Opinion Polls and Application Dossier */}
      <div className="flex items-center gap-3 border-b border-void-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab("community_surveys")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeSubTab === "community_surveys"
              ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              : "bg-void-surface text-gray-400 hover:text-white border border-void-border"
            }`}
        >
          <Vote className="w-4 h-4" />
          <span>Dynamic Community Surveys ({surveysData.totalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("application_dossier")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeSubTab === "application_dossier"
              ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              : "bg-void-surface text-gray-400 hover:text-white border border-void-border"
            }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>{t("candidateApplicationDossier")}</span>
        </button>
      </div>

      {activeSubTab === "application_dossier" ? (
        <SurveyBuilderClient orgId={orgId} />
      ) : (
        <div className="space-y-8">
          {/* Top Banner & Creator Action */}
          <div className="bg-gradient-to-r from-hyper-violet/20 via-void-surface to-plasma-cyan/15 border border-void-border/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-wider">
                <Vote className="w-3.5 h-3.5" />
                <span>{t("consultationEngine")}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {t("surveysTitle")}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
                {t("surveysDesc")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep shadow-[0_0_25px_rgba(0,229,255,0.3)] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t("createNewSurvey")}</span>
            </button>
          </div>

          {/* Survey Creator / Editor Modal or Collapse Form */}
          {isFormOpen && (
            <div className="bg-void-surface border-2 border-plasma-cyan/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 relative">
              <button
                type="button"
                onClick={resetForm}
                className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-plasma-cyan" />
                  <span>{editingSurveyId ? t("editCommunitySurvey") : t("createNewCommunitySurvey")}</span>
                </h3>
                <p className="text-xs text-gray-400">
                  {t("automodNotice")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Survey Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    {t("surveyType")}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { type: "boolean" as SurveyType, title: t("typeBooleanTitle"), desc: t("typeBooleanDesc") },
                      { type: "single_choice" as SurveyType, title: t("typeSingleTitle"), desc: t("typeSingleDesc") },
                      { type: "multiple_choice" as SurveyType, title: t("typeMultiTitle"), desc: t("typeMultiDesc") },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleTypeChange(item.type)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${surveyType === item.type
                            ? "bg-plasma-cyan/15 border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.2)] ring-1 ring-plasma-cyan/40"
                            : "bg-void-deep border-void-border text-gray-400 hover:border-gray-500 hover:text-gray-200"
                          }`}
                      >
                        <div className="font-bold text-xs sm:text-sm text-white">{item.title}</div>
                        <div className="text-[11px] text-gray-400 mt-1 leading-normal">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      {t("surveyQuestion")}
                    </label>
                    <span className="text-[10px] font-mono text-gray-500">{question.length}/300</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t("questionExamplePlaceholder")}
                    className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-plasma-cyan transition-colors"
                  />
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      {t("votingOptions")}
                    </label>
                    {surveyType !== "boolean" && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-plasma-cyan hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t("addOption")}</span>
                      </button>
                    )}
                  </div>

                  {surveyType === "boolean" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-void-deep border border-void-border rounded-xl text-xs font-bold text-white text-center">
                        {t("optionYes")}
                      </div>
                      <div className="p-3 bg-void-deep border border-void-border rounded-xl text-xs font-bold text-white text-center">
                        {t("optionNo")}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {customOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500 w-6 text-center">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            maxLength={150}
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={t("optionNumberPlaceholder", { number: idx + 1 })}
                            className="flex-1 bg-void-deep border border-void-border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-plasma-cyan transition-colors"
                          />
                          {customOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-2 rounded-xl text-gray-500 hover:text-nova-flare hover:bg-nova-flare/10 transition-colors cursor-pointer"
                              title={t("removeOption")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Toggle & Submission */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-void-border/60">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-400">{t("statusLabel")}</label>
                    <select
                      value={surveyStatus}
                      onChange={(e) => setSurveyStatus(e.target.value as "published" | "draft")}
                      className="bg-void-deep border border-void-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-plasma-cyan"
                    >
                      <option value="published">{t("statusPublished")}</option>
                      <option value="draft">{t("statusDraft")}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isPending}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t("savingSurvey")}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{editingSurveyId ? t("updateSurvey") : t("publishSurvey")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* List of Existing Surveys Created by this Organization */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>
                {t.rich("yourSurveysCount", {
                  count: surveysData.totalCount,
                  page: surveysData.page,
                  totalPages: surveysData.totalPages,
                  strong: (chunks) => <span className="text-white font-bold">{chunks}</span>,
                })}
              </span>
              <span className="text-[11px] font-mono text-gray-500">{t("strictly50")}</span>
            </div>

            {surveysData.surveys.length === 0 ? (
              <div className="bg-void-surface/50 border border-void-border rounded-2xl p-10 text-center space-y-2">
                <Vote className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-sm font-semibold text-gray-300">{t("noSurveysCreated")}</p>
                <p className="text-xs text-gray-500">{t("noSurveysCreatedDesc")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {surveysData.surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="bg-void-surface border border-void-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${survey.status === "published"
                              ? "bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30"
                              : "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30"
                            }`}>
                            {survey.status}
                          </span>
                          <span className="text-xs font-mono text-gray-400 uppercase">
                            {survey.survey_type.replace("_", " ")}
                          </span>
                          <span className="text-gray-600">·</span>
                          <span className="text-[11px] text-gray-500">
                            {format.dateTime(new Date(survey.created_at), { dateStyle: "medium" })}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white tracking-tight">
                          {survey.question}
                        </h4>
                      </div>

                      {/* Actions: Edit & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(survey)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-void-border bg-void-deep hover:border-plasma-cyan text-xs font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-plasma-cyan" />
                          <span>{t("edit")}</span>
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-void-border bg-void-deep hover:border-nova-flare text-xs font-bold text-gray-300 hover:text-nova-flare transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t("delete")}</span>
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("deleteSurveyTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("deleteSurveyConfirm")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(survey.id)}>
                                {t("delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Breakdown of options & live percentages */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-void-border/50">
                      {survey.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="p-3 rounded-xl bg-void-deep/80 border border-void-border/60 flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-300 font-medium truncate mr-2">{opt.option_text}</span>
                          <span className="font-mono font-bold text-plasma-cyan shrink-0">
                            {opt.percentage ?? 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 50-Item Pagination Bar */}
            {surveysData.totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-void-border/60">
                <span className="text-xs text-gray-400">
                  {t.rich("pageOf", {
                    page: surveysData.page,
                    totalPages: surveysData.totalPages,
                    strong: (chunks) => <span className="text-white font-bold">{chunks}</span>,
                  })}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(surveysData.page - 1)}
                    disabled={!surveysData.hasPrevPage || isLoadingPage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-void-border bg-void-surface text-xs font-bold text-gray-300 hover:text-white hover:border-plasma-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t("previousPage")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePageChange(surveysData.page + 1)}
                    disabled={!surveysData.hasNextPage || isLoadingPage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-void-border bg-void-surface text-xs font-bold text-gray-300 hover:text-white hover:border-plasma-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <span>{t("nextPage")}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
