"use client";

import { useState } from "react";
import { ArrowLeft, PlusCircle, UploadCloud, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createProject } from "./actions";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { MultiSelectTheme } from "@/components/MultiSelectTheme";
import { CountrySelect } from "@/components/CountrySelect";

export default function NewProjectPage() {
  const t = useTranslations("NewProject");
  const router = useRouter();
  
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("eligible_countries", selectedCountries.join(","));
    formData.set("themes", selectedThemes.join(","));

    const result = await createProject(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsPending(false);
    } else {
      router.push("/dashboard/projects");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="mb-2">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t("backHome")}</span>
        </Link>
      </div>
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <PlusCircle className="w-8 h-8 text-plasma-cyan" /> 
          {t("publishNew")}
        </h1>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-void-surface border border-void-border rounded-2xl p-8 space-y-8">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-void-border pb-2">{t("basicInfo")}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("title")}</label>
              <input type="text" name="title" required className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" placeholder={t("titlePlaceholder")} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("projectType")}</label>
              <select name="project_type" required className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan">
                <option value="Youth Exchange">Youth Exchange</option>
                <option value="Training">Training Course</option>
                <option value="ESC">Volunteering (ESC)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("destCountry")}</label>
              <CountrySelect name="dest_country" required defaultValue="" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("exactLocation")}</label>
              <input type="text" name="exact_location" className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" placeholder={t("cityRegionPlaceholder")} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("officialUrl")}</label>
              <input type="url" name="official_url" className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" placeholder={t("urlPlaceholder")} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("description")}</label>
            <textarea name="description" required rows={4} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" placeholder={t("descriptionPlaceholder")} />
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-void-border pb-2">{t("coverImage")}</h2>
          <div className="flex flex-col items-center justify-center w-full">
            <label htmlFor="cover_image" className="flex flex-col items-center justify-center w-full h-48 border-2 border-void-border border-dashed rounded-lg cursor-pointer bg-void-deep hover:bg-void-surface hover:border-plasma-cyan transition-all overflow-hidden relative">
              {previewImage ? (
                <Image src={previewImage} alt="Preview" fill className="object-cover opacity-60" />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-400 font-semibold">{t("clickToUpload")}</p>
                  <p className="text-xs text-gray-500">{t("uploadFormats")}</p>
                </div>
              )}
              <input id="cover_image" name="cover_image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
        </div>

        {/* Target & Age */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-void-border pb-2">{t("ageRange")} & Profile</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("minAge")}</label>
              <input type="number" name="min_age" defaultValue={18} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("maxAge")}</label>
              <input type="number" name="max_age" defaultValue={30} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("targetProfile")}</label>
              <input type="text" name="target_profile" className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" placeholder="e.g. Students" />
            </div>
          </div>
        </div>

        {/* Logistics */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-void-border pb-2">{t("logistics")}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("durationDays")}</label>
              <input type="number" name="duration_days" className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("travelBudgetMin")}</label>
              <input type="number" name="travel_budget_min" className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" placeholder="€" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("travelBudgetMax")}</label>
              <input type="number" name="travel_budget_max" className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" placeholder="€" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("participationFee")}</label>
              <input type="number" name="participation_fee" defaultValue={0} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t("financingType")}</label>
              <select name="financing_type" required className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan">
                <option value="Total">{t("financingTotal")}</option>
                <option value="Partial">{t("financingPartial")}</option>
                <option value="None">{t("financingNone")}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" name="accommodation_covered" className="w-4 h-4 rounded border-gray-600 bg-void-deep text-plasma-cyan focus:ring-plasma-cyan" />
              {t("accommodationCovered")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" name="covers_rup_flights" className="w-4 h-4 rounded border-gray-600 bg-void-deep text-rup-emerald focus:ring-rup-emerald" />
              <span className="text-rup-emerald">{t("rupFlights")}</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" name="is_last_minute" className="w-4 h-4 rounded border-gray-600 bg-void-deep text-nova-flare focus:ring-nova-flare" />
              <span className="text-nova-flare">{t("lastMinute")}</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t("eligibleCountries")}</label>
          <MultiSelectCountry 
            selected={selectedCountries} 
            onChange={setSelectedCountries} 
            placeholder={t("eligibleCountriesPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">{t("themes")}</label>
          <MultiSelectTheme 
            selected={selectedThemes} 
            onChange={setSelectedThemes} 
            placeholder={t("themesPlaceholder")}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-plasma-cyan hover:bg-plasma-cyan/90 text-void-deep font-bold py-4 px-6 rounded-lg transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] disabled:opacity-50 text-lg"
        >
          {isPending ? t("publishing") : t("publish")}
        </button>
      </form>
    </div>
  );
}
