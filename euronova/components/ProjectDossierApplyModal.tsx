"use client";

import { useState, useTransition, useRef } from "react";
import {
  FileText,
  CheckCircle2,
  X,
  UploadCloud,
  FileCheck2,
  Trash2,
  Loader2,
  Sparkles,
  Eye,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DossierTemplate,
  DossierSubmission,
  submitProjectDossierAction,
} from "@/actions/dossier";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface ProjectDossierApplyModalProps {
  projectId: string;
  projectTitle: string;
  orgName: string;
  template: DossierTemplate;
  initialSubmission?: DossierSubmission | null;
  isLoggedIn: boolean;
  userEmail?: string;
  locale: string;
}

export function ProjectDossierApplyModal({
  projectId,
  projectTitle,
  orgName,
  template,
  initialSubmission,
  isLoggedIn,
  locale,
}: ProjectDossierApplyModalProps) {
  const t = useTranslations("ProjectDetails");
  const tBuilder = useTranslations("SurveyBuilder");
  const tErrors = useTranslations("Errors");

  const [isOpen, setIsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [submission, setSubmission] = useState<DossierSubmission | null>(
    initialSubmission || null
  );

  const [answers, setAnswers] = useState<Record<string, unknown>>(
    (initialSubmission?.answers as Record<string, unknown>) || {}
  );
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; url: string; size: string }>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleMultipleChoiceToggle = (qId: string, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[qId]) ? (prev[qId] as string[]) : [];
      if (current.includes(option)) {
        return { ...prev, [qId]: current.filter((o) => o !== option) };
      } else {
        return { ...prev, [qId]: [...current, option] };
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, qId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(tBuilder("fileTooLarge2Mb"));
      return;
    }

    const ALLOWED = ["pdf", "doc", "docx"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED.includes(ext)) {
      toast.error(tBuilder("invalidDocFormat"));
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const supabase = createClient();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `candidates/${projectId}/${Date.now()}-${cleanFileName}`;

      const { data, error } = await supabase.storage.from("documents").upload(storagePath, file, { upsert: true });

      let publicUrl = "";
      if (!error && data) {
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      } else {
        publicUrl = `mock-storage://candidates/${cleanFileName}`;
      }

      const record = {
        name: file.name,
        url: publicUrl,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      };

      setUploadedFiles((prev) => ({ ...prev, [qId]: record }));
      setAnswers((prev) => ({ ...prev, [qId]: publicUrl }));
      toast.success(tBuilder("docAttachedSuccess", { name: file.name }), { id: toastId });
    } catch {
      const record = {
        name: file.name,
        url: `local://simulated-storage/${file.name}`,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      };
      setUploadedFiles((prev) => ({ ...prev, [qId]: record }));
      setAnswers((prev) => ({ ...prev, [qId]: record.url }));
      toast.success(tBuilder("docSimulatedSuccess", { name: file.name }), { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (qId: string) => {
    setUploadedFiles((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
    toast.info(tBuilder("docUnattachedInfo"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify required questions
    for (const q of template.questions) {
      if (q.required) {
        const ans = answers[q.id];
        const isEmpty =
          ans === undefined ||
          ans === null ||
          (typeof ans === "string" && ans.trim() === "") ||
          (Array.isArray(ans) && ans.length === 0);

        if (isEmpty) {
          toast.error(tBuilder("completeRequiredFieldsError", { count: 1, title: q.title }));
          return;
        }
      }
    }

    startTransition(async () => {
      const res = await submitProjectDossierAction({
        projectId,
        surveyId: template.id,
        answers,
      });

      if (!res.success) {
        if (res.error === "RATE_LIMIT_EXCEEDED") {
          toast.warning(tErrors("rateLimitExceeded"), { id: "rate-limit-toast", icon: "⏳" });
        } else {
          toast.error(res.error || "Submission failed.");
        }
        return;
      }

      toast.success(t("submissionSuccessToast"), { icon: "🚀" });
      setSubmission({
        id: res.submissionId || `sub-${Date.now()}`,
        project_id: projectId,
        survey_id: template.id,
        user_id: "me",
        answers,
        status: "submitted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsOpen(false);
    });
  };

  // 1. If already submitted: show prominent confirmation and review card
  if (submission) {
    const statusColor =
      submission.status === "accepted"
        ? "bg-rup-emerald/20 text-rup-emerald border-rup-emerald/40"
        : submission.status === "shortlisted"
        ? "bg-plasma-cyan/20 text-plasma-cyan border-plasma-cyan/40"
        : submission.status === "rejected"
        ? "bg-nova-flare/20 text-nova-flare border-nova-flare/40"
        : "bg-hyper-violet/20 text-hyper-violet border-hyper-violet/40";

    return (
      <div className="p-5 rounded-2xl bg-void-deep border border-plasma-cyan/30 shadow-[0_0_20px_rgba(0,229,255,0.15)] space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-rup-emerald shrink-0" />
            <div>
              <p className="text-sm font-black text-white">{t("dossierSubmittedBadge")}</p>
              <p className="text-[11px] text-gray-400">{t("applicationReviewNotice")}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusColor}`}>
            {submission.status}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsViewOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-void-surface hover:bg-void-surface/80 border border-void-border text-gray-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Eye className="w-4 h-4 text-plasma-cyan" />
          <span>{t("viewMySubmission")}</span>
        </button>

        {/* View Submitted Dossier Modal */}
        {isViewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-void-surface border border-void-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 relative custom-scrollbar">
              <div className="flex items-center justify-between border-b border-void-border pb-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-plasma-cyan" />
                  <h3 className="text-lg font-black text-white">{template.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-void-deep transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {template.questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-void-deep border border-void-border space-y-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {idx + 1}. {q.title}
                    </p>
                    <div className="text-sm font-semibold text-white">
                      {Array.isArray(answers[q.id]) ? (
                        (answers[q.id] as string[]).join(", ")
                      ) : typeof answers[q.id] === "string" && (answers[q.id] as string).startsWith("http") ? (
                        <a
                          href={answers[q.id] as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-plasma-cyan hover:underline inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{tBuilder("attachedDocument")}</span>
                        </a>
                      ) : (
                        String(answers[q.id] || "—")
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep text-xs font-bold cursor-pointer hover:bg-plasma-cyan/90 transition-all"
                >
                  {tBuilder("closeDossierModal")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. If not logged in: Prompt login
  if (!isLoggedIn) {
    return (
      <Link
        href={`/${locale}/auth/login`}
        className="w-full px-6 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-void-deep bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-[0.98] text-lg cursor-pointer"
      >
        <FileText className="w-5 h-5" />
        <span>{t("applyWithDossier")}</span>
      </Link>
    );
  }

  // 3. Logged in and not yet submitted: Interactive Application Modal
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-6 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-void-deep bg-plasma-cyan hover:bg-plasma-cyan/90 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-[0.98] text-lg cursor-pointer group"
      >
        <Sparkles className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
        <span>{t("applyWithDossier")}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-void-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative custom-scrollbar">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-void-border pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30">
                  {orgName}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {template.title}
                </h2>
                <p className="text-xs text-gray-400">{projectTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {template.questions.map((q, idx) => (
                <div key={q.id} className="space-y-2 bg-void-deep/70 p-4 sm:p-5 rounded-2xl border border-void-border">
                  <label className="block text-sm font-bold text-white">
                    <span>{idx + 1}. {q.title}</span>
                    {q.required && <span className="text-nova-flare ml-1 font-bold">*</span>}
                  </label>

                  {/* Short Text */}
                  {q.type === "text" && (
                    <input
                      type="text"
                      required={q.required}
                      placeholder={q.placeholder || "Your answer..."}
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      maxLength={500}
                      className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                    />
                  )}

                  {/* Long Motivation Text */}
                  {q.type === "long_text" && (
                    <textarea
                      required={q.required}
                      rows={4}
                      placeholder={q.placeholder || "Share your motivations, relevant experience, and expectations..."}
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      maxLength={5000}
                      className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                    />
                  )}

                  {/* Single Choice */}
                  {q.type === "single_choice" && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                            answers[q.id] === opt
                              ? "bg-plasma-cyan/15 border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                              : "bg-void-deep border-void-border text-gray-300 hover:border-gray-600"
                          }`}
                        >
                          <span>{opt}</span>
                          <input
                            type="radio"
                            name={`choice-${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => handleTextChange(q.id, opt)}
                            className="accent-plasma-cyan"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Multiple Choice */}
                  {q.type === "multiple_choice" && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt) => {
                        const selectedList = (answers[q.id] as string[]) || [];
                        const isChecked = selectedList.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                              isChecked
                                ? "bg-plasma-cyan/15 border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                                : "bg-void-deep border-void-border text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            <span>{opt}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleMultipleChoiceToggle(q.id, opt)}
                              className="accent-plasma-cyan rounded"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Language Level */}
                  {q.type === "language_level" && (
                    <select
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      required={q.required}
                      className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                    >
                      <option value="">{tBuilder("selectLanguageLevel")}</option>
                      <option value="A1">{tBuilder("levelA1")}</option>
                      <option value="A2">{tBuilder("levelA2")}</option>
                      <option value="B1">{tBuilder("levelB1")}</option>
                      <option value="B2">{tBuilder("levelB2")}</option>
                      <option value="C1">{tBuilder("levelC1")}</option>
                      <option value="C2">{tBuilder("levelC2")}</option>
                      <option value="Native">{tBuilder("levelNative")}</option>
                    </select>
                  )}

                  {/* Yes / No */}
                  {q.type === "yes_no" && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {["Yes", "No"].map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => handleTextChange(q.id, choice)}
                          className={`p-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                            answers[q.id] === choice
                              ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                              : "bg-void-deep border-void-border text-gray-300 hover:border-gray-700"
                          }`}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* File / CV Upload */}
                  {q.type === "file_upload" && (
                    <div className="pt-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, q.id)}
                        className="hidden"
                      />
                      {uploadedFiles[q.id] ? (
                        <div className="p-3.5 rounded-xl bg-void-deep border border-rup-emerald/40 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileCheck2 className="w-5 h-5 text-rup-emerald shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {uploadedFiles[q.id].name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                {uploadedFiles[q.id].size}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(q.id)}
                            className="p-1.5 text-gray-400 hover:text-nova-flare transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className={`p-5 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
                            isUploading
                              ? "border-plasma-cyan bg-plasma-cyan/10 animate-pulse"
                              : "border-void-border hover:border-plasma-cyan/60 bg-void-deep"
                          }`}
                        >
                          <UploadCloud className="w-6 h-6 text-plasma-cyan mx-auto mb-1.5" />
                          <p className="text-xs font-bold text-gray-300">{tBuilder("uploadPrompt")}</p>
                          <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">
                            {tBuilder("supportedFormats")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-void-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-void-border text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep text-xs font-black shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{tBuilder("transmittingDossier")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{tBuilder("submitApplicationXp")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

