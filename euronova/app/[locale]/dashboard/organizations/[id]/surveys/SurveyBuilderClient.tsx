"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  Copy,
  Eye,
  Save,
  CheckCircle2,
  Type,
  ListFilter,
  UploadCloud,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  X,
  FileCheck2,
  Loader2,
  FileText,
  Users,
  ExternalLink,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { OrganizationNavTabs } from "@/components/OrganizationNavTabs";
import {
  QuestionType,
  DossierQuestion,
  DossierTemplate,
  DossierSubmission,
  getOrgDossierTemplatesAction,
  createDossierTemplateAction,
  updateDossierTemplateAction,
  deleteDossierTemplateAction,
  getOrgDossierSubmissionsAction,
  updateSubmissionStatusAction,
} from "@/actions/dossier";
import { createClient } from "@/utils/supabase/client";

interface SurveyBuilderClientProps {
  orgId: string;
  orgName?: string;
}

interface UploadedFileRecord {
  name: string;
  size: string;
  url: string;
}

const DEFAULT_QUESTIONS: DossierQuestion[] = [
  {
    id: "q-1",
    type: "long_text",
    title: "What is your primary motivation to participate in this European mobility exchange?",
    required: true,
    placeholder: "Share your background, interests, and what you hope to learn...",
  },
  {
    id: "q-2",
    type: "language_level",
    title: "What is your self-assessed English communication level?",
    required: true,
  },
  {
    id: "q-3",
    type: "file_upload",
    title: "Upload your CV or Curriculum Vitae (Europass or standard format)",
    required: false,
    placeholder: "PDF, DOCX up to 5MB",
  },
  {
    id: "q-4",
    type: "yes_no",
    title: "Do you require specific accessibility accommodations or travel support?",
    required: true,
  },
];

function generateQuestionId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function createQuestion(type: QuestionType): DossierQuestion {
  switch (type) {
    case "text":
      return {
        id: generateQuestionId(),
        type: "text",
        title: "What is your city and country of residence?",
        required: true,
        placeholder: "e.g. Valencia, Spain",
      };
    case "long_text":
      return {
        id: generateQuestionId(),
        type: "long_text",
        title: "Describe your previous international, community, or volunteering experience:",
        required: true,
        placeholder: "Type your detailed answer...",
      };
    case "single_choice":
      return {
        id: generateQuestionId(),
        type: "single_choice",
        title: "Select your preferred project workgroup:",
        required: true,
        options: ["Media & Communication", "Logistics & Workshops", "Eco Sustainability"],
      };
    case "multiple_choice":
      return {
        id: generateQuestionId(),
        type: "multiple_choice",
        title: "Which thematic workshops are you interested in leading?",
        required: false,
        options: ["Digital Storytelling", "Intercultural Dialogue", "Outdoor Activities"],
      };
    case "language_level":
      return {
        id: generateQuestionId(),
        type: "language_level",
        title: "Self-assessed working language level:",
        required: true,
      };
    case "file_upload":
      return {
        id: generateQuestionId(),
        type: "file_upload",
        title: "Attach your motivation letter or portfolio document:",
        required: false,
        placeholder: "PDF, DOC, DOCX up to 5MB",
      };
    case "yes_no":
      return {
        id: generateQuestionId(),
        type: "yes_no",
        title: "Will you travel using Green Travel (train, bus, carpooling)?",
        required: true,
      };
  }
}

export function SurveyBuilderClient({ orgId }: SurveyBuilderClientProps) {
  const t = useTranslations("SurveyBuilder");

  // Template collection state
  const [templates, setTemplates] = useState<DossierTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Template State
  const [templateTitle, setTemplateTitle] = useState("Youth Mobility Standard Application");
  const [templateDescription, setTemplateDescription] = useState("");
  const [questions, setQuestions] = useState<DossierQuestion[]>(DEFAULT_QUESTIONS);

  // View Mode: builder | preview | submissions
  const [activeTab, setActiveTab] = useState<"builder" | "preview" | "submissions">("builder");
  const [previewStep, setPreviewStep] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({});
  const [isSaving, startSaving] = useTransition();

  // Submissions State
  const [submissions, setSubmissions] = useState<DossierSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DossierSubmission | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  // File Upload Simulator State for Preview
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileRecord>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Templates & Submissions from backend
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setIsLoading(true);
        const [tplRes, subRes] = await Promise.all([
          getOrgDossierTemplatesAction(orgId),
          getOrgDossierSubmissionsAction(orgId),
        ]);

        if (!ignore) {
          if (tplRes.success && tplRes.templates.length > 0) {
            setTemplates(tplRes.templates);
            const initial = tplRes.templates[0];
            setSelectedTemplateId(initial.id);
            setTemplateTitle(initial.title);
            setTemplateDescription(initial.description || "");
            setQuestions(initial.questions.length > 0 ? initial.questions : DEFAULT_QUESTIONS);
          } else {
            // Create default template in memory if none exist
            const fallbackTpl: DossierTemplate = {
              id: `tpl-${Date.now()}`,
              org_id: orgId,
              title: "Youth Mobility Standard Application",
              description: "Standard application template for Erasmus+ Youth Exchanges and ESC.",
              questions: DEFAULT_QUESTIONS,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setTemplates([fallbackTpl]);
            setSelectedTemplateId(fallbackTpl.id);
            setTemplateTitle(fallbackTpl.title);
            setTemplateDescription(fallbackTpl.description || "");
            setQuestions(DEFAULT_QUESTIONS);
          }

          if (subRes.success && subRes.submissions) {
            setSubmissions(subRes.submissions);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load templates or submissions:", err);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [orgId]);

  // Switch Active Template
  const handleSelectTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(tpl.id);
    setTemplateTitle(tpl.title);
    setTemplateDescription(tpl.description || "");
    setQuestions(tpl.questions.length > 0 ? tpl.questions : DEFAULT_QUESTIONS);
    setPreviewStep(0);
    setPreviewAnswers({});
  };

  // Create New Template
  const handleCreateNewTemplate = () => {
    const newTitle = `Application Template #${templates.length + 1}`;
    startSaving(async () => {
      const res = await createDossierTemplateAction({
        orgId,
        title: newTitle,
        description: "Custom candidate dossier flow",
        questions: DEFAULT_QUESTIONS,
      });

      if (res.success && res.template) {
        setTemplates((prev) => [res.template!, ...prev]);
        setSelectedTemplateId(res.template.id);
        setTemplateTitle(res.template.title);
        setTemplateDescription(res.template.description || "");
        setQuestions(res.template.questions);
        toast.success(t("templateCreatedSuccess"));
      } else {
        toast.error(res.error || "Failed to create template");
      }
    });
  };

  // Duplicate Current Template
  const handleDuplicateTemplate = () => {
    const dupTitle = `${templateTitle} (Copy)`;
    startSaving(async () => {
      const res = await createDossierTemplateAction({
        orgId,
        title: dupTitle,
        description: templateDescription,
        questions: [...questions],
      });

      if (res.success && res.template) {
        setTemplates((prev) => [res.template!, ...prev]);
        setSelectedTemplateId(res.template.id);
        setTemplateTitle(res.template.title);
        setTemplateDescription(res.template.description || "");
        setQuestions(res.template.questions);
        toast.success(t("templateDuplicateSuccess"));
      } else {
        toast.error(res.error || "Failed to duplicate template");
      }
    });
  };

  // Delete Current Template
  const handleDeleteTemplate = () => {
    if (!selectedTemplateId) return;
    if (templates.length <= 1) {
      toast.error(t("minOneTemplateError"));
      return;
    }

    const confirmed = window.confirm(t("deleteTemplateConfirm"));
    if (!confirmed) return;

    const idToDelete = selectedTemplateId;
    startSaving(async () => {
      const res = await deleteDossierTemplateAction(idToDelete, orgId);
      if (res.success) {
        const remaining = templates.filter((t) => t.id !== idToDelete);
        setTemplates(remaining);
        if (remaining.length > 0) {
          const next = remaining[0];
          setSelectedTemplateId(next.id);
          setTemplateTitle(next.title);
          setTemplateDescription(next.description || "");
          setQuestions(next.questions);
        }
        toast.success(t("templateDeletedSuccess"));
      } else {
        toast.error(res.error || "Failed to delete template");
      }
    });
  };

  // Save Current Active Template
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (questions.length === 0) {
      toast.error(t("minOneQuestionError"));
      return;
    }

    startSaving(async () => {
      if (selectedTemplateId) {
        const res = await updateDossierTemplateAction({
          templateId: selectedTemplateId,
          orgId,
          title: templateTitle.trim() || "Candidate Application Dossier",
          description: templateDescription.trim(),
          questions,
        });

        if (res.success && res.template) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === selectedTemplateId ? res.template! : t))
          );
          toast.success(t("blueprintSavedSuccess"));
        } else {
          toast.error(res.error || "Failed to save template");
        }
      }
    });
  };

  // Question editing helpers
  const addQuestion = (type: QuestionType) => {
    const newQ = createQuestion(type);
    setQuestions((prev) => [...prev, newQ]);
    toast.info(t("addedQuestionTypeInfo", { type: type.replace("_", " ") }));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast.info(t("questionRemovedInfo"));
  };

  const duplicateQuestion = (q: DossierQuestion) => {
    const dup: DossierQuestion = {
      ...q,
      id: generateQuestionId(),
      title: `${q.title} (Copy)`,
    };
    setQuestions((prev) => [...prev, dup]);
    toast.success(t("questionClonedSuccess"));
  };

  const updateQuestionTitle = (id: string, title: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, title } : q)));
  };

  const toggleRequired = (id: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, required: !q.required } : q)));
  };

  const addOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const currentOpts = q.options || [];
        return {
          ...q,
          options: [...currentOpts, `Option ${currentOpts.length + 1}`],
        };
      })
    );
  };

  const updateOptionText = (qId: string, optIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || !q.options) return q;
        const newOpts = [...q.options];
        newOpts[optIndex] = text;
        return { ...q, options: newOpts };
      })
    );
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || !q.options) return q;
        return {
          ...q,
          options: q.options.filter((_, idx) => idx !== optIndex),
        };
      })
    );
  };

  // Preview interactions
  const handlePreviewAnswerChange = (qId: string, val: unknown) => {
    setPreviewAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(t("fileTooLarge2Mb"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const ALLOWED_MIME_TYPES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (
      !["pdf", "doc", "docx"].includes(extension) ||
      (file.type && !ALLOWED_MIME_TYPES.includes(file.type))
    ) {
      toast.error(t("invalidDocFormat"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingFile(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const supabase = createClient();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `surveys/${orgId}/${Date.now()}-${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { upsert: true });

      let publicUrl = "";
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      } else {
        publicUrl = `mock-storage://surveys/${cleanFileName}`;
      }

      const formattedSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      const record: UploadedFileRecord = {
        name: file.name,
        size: formattedSize,
        url: publicUrl,
      };

      setUploadedFiles((prev) => ({ ...prev, [questionId]: record }));
      handlePreviewAnswerChange(questionId, publicUrl);
      toast.success(t("docAttachedSuccess", { name: file.name }), { id: toastId });
    } catch {
      const formattedSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      const fallbackRecord: UploadedFileRecord = {
        name: file.name,
        size: formattedSize,
        url: `local://simulated-storage/${file.name}`,
      };
      setUploadedFiles((prev) => ({ ...prev, [questionId]: fallbackRecord }));
      handlePreviewAnswerChange(questionId, fallbackRecord.url);
      toast.success(t("docSimulatedSuccess", { name: file.name }), { id: toastId });
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveUploadedFile = (questionId: string) => {
    setUploadedFiles((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    handlePreviewAnswerChange(questionId, "");
    toast.info(t("docUnattachedInfo"));
  };

  const handleCompleteTestApplication = () => {
    const unansweredRequired = questions.filter(
      (q) => q.required && (!previewAnswers[q.id] || String(previewAnswers[q.id]).trim() === "")
    );

    if (unansweredRequired.length > 0) {
      toast.error(
        t("completeRequiredFieldsError", {
          count: unansweredRequired.length,
          title: unansweredRequired[0].title,
        })
      );
      const targetIndex = questions.findIndex((q) => q.id === unansweredRequired[0].id);
      if (targetIndex >= 0) setPreviewStep(targetIndex);
      return;
    }

    toast.success(t("simulationSuccess"));
  };

  // Submissions status update handler
  const handleUpdateStatus = (
    submissionId: string,
    status: "submitted" | "shortlisted" | "accepted" | "rejected"
  ) => {
    startSaving(async () => {
      const res = await updateSubmissionStatusAction({
        submissionId,
        orgId,
        status,
      });

      if (res.success) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === submissionId ? { ...s, status } : s))
        );
        if (selectedSubmission?.id === submissionId) {
          setSelectedSubmission((prev) => (prev ? { ...prev, status } : null));
        }
        toast.success(t("statusUpdatedSuccess", { status }));
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  // Filtered submissions by project
  const projectTitles = Array.from(new Set(submissions.map((s) => s.project_title || "Erasmus+ Mission")));
  const filteredSubmissions =
    projectFilter === "ALL"
      ? submissions
      : submissions.filter((s) => s.project_title === projectFilter);

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <OrganizationNavTabs orgId={orgId} isOwner={true} />

      {/* Top Banner & Multi-Template Manager Bar */}
      <div className="bg-void-surface/90 border border-void-border p-4 sm:p-5 rounded-2xl backdrop-blur-xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-void-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{t("manageTemplates")}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-void-deep border border-void-border text-gray-400">
                  {templates.length}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {t("subtitleTemplates")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewTemplate}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.2)] cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("createNewTemplate")}</span>
            </button>
          </div>
        </div>

        {/* Template Selector Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
              {t("selectTemplate")}:
            </span>
            <select
              value={selectedTemplateId || ""}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="bg-void-deep border border-void-border rounded-xl px-3 py-2 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-plasma-cyan max-w-md w-full"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  📋 {tpl.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDuplicateTemplate}
              title={t("duplicateTemplate")}
              className="p-2 rounded-xl bg-void-deep hover:bg-void-deep/80 border border-void-border text-gray-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-hyper-violet" />
              <span className="hidden sm:inline">{t("duplicate")}</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteTemplate}
              title={t("deleteTemplate")}
              disabled={templates.length <= 1}
              className="p-2 rounded-xl bg-void-deep hover:bg-nova-flare/10 border border-void-border hover:border-nova-flare/40 text-gray-300 hover:text-nova-flare text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5 text-nova-flare" />
              <span className="hidden sm:inline">{t("deleteTemplate")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-void-surface/80 border border-void-border p-3.5 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "builder"
                ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                : "text-gray-400 hover:text-white bg-void-deep"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Builder Mode ({questions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("preview");
              setPreviewStep(0);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-hyper-violet text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "text-gray-400 hover:text-white bg-void-deep"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{t("previewTitle")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "submissions"
                ? "bg-rup-emerald text-void-deep shadow-[0_0_15px_rgba(0,230,118,0.4)] font-black"
                : "text-gray-400 hover:text-white bg-void-deep"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>
              {t("submissionsTab")} ({submissions.length})
            </span>
          </button>
        </div>

        {activeTab !== "submissions" && (
          <button
            type="button"
            onClick={handleSaveForm}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-black text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("savingInCloud")}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t("saveBlueprint")}</span>
              </>
            )}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 rounded-3xl bg-void-surface/50 border border-void-border animate-pulse" />
      ) : activeTab === "builder" ? (
        /* BUILDER MODE */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Template Title Card */}
          <div className="bg-void-surface/80 border border-void-border rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("templateName")}
            </label>
            <input
              type="text"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              maxLength={200}
              placeholder={t("dossierTitlePlaceholder")}
              className="w-full text-lg sm:text-xl font-black text-white bg-transparent border-b border-void-border focus:border-plasma-cyan pb-2 outline-none transition-colors"
            />
            <input
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              maxLength={500}
              placeholder={t("templateDescription")}
              className="w-full text-xs text-gray-400 bg-transparent border-b border-void-border/50 focus:border-plasma-cyan pb-1 outline-none transition-colors"
            />
          </div>

          {/* Quick Question Injector with 7 Mobility Field Types */}
          <div className="p-4 rounded-2xl bg-void-deep border border-void-border space-y-2">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-plasma-cyan" />
              {t("addQuestionLabel")}
            </span>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { type: "text" as const, label: t("shortText"), icon: Type },
                { type: "long_text" as const, label: t("longText"), icon: BookOpen },
                { type: "single_choice" as const, label: t("singleChoice"), icon: ListFilter },
                { type: "multiple_choice" as const, label: t("multipleChoice"), icon: CheckSquare },
                { type: "language_level" as const, label: t("languageLevel"), icon: Sparkles },
                { type: "file_upload" as const, label: t("fileUpload"), icon: UploadCloud },
                { type: "yes_no" as const, label: t("yesNo"), icon: CheckCircle2 },
              ].map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.type}
                    type="button"
                    onClick={() => addQuestion(btn.type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-void-surface hover:bg-plasma-cyan/15 border border-void-border hover:border-plasma-cyan/40 text-gray-300 hover:text-plasma-cyan text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty state for builder */}
          {questions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-void-surface/50 border border-void-border text-center space-y-3">
              <ClipboardList className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">{t("noQuestionsBlueprint")}</h4>
              <p className="text-xs text-gray-400">{t("noQuestionsBlueprintDesc")}</p>
            </div>
          ) : (
            /* Questions List */
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-void-surface/90 border border-void-border rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4 group hover:border-void-border/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-void-deep border border-void-border text-[11px] font-mono font-bold flex items-center justify-center text-plasma-cyan shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => updateQuestionTitle(q.id, e.target.value)}
                        maxLength={300}
                        className="w-full font-bold text-white text-sm sm:text-base bg-transparent border-b border-transparent focus:border-plasma-cyan outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => duplicateQuestion(q)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-void-deep transition-all cursor-pointer"
                        title={t("duplicateQuestion")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 transition-all cursor-pointer"
                        title={t("deleteQuestion")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Options management for single/multiple choice */}
                  {(q.type === "single_choice" || q.type === "multiple_choice") && (
                    <div className="space-y-2 pl-8 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
                        {t("optionsList")}
                      </span>
                      {(q.options || []).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2 max-w-md">
                          <div className="w-3 h-3 rounded-full border border-void-border bg-void-deep shrink-0" />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOptionText(q.id, oIdx, e.target.value)}
                            maxLength={200}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-void-deep border border-void-border focus:border-plasma-cyan text-xs text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(q.id, oIdx)}
                            className="text-gray-500 hover:text-nova-flare cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(q.id)}
                        className="text-xs font-bold text-plasma-cyan hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        {t("addOption")}
                      </button>
                    </div>
                  )}

                  {/* Footer Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-void-border/70 text-xs">
                    <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                      {t("typeLabel", { type: q.type.replace("_", " ") })}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={() => toggleRequired(q.id)}
                        className="rounded accent-plasma-cyan cursor-pointer"
                      />
                      <span className="text-xs">{t("requiredQuestion")}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "preview" ? (
        /* LIVE PREVIEW MODE */
        <div className="bg-void-surface/90 border border-void-border rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
          <div className="space-y-2 pb-6 border-b border-void-border">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40">
              {t("candidatePreview")}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">{templateTitle}</h2>
            <p className="text-xs text-gray-400">
              {questions.length > 0
                ? `Step ${previewStep + 1} of ${questions.length} • Form simulator for organization testing`
                : "No questions configured yet."}
            </p>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <ClipboardList className="w-10 h-10 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-400">{t("noQuestionsPreview")}</p>
            </div>
          ) : (
            questions[previewStep] && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{questions[previewStep].title}</span>
                    {questions[previewStep].required && (
                      <span className="text-nova-flare font-bold">*</span>
                    )}
                  </h3>
                </div>

                {/* Text or Long Text */}
                {(questions[previewStep].type === "text" || questions[previewStep].type === "long_text") && (
                  <textarea
                    rows={questions[previewStep].type === "long_text" ? 5 : 2}
                    placeholder={questions[previewStep].placeholder || "Your detailed answer..."}
                    value={(previewAnswers[questions[previewStep].id] as string) || ""}
                    onChange={(e) => handlePreviewAnswerChange(questions[previewStep].id, e.target.value)}
                    maxLength={5000}
                    className="w-full p-4 rounded-2xl bg-void-deep border border-void-border focus:border-plasma-cyan text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  />
                )}

                {/* Single Choice */}
                {questions[previewStep].type === "single_choice" && (
                  <div className="space-y-2">
                    {(questions[previewStep].options || []).map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePreviewAnswerChange(questions[previewStep].id, opt)}
                        className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          previewAnswers[questions[previewStep].id] === opt
                            ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                            : "bg-void-deep border-void-border text-gray-300 hover:border-gray-700"
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full border ${
                            previewAnswers[questions[previewStep].id] === opt
                              ? "border-plasma-cyan bg-plasma-cyan"
                              : "border-gray-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Multiple Choice */}
                {questions[previewStep].type === "multiple_choice" && (
                  <div className="space-y-2">
                    {(questions[previewStep].options || []).map((opt, i) => {
                      const selected = (previewAnswers[questions[previewStep].id] as string[]) || [];
                      const isChecked = selected.includes(opt);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? selected.filter((o) => o !== opt)
                              : [...selected, opt];
                            handlePreviewAnswerChange(questions[previewStep].id, next);
                          }}
                          className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            isChecked
                              ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                              : "bg-void-deep border-void-border text-gray-300 hover:border-gray-700"
                          }`}
                        >
                          <span>{opt}</span>
                          <div
                            className={`w-4 h-4 rounded border ${
                              isChecked
                                ? "border-plasma-cyan bg-plasma-cyan"
                                : "border-gray-600"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Language Level */}
                {questions[previewStep].type === "language_level" && (
                  <select
                    value={(previewAnswers[questions[previewStep].id] as string) || ""}
                    onChange={(e) => handlePreviewAnswerChange(questions[previewStep].id, e.target.value)}
                    className="w-full p-4 rounded-2xl bg-void-deep border border-void-border focus:border-plasma-cyan text-sm text-white outline-none"
                  >
                    <option value="">{t("selectLevel")}</option>
                    <option value="A1">{t("levelA1")}</option>
                    <option value="A2">{t("levelA2")}</option>
                    <option value="B1">{t("levelB1")}</option>
                    <option value="B2">{t("levelB2")}</option>
                    <option value="C1">{t("levelC1")}</option>
                    <option value="C2">{t("levelC2")}</option>
                    <option value="Native">{t("levelNative")}</option>
                  </select>
                )}

                {/* Yes / No */}
                {questions[previewStep].type === "yes_no" && (
                  <div className="grid grid-cols-2 gap-3">
                    {["Yes", "No"].map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handlePreviewAnswerChange(questions[previewStep].id, choice)}
                        className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all cursor-pointer ${
                          previewAnswers[questions[previewStep].id] === choice
                            ? "bg-plasma-cyan/15 border-plasma-cyan text-plasma-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                            : "bg-void-deep border-void-border text-gray-300 hover:border-gray-700"
                        }`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                )}

                {/* File Upload */}
                {questions[previewStep].type === "file_upload" && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload(e, questions[previewStep].id)}
                      className="hidden"
                    />

                    {uploadedFiles[questions[previewStep].id] ? (
                      <div className="p-5 rounded-2xl bg-void-deep/90 border border-rup-emerald/40 shadow-[0_0_20px_rgba(0,230,118,0.15)] flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rup-emerald/20 border border-rup-emerald/40 flex items-center justify-center text-rup-emerald shrink-0">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {uploadedFiles[questions[previewStep].id].name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {uploadedFiles[questions[previewStep].id].size} • Ready
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedFile(questions[previewStep].id)}
                          className="p-2 text-gray-400 hover:text-nova-flare cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-8 rounded-2xl border-2 border-dashed border-void-border hover:border-plasma-cyan/60 bg-void-deep text-center space-y-3 cursor-pointer transition-all"
                      >
                        {isUploadingFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-plasma-cyan animate-spin" />
                            <p className="text-xs font-bold text-plasma-cyan">{t("uploadingDoc")}</p>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-8 h-8 text-plasma-cyan mx-auto" />
                            <div>
                              <p className="text-xs font-bold text-gray-200">{t("uploadPrompt")}</p>
                              <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                                {t("supportedFormats")}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Stepper Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-void-border">
                  <button
                    type="button"
                    disabled={previewStep === 0}
                    onClick={() => setPreviewStep((p) => p - 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-void-deep border border-void-border text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer text-xs font-bold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t("previous")}</span>
                  </button>

                  {previewStep < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setPreviewStep((p) => p + 1)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(0,229,255,0.3)] cursor-pointer"
                    >
                      <span>{t("nextQuestion")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteTestApplication}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rup-emerald text-void-deep font-black text-xs hover:brightness-110 shadow-[0_0_15px_rgba(0,230,118,0.3)] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t("completeTest")}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        /* CANDIDATE SUBMISSIONS TAB */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-void-surface/90 border border-void-border p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rup-emerald" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {t("filterByProject")}:
              </span>
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-void-deep border border-void-border rounded-xl px-3.5 py-2 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-plasma-cyan max-w-sm w-full"
            >
              <option value="ALL">{t("allProjectsFilter")} ({submissions.length})</option>
              {projectTitles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-void-surface/50 border border-void-border text-center space-y-3">
              <Users className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">{t("noSubmissions")}</h4>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSubmissions.map((sub) => {
                const statusBadge =
                  sub.status === "accepted"
                    ? "bg-rup-emerald/20 text-rup-emerald border-rup-emerald/40"
                    : sub.status === "shortlisted"
                    ? "bg-plasma-cyan/20 text-plasma-cyan border-plasma-cyan/40"
                    : sub.status === "rejected"
                    ? "bg-nova-flare/20 text-nova-flare border-nova-flare/40"
                    : "bg-hyper-violet/20 text-hyper-violet border-hyper-violet/40";

                return (
                  <div
                    key={sub.id}
                    className="bg-void-surface/90 border border-void-border rounded-2xl p-5 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {sub.user_name || "Applicant"}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${statusBadge}`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-xs text-plasma-cyan font-medium truncate">
                        {t("missionLabel", { title: sub.project_title || t("defaultMissionTitle") })}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono">
                        {t("submittedOn")}: {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedSubmission(sub)}
                        className="px-3.5 py-2 rounded-xl bg-void-deep hover:bg-void-surface border border-void-border text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-plasma-cyan" />
                        <span>{t("viewDossier")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(sub.id, "shortlisted")}
                        disabled={sub.status === "shortlisted"}
                        className="px-3 py-2 rounded-xl bg-plasma-cyan/15 hover:bg-plasma-cyan/25 border border-plasma-cyan/40 text-plasma-cyan text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                      >
                        {t("statusShortlisted")}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(sub.id, "accepted")}
                        disabled={sub.status === "accepted"}
                        className="px-3 py-2 rounded-xl bg-rup-emerald/15 hover:bg-rup-emerald/25 border border-rup-emerald/40 text-rup-emerald text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                      >
                        {t("statusAccepted")}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(sub.id, "rejected")}
                        disabled={sub.status === "rejected"}
                        className="px-3 py-2 rounded-xl bg-nova-flare/15 hover:bg-nova-flare/25 border border-nova-flare/40 text-nova-flare text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                      >
                        {t("statusRejected")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submission Detail Inspection Modal */}
          {selectedSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="bg-void-surface border border-void-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 relative custom-scrollbar">
                <div className="flex items-center justify-between border-b border-void-border pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {selectedSubmission.user_name || "Volunteer Applicant"}
                    </h3>
                    <p className="text-xs text-plasma-cyan">{selectedSubmission.project_title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-void-deep transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t("candidateAnswers")}
                  </h4>
                  {Object.entries(selectedSubmission.answers || {}).map(([key, val], i) => (
                    <div key={key} className="p-4 rounded-xl bg-void-deep border border-void-border space-y-1">
                      <p className="text-xs font-bold text-gray-400">Question #{i + 1} ({key})</p>
                      <div className="text-sm font-semibold text-white">
                        {Array.isArray(val) ? (
                          val.join(", ")
                        ) : typeof val === "string" && val.startsWith("http") ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-plasma-cyan hover:underline inline-flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{t("viewAttachedDocument")}</span>
                          </a>
                        ) : (
                          String(val || "—")
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-void-border">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedSubmission.id, "shortlisted")}
                      className="px-3 py-1.5 rounded-xl bg-plasma-cyan/20 text-plasma-cyan text-xs font-bold cursor-pointer"
                    >
                      {t("markShortlisted")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedSubmission.id, "accepted")}
                      className="px-3 py-1.5 rounded-xl bg-rup-emerald/20 text-rup-emerald text-xs font-bold cursor-pointer"
                    >
                      {t("markAccepted")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedSubmission.id, "rejected")}
                      className="px-3 py-1.5 rounded-xl bg-nova-flare/20 text-nova-flare text-xs font-bold cursor-pointer"
                    >
                      {t("markRejected")}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="px-4 py-2 rounded-xl bg-void-deep text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {t("closeDossierModal")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SurveyBuilderClient;
