"use client";

import { useState, useTransition } from "react";
import { Edit3, X, Save, AlertCircle, Calendar, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateProjectAction } from "@/app/[locale]/dashboard/projects/[id]/actions";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { MultiSelectTheme } from "@/components/MultiSelectTheme";
import { CountrySelect } from "@/components/CountrySelect";
import { PROJECT_TYPES } from "@/lib/constants/projectTypes";
import Image from "next/image";

interface SimpleTemplateOption {
  id: string;
  title: string;
}

export interface ProjectEditInitialData {
  id: string;
  title: string;
  description: string;
  project_type: string;
  dest_country: string;
  exact_location?: string | null;
  official_url?: string | null;
  target_profile?: string | null;
  min_age: number;
  max_age: number;
  duration_days?: number | null;
  travel_budget_min?: number | null;
  travel_budget_max?: number | null;
  participation_fee?: number | null;
  financing_type?: string | null;
  covers_rup_flights: boolean;
  is_last_minute: boolean;
  accommodation_covered: boolean;
  themes?: string[] | null;
  eligible_countries?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  application_deadline?: string | null;
  participant_count?: number | null;
  application_form_id?: string | null;
  image_url?: string | null;
}

interface EditProjectModalProps {
  project: ProjectEditInitialData;
  dossierTemplates: SimpleTemplateOption[];
}

export function EditProjectModal({ project, dossierTemplates }: EditProjectModalProps) {
  const t = useTranslations("ProjectDetails");
  const tNew = useTranslations("NewProject");
  const tTypes = useTranslations("ProjectTypes");

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedCountries, setSelectedCountries] = useState<string[]>(project.eligible_countries || []);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(project.themes || []);
  const [previewImage, setPreviewImage] = useState<string | null>(project.image_url || null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error(tNew("invalidImageFormat"));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(tNew("fileTooLarge"));
      return;
    }

    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("eligible_countries", selectedCountries.join(","));
    formData.set("themes", selectedThemes.join(","));

    startTransition(async () => {
      const result = await updateProjectAction(project.id, formData);
      if (result?.error) {
        setErrorMessage(result.error);
        toast.error(result.error);
      } else {
        toast.success(t("saveChanges") + " ✨");
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-plasma-cyan bg-plasma-cyan/10 hover:bg-plasma-cyan/20 border border-plasma-cyan/30 text-sm cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.15)]"
      >
        <Edit3 className="w-4 h-4" />
        <span>{t("editProject")}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-void-surface border border-void-border rounded-3xl max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative custom-scrollbar">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-void-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{t("editMissionModalTitle")}</h2>
                  <p className="text-xs text-gray-400">ID: {project.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-void-deep transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-plasma-cyan">{tNew("basicInfo")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-300">{tNew("title")}</label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={project.title}
                      required
                      maxLength={150}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("projectType")}</label>
                    <select
                      name="project_type"
                      defaultValue={project.project_type}
                      required
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                    >
                      {PROJECT_TYPES.map((pt) => (
                        <option key={pt.code} value={pt.code}>
                          {pt.code} — {tTypes(pt.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("destCountry")}</label>
                    <CountrySelect name="dest_country" defaultValue={project.dest_country} required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("exactLocation")}</label>
                    <input
                      type="text"
                      name="exact_location"
                      defaultValue={project.exact_location || ""}
                      maxLength={150}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("officialUrl")}</label>
                    <input
                      type="url"
                      name="official_url"
                      defaultValue={project.official_url || ""}
                      maxLength={500}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">{tNew("description")}</label>
                  <textarea
                    name="description"
                    defaultValue={project.description}
                    required
                    rows={5}
                    maxLength={10000}
                    className="w-full bg-void-deep border border-void-border rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                  />
                </div>
              </div>

              {/* Attached Application Form Template */}
              <div className="space-y-3 bg-void-deep/80 p-4 rounded-2xl border border-void-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-plasma-cyan" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {tNew("attachedDossier")}
                  </h3>
                </div>
                <select
                  name="application_form_id"
                  defaultValue={project.application_form_id || ""}
                  className="w-full bg-void-deep border border-void-border rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-plasma-cyan"
                >
                  <option value="">{tNew("noDossierOption")}</option>
                  {dossierTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      📋 {template.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400">
                  {tNew("attachedDossierDesc")}
                </p>
              </div>

              {/* Dates & Capacity */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-plasma-cyan" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-plasma-cyan">
                    {tNew("planningAndDates")}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("startDate")}</label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={project.start_date || ""}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("endDate")}</label>
                    <input
                      type="date"
                      name="end_date"
                      defaultValue={project.end_date || ""}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("applicationDeadline")}</label>
                    <input
                      type="date"
                      name="application_deadline"
                      defaultValue={project.application_deadline || ""}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("participantCount")}</label>
                    <input
                      type="number"
                      name="participant_count"
                      defaultValue={project.participant_count || ""}
                      min={1}
                      max={500}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                </div>
              </div>

              {/* Age & Profile */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("minAge")}</label>
                    <input
                      type="number"
                      name="min_age"
                      defaultValue={project.min_age}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("maxAge")}</label>
                    <input
                      type="number"
                      name="max_age"
                      defaultValue={project.max_age}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("targetProfile")}</label>
                    <input
                      type="text"
                      name="target_profile"
                      defaultValue={project.target_profile || ""}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                </div>
              </div>

              {/* Logistics */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("durationDays")}</label>
                    <input
                      type="number"
                      name="duration_days"
                      defaultValue={project.duration_days || ""}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("travelBudgetMin")}</label>
                    <input
                      type="number"
                      name="travel_budget_min"
                      defaultValue={project.travel_budget_min || ""}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("travelBudgetMax")}</label>
                    <input
                      type="number"
                      name="travel_budget_max"
                      defaultValue={project.travel_budget_max || ""}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">{tNew("participationFee")}</label>
                    <input
                      type="number"
                      name="participation_fee"
                      defaultValue={project.participation_fee || 0}
                      className="w-full bg-void-deep border border-void-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-plasma-cyan"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="accommodation_covered"
                      defaultChecked={project.accommodation_covered}
                      className="w-4 h-4 rounded border-gray-600 bg-void-deep text-plasma-cyan focus:ring-plasma-cyan"
                    />
                    {tNew("accommodationCovered")}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="covers_rup_flights"
                      defaultChecked={project.covers_rup_flights}
                      className="w-4 h-4 rounded border-gray-600 bg-void-deep text-rup-emerald focus:ring-rup-emerald"
                    />
                    <span className="text-rup-emerald">{tNew("rupFlights")}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_last_minute"
                      defaultChecked={project.is_last_minute}
                      className="w-4 h-4 rounded border-gray-600 bg-void-deep text-nova-flare focus:ring-nova-flare"
                    />
                    <span className="text-nova-flare">{tNew("lastMinute")}</span>
                  </label>
                </div>
              </div>

              {/* Eligible Countries & Themes */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">{tNew("eligibleCountries")}</label>
                  <MultiSelectCountry
                    selected={selectedCountries}
                    onChange={setSelectedCountries}
                    placeholder={tNew("eligibleCountriesPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">{tNew("themes")}</label>
                  <MultiSelectTheme
                    selected={selectedThemes}
                    onChange={setSelectedThemes}
                    placeholder={tNew("themesPlaceholder")}
                  />
                </div>
              </div>

              {/* Cover Image Replacement */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">{tNew("coverImage")}</label>
                <div className="flex items-center gap-4">
                  {previewImage && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden relative border border-void-border shrink-0">
                      <Image src={previewImage} alt="Cover Preview" fill className="object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    name="cover_image"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageChange}
                    className="text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-void-deep file:text-plasma-cyan hover:file:bg-plasma-cyan/10 cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-void-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-void-border text-gray-300 hover:text-white hover:bg-void-deep text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep text-xs font-black shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("saveChanges")}...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t("saveChanges")}</span>
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

