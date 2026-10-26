"use client";

import { useState, useTransition } from "react";
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Building2, 
  Vote, 
  Loader2,
  Layers,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { 
  CommunitySurveyItem, 
  SurveysPaginationResult, 
  voteNgoSurveyAction, 
  getCommunitySurveysAction,
  deleteNgoSurveyAction
} from "@/actions/surveys";
import { useFormatter, useTranslations } from "next-intl";
import { ReportSurveyButton } from "./ReportSurveyButton";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface CommunitySurveysViewProps {
  initialData: SurveysPaginationResult;
  currentUserId?: string | null;
  user?: { id?: string; role?: string } | null;
  userRole?: string;
}

export function CommunitySurveysView({
  initialData,
  user,
  userRole,
}: CommunitySurveysViewProps) {
  const format = useFormatter();
  const t = useTranslations("CommunitySurveys");
  const [data, setData] = useState<SurveysPaginationResult>(initialData);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [votedSurveys, setVotedSurveys] = useState<Record<string, { percentages: Record<string, number>; userOptionIds: string[] }>>({});
  const [isVoting, startTransition] = useTransition();
  const [isLoadingPage, startPageTransition] = useTransition();
  const [activeVotingSurveyId, setActiveVotingSurveyId] = useState<string | null>(null);
  const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null);

  const role = user?.role || userRole;
  const canModerate = role === "admin" || role === "moderator";

  const handleDeleteSurvey = async (surveyId: string) => {
    setDeletingSurveyId(surveyId);
    try {
      const res = await deleteNgoSurveyAction(surveyId);
      if (res.success) {
        toast.success(t("surveyDeleted"));
        setData((prev) => ({
          ...prev,
          surveys: prev.surveys.filter((s) => s.id !== surveyId),
          totalCount: Math.max(0, prev.totalCount - 1),
        }));
      } else {
        toast.error(res.error || t("surveyDeleteError"));
      }
    } catch {
      toast.error(t("surveyDeleteError"));
    } finally {
      setDeletingSurveyId(null);
    }
  };

  const handleOptionToggle = (survey: CommunitySurveyItem, optionId: string) => {
    if (survey.hasVoted || votedSurveys[survey.id]) return;

    if (survey.survey_type === "multiple_choice") {
      const current = selectedOptions[survey.id] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setSelectedOptions((prev) => ({ ...prev, [survey.id]: updated }));
    } else {
      // boolean or single_choice: only 1 option
      setSelectedOptions((prev) => ({ ...prev, [survey.id]: [optionId] }));
    }
  };

  const handleVoteSubmit = (survey: CommunitySurveyItem) => {
    const chosen = selectedOptions[survey.id] || [];
    if (chosen.length === 0) {
      toast.error(t("selectOptionError"));
      return;
    }

    setActiveVotingSurveyId(survey.id);
    startTransition(async () => {
      const result = await voteNgoSurveyAction({
        surveyId: survey.id,
        optionIds: chosen,
      });

      if (!result.success || !result.percentages) {
        toast.error(result.error || t("surveyDeleteError"));
        setActiveVotingSurveyId(null);
        return;
      }

      setVotedSurveys((prev) => ({
        ...prev,
        [survey.id]: {
          percentages: result.percentages!,
          userOptionIds: result.userVotedOptionIds || chosen,
        },
      }));

      toast.success(t("voteRecordedSuccess"), {
        icon: "⚡",
      });
      setActiveVotingSurveyId(null);
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > data.totalPages || isLoadingPage) return;

    startPageTransition(async () => {
      const res = await getCommunitySurveysAction(newPage, 50);
      setData(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const getSurveyTypeBadge = (type: string) => {
    switch (type) {
      case "boolean":
        return { label: "Yes / No Poll", color: "text-plasma-cyan bg-plasma-cyan/10 border-plasma-cyan/30" };
      case "single_choice":
        return { label: "Single Choice", color: "text-hyper-violet bg-hyper-violet/10 border-hyper-violet/30" };
      case "multiple_choice":
        return { label: "Multiple Choice", color: "text-rup-emerald bg-rup-emerald/10 border-rup-emerald/30" };
      default:
        return { label: "Community Poll", color: "text-gray-400 bg-void-deep border-void-border" };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-hyper-violet/20 via-void-surface to-plasma-cyan/15 border border-void-border/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-wider">
            <Vote className="w-3.5 h-3.5" />
            <span>{t("headerBadge")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t("headerTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            {t("headerDesc")}
          </p>
        </div>
      </div>

      {/* Surveys Count & Pagination Info Header */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>
          {t.rich("showingSurveys", {
            count: data.surveys.length,
            page: data.page,
            totalPages: data.totalPages,
            strong: (chunks) => <span className="text-white font-bold">{chunks}</span>,
          })}
        </span>
        <span className="text-[11px] font-mono text-gray-500">{t("strictly50")}</span>
      </div>

      {/* Surveys List */}
      {data.surveys.length === 0 ? (
        <div className="bg-void-surface/50 border border-void-border rounded-2xl p-12 text-center space-y-3">
          <Vote className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-200">{t("emptyTitle")}</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {t("emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.surveys.map((survey) => {
            const voteState = votedSurveys[survey.id];
            const hasUserVoted = survey.hasVoted || Boolean(voteState);
            const userChoiceIds = voteState?.userOptionIds || survey.userVotedOptionIds || [];
            const typeBadge = getSurveyTypeBadge(survey.survey_type);
            const isSubmittingThis = isVoting && activeVotingSurveyId === survey.id;
            const currentSelected = selectedOptions[survey.id] || [];

            return (
              <div
                key={survey.id}
                className="bg-void-surface/90 border border-void-border/80 hover:border-void-border rounded-2xl p-6 sm:p-7 shadow-lg transition-all duration-300 space-y-5"
              >
                {/* Survey Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-void-border/50 pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                      <Building2 className="w-3.5 h-3.5 text-hyper-violet shrink-0" />
                      <span>{survey.org_name}</span>
                    </div>
                    <span className="text-gray-600">·</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${typeBadge.color}`}>
                      <Layers className="w-2.5 h-2.5" />
                      {typeBadge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format.dateTime(new Date(survey.created_at), { dateStyle: "medium" })}
                    </span>
                    {/* Moderation Report Button */}
                    <ReportSurveyButton
                      surveyId={survey.id}
                      surveyQuestion={survey.question}
                    />

                    {/* Admin / Moderator Delete Button with Custom UI Confirmation Modal */}
                    {canModerate && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            disabled={deletingSurveyId === survey.id}
                            className="p-1 rounded-md text-gray-500 hover:text-nova-flare hover:bg-nova-flare/10 transition-colors disabled:opacity-50 cursor-pointer"
                            title={t("deleteStaffAction")}
                            aria-label={t("deleteSurvey")}
                          >
                            {deletingSurveyId === survey.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-nova-flare" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteDesc")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSurvey(survey.id)}
                            >
                              {t("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {/* Survey Question */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                    {survey.question}
                  </h3>
                </div>

                {/* Options Section: Voting Inputs OR Progress Bars */}
                <div className="space-y-3 pt-1">
                  {survey.options.map((option) => {
                    // Determine percentage: from live vote state if available, or initial calculation
                    const percentage = voteState?.percentages[option.id] !== undefined
                      ? voteState.percentages[option.id]
                      : (option.percentage ?? 0);

                    const isUserChoice = userChoiceIds.includes(option.id);
                    const isSelected = currentSelected.includes(option.id);

                    if (hasUserVoted) {
                      // POST-VOTE UX: Visual Progress Bars with Percentage (%) ONLY (no raw counts)
                      return (
                        <div key={option.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{option.option_text}</span>
                              {isUserChoice && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rup-emerald/20 text-rup-emerald text-[10px] font-bold shrink-0 border border-rup-emerald/40">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>{t("yourVote")}</span>
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-plasma-cyan ml-2 shrink-0">
                              {percentage}%
                            </span>
                          </div>

                          {/* Animated Progress Bar */}
                          <div className="w-full h-3 rounded-full bg-void-deep/90 border border-void-border/60 overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                isUserChoice
                                  ? "bg-gradient-to-r from-plasma-cyan to-rup-emerald shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                                  : "bg-gradient-to-r from-hyper-violet to-plasma-cyan/80"
                              }`}
                              style={{ width: `${Math.max(2, Math.min(100, percentage))}%` }}
                            />
                          </div>
                        </div>
                      );
                    }

                    // PRE-VOTE UX: Interactive Selectors
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleOptionToggle(survey, option.id)}
                        disabled={isSubmittingThis}
                        className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-plasma-cyan/10 border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.15)] ring-1 ring-plasma-cyan/40"
                            : "bg-void-deep/70 border-void-border/80 text-gray-300 hover:text-white hover:border-plasma-cyan/40 hover:bg-void-deep"
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-semibold">{option.option_text}</span>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            survey.survey_type !== "multiple_choice" ? "rounded-full" : ""
                          } ${
                            isSelected
                              ? "bg-plasma-cyan border-plasma-cyan text-void-deep font-bold"
                              : "border-void-border bg-void-surface"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Actions */}
                {!hasUserVoted && (
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <p className="text-[11px] text-gray-500">
                      {survey.survey_type === "multiple_choice"
                        ? t("selectMultiple")
                        : t("selectSingle")}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleVoteSubmit(survey)}
                      disabled={isSubmittingThis || currentSelected.length === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-plasma-cyan disabled:cursor-not-allowed shrink-0"
                    >
                      {isSubmittingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t("transmittingVote")}</span>
                        </>
                      ) : (
                        <>
                          <Vote className="w-3.5 h-3.5" />
                          <span>{t("castVote")}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 50-Item Pagination Bar */}
      {data.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-void-border/60">
          <span className="text-xs text-gray-400">
            {t.rich("paginationPage", {
              page: data.page,
              totalPages: data.totalPages,
              totalCount: data.totalCount,
              strong: (chunks) => <span className="text-white font-bold">{chunks}</span>,
            })}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(data.page - 1)}
              disabled={!data.hasPrevPage || isLoadingPage}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-void-border bg-void-surface text-xs font-bold text-gray-300 hover:text-white hover:border-plasma-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t("prevPage")}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePageChange(data.page + 1)}
              disabled={!data.hasNextPage || isLoadingPage}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-void-border bg-void-surface text-xs font-bold text-gray-300 hover:text-white hover:border-plasma-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span>{t("nextPage")}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
