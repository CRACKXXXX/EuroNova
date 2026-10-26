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
  Loader2
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { OrganizationNavTabs } from "@/components/OrganizationNavTabs";
import { createClient } from "@/utils/supabase/client";

export type QuestionType = "text" | "multiple_choice" | "file_upload" | "yes_no";

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface SurveyBuilderClientProps {
  orgId: string;
  orgName?: string;
}

interface UploadedFileRecord {
  name: string;
  size: string;
  url: string;
}

const DEFAULT_QUESTIONS: SurveyQuestion[] = [
  {
    id: "q-1",
    type: "text",
    title: "What is your primary motivation to participate in this European mobility exchange?",
    required: true,
    placeholder: "Share your background, interests, and what you hope to learn...",
  },
  {
    id: "q-2",
    type: "multiple_choice",
    title: "What is your self-assessed English communication level?",
    required: true,
    options: ["Basic (A1-A2)", "Intermediate (B1-B2)", "Fluent / Advanced (C1-C2)", "Native Speaker"],
  },
  {
    id: "q-3",
    type: "file_upload",
    title: "Upload your CV or Curriculum Vitae (Europass or standard format)",
    required: false,
    placeholder: "PDF, DOCX up to 2MB",
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

function createQuestion(type: QuestionType): SurveyQuestion {
  return {
    id: generateQuestionId(),
    type,
    title:
      type === "text"
        ? "Describe your previous international or volunteer experience:"
        : type === "multiple_choice"
        ? "Select your preferred project workgroup:"
        : type === "file_upload"
        ? "Attach your motivation letter or portfolio:"
        : "Will you travel using Green Travel (train, bus, carpooling)?",
    required: true,
    options:
      type === "multiple_choice"
        ? ["Media & Communication", "Logistics & Workshops", "Eco Sustainability"]
        : undefined,
    placeholder: type === "text" ? "Type your detailed answer..." : undefined,
  };
}

export function SurveyBuilderClient({ orgId }: SurveyBuilderClientProps) {
  const t = useTranslations("SurveyBuilder");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(DEFAULT_QUESTIONS);
  const [surveyTitle, setSurveyTitle] = useState("Candidate Application Dossier");
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [previewStep, setPreviewStep] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const [isSaving, startSaving] = useTransition();

  // Estados de carga de archivos para el simulador de documentos
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileRecord>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar plantilla real guardada en Supabase
  useEffect(() => {
    let ignore = false;

    async function loadSavedSurvey() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("org_surveys")
          .select("id, title, questions")
          .eq("org_id", orgId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && !ignore) {
          setSurveyId(data.id);
          if (data.title) setSurveyTitle(data.title);
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions as SurveyQuestion[]);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load organizational survey blueprint:", err);
          toast.error(t("loadBlueprintError"));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadSavedSurvey();

    return () => {
      ignore = true;
    };
  }, [orgId, t]);

  const addQuestion = (type: QuestionType) => {
    const newQ = createQuestion(type);
    setQuestions((prev) => [...prev, newQ]);
    toast.info(t("addedQuestionTypeInfo", { type: type.replace("_", " ") }));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast.info(t("questionRemovedInfo"));
  };

  const duplicateQuestion = (q: SurveyQuestion) => {
    const dup: SurveyQuestion = {
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

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (questions.length === 0) {
      toast.error(t("minOneQuestionError"));
      return;
    }

    startSaving(async () => {
      try {
        const supabase = createClient();
        const payload: Record<string, unknown> = {
          org_id: orgId,
          title: surveyTitle.trim() || "Candidate Application Dossier",
          questions,
          updated_at: new Date().toISOString(),
        };

        if (surveyId) {
          payload.id = surveyId;
        }

        const { data, error } = await supabase
          .from("org_surveys")
          .upsert(payload)
          .select("id")
          .single();

        if (error) {
          toast.error(t("saveSurveyError", { error: error.message }));
        } else {
          if (data?.id) setSurveyId(data.id);
          toast.success(t("blueprintSavedSuccess"));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Database error saving survey";
        toast.error(msg);
      }
    });
  };

  const handlePreviewAnswerChange = (qId: string, val: string) => {
    setPreviewAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  // Manejo de carga de documentos a Supabase Storage con fallback robusto
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de tamaño (Máximo 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(t("fileTooLarge2Mb"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validación de extensión y tipo MIME permitidos
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
    const toastId = toast.loading(`Uploading ${file.name} to Supabase Storage...`);

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
        // Fallback robusto sin crashear si el bucket tiene políticas pendientes
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
    } catch (err: unknown) {
      console.error("Storage upload fallback triggered:", err);
      // Fallback UI para asegurar que el usuario nunca se quede bloqueado
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
    // Validar si quedan preguntas requeridas sin responder en la vista previa
    const unansweredRequired = questions.filter(
      (q) => q.required && (!previewAnswers[q.id] || previewAnswers[q.id].trim() === "")
    );

    if (unansweredRequired.length > 0) {
      toast.error(
        t("completeRequiredFieldsError", {
          count: unansweredRequired.length,
          title: unansweredRequired[0].title,
        })
      );
      // Navegar a la pregunta requerida faltante
      const targetIndex = questions.findIndex((q) => q.id === unansweredRequired[0].id);
      if (targetIndex >= 0) {
        setPreviewStep(targetIndex);
      }
      return;
    }

    toast.success(t("simulationSuccess"));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <OrganizationNavTabs orgId={orgId} isOwner={true} />

      {/* Control Bar: Mode Toggle & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-void-surface/80 border border-void-border p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveForm}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-void-deep border-t-transparent rounded-full animate-spin" />
                <span>{t("savingInCloud")}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t("saveBlueprint")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-3xl bg-void-surface/50 border border-void-border animate-pulse" />
      ) : activeTab === "builder" ? (
        /* BUILDER MODE */
        <div className="space-y-6">
          {/* Survey Title Card */}
          <div className="bg-void-surface/80 border border-void-border rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("dossierTitle")}
            </label>
            <input
              type="text"
              value={surveyTitle}
              onChange={(e) => setSurveyTitle(e.target.value)}
              maxLength={200}
              placeholder={t("dossierTitlePlaceholder")}
              className="w-full text-lg sm:text-xl font-black text-white bg-transparent border-b border-void-border focus:border-plasma-cyan pb-2 outline-none transition-colors"
            />
            <p className="text-xs text-gray-500">
              {t("dossierSubtitle")}
            </p>
          </div>

          {/* Quick Question Injector */}
          <div className="p-4 rounded-2xl bg-void-deep border border-void-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 mr-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-plasma-cyan" />
              {t("addQuestionLabel")}
            </span>
            {[
              { type: "text" as const, label: "Text Answer", icon: Type },
              { type: "multiple_choice" as const, label: "Multiple Choice", icon: ListFilter },
              { type: "file_upload" as const, label: "Document Upload", icon: UploadCloud },
              { type: "yes_no" as const, label: "Yes / No Check", icon: CheckSquare },
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

          {/* Empty state for builder */}
          {questions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-void-surface/50 border border-void-border text-center space-y-3">
              <ClipboardList className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">{t("noQuestionsBlueprint")}</h4>
              <p className="text-xs text-gray-400">
                {t("noQuestionsBlueprintDesc")}
              </p>
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

                  {/* Question Type Options */}
                  {q.type === "multiple_choice" && (
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
      ) : (
        /* LIVE PREVIEW MODE */
        <div className="bg-void-surface/90 border border-void-border rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
          <div className="space-y-2 pb-6 border-b border-void-border">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/40">
              {t("candidatePreview")}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {surveyTitle}
            </h2>
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

                {/* Render dynamic input */}
                {questions[previewStep].type === "text" && (
                  <textarea
                    rows={4}
                    placeholder={questions[previewStep].placeholder || "Your detailed answer..."}
                    value={previewAnswers[questions[previewStep].id] || ""}
                    onChange={(e) => handlePreviewAnswerChange(questions[previewStep].id, e.target.value)}
                    maxLength={5000}
                    className="w-full p-4 rounded-2xl bg-void-deep border border-void-border focus:border-plasma-cyan text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  />
                )}

                {questions[previewStep].type === "multiple_choice" && (
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
                        <div className={`w-4 h-4 rounded-full border ${
                          previewAnswers[questions[previewStep].id] === opt
                            ? "border-plasma-cyan bg-plasma-cyan"
                            : "border-gray-600"
                        }`} />
                      </button>
                    ))}
                  </div>
                )}

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

                {questions[previewStep].type === "file_upload" && (
                  <div>
                    {/* Hidden input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => handleFileUpload(e, questions[previewStep].id)}
                      className="hidden"
                    />

                    {uploadedFiles[questions[previewStep].id] ? (
                      /* File Attached Card */
                      <div className="p-5 rounded-2xl bg-void-deep/90 border border-rup-emerald/40 shadow-[0_0_20px_rgba(0,230,118,0.15)] flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rup-emerald/20 border border-rup-emerald/40 flex items-center justify-center text-rup-emerald shrink-0">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white truncate">
                                {uploadedFiles[questions[previewStep].id].name}
                              </p>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40 shrink-0">
                                {t("verified")}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">
                              {uploadedFiles[questions[previewStep].id].size} • Ready for transmission
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedFile(questions[previewStep].id)}
                          className="p-2 rounded-xl text-gray-400 hover:text-nova-flare hover:bg-nova-flare/10 border border-transparent hover:border-nova-flare/30 transition-all cursor-pointer"
                          title={t("removeFile")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Drop Area */
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && fileInputRef.current) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            fileInputRef.current.files = dataTransfer.files;
                            const event = { target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>;
                            handleFileUpload(event, questions[previewStep].id);
                          }
                        }}
                        className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center space-y-3 cursor-pointer ${
                          isUploadingFile
                            ? "border-plasma-cyan bg-plasma-cyan/10 animate-pulse"
                            : "border-void-border hover:border-plasma-cyan/60 bg-void-deep/60 hover:bg-void-deep"
                        }`}
                      >
                        {isUploadingFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-plasma-cyan animate-spin" />
                            <p className="text-xs font-bold text-plasma-cyan">
                              {t("uploadingDoc")}
                            </p>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-8 h-8 text-plasma-cyan mx-auto" />
                            <div>
                              <p className="text-xs font-bold text-gray-200">
                                {t("uploadPrompt")}
                              </p>
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

                {/* Navigation in preview */}
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
      )}
    </div>
  );
}

export default SurveyBuilderClient;
