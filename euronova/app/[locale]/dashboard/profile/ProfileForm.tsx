"use client";

import { useActionState, useState, useEffect } from "react";
import { updateProfile } from "./actions";
import { Save, Edit2, Building } from "lucide-react";
import { CountrySelect } from "@/components/CountrySelect";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function ProfileForm({ initialData, role }: { initialData: any, role: "youth" | "org" }) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const [state, action, isPending] = useActionState(updateProfile, null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRup, setIsRup] = useState(initialData?.is_rup_region || false);

  console.log("CLIENT DATA RECIBIDA:", initialData);
  
  const [data, setData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (state?.success) {
      if (state.data) setData(state.data);
      router.refresh();
      setIsEditing(false);
    }
  }, [state?.success, state?.data, router]);

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="bg-void-deep border border-void-border rounded-xl p-6 space-y-4">
          {role === "youth" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('fullName')}</p>
                <p className="font-semibold text-white mt-1">{data?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('birthDate')}</p>
                <p className="font-semibold text-white mt-1">{data?.birth_date || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('countryResident')}</p>
                <p className="font-semibold text-white mt-1">{data?.country_code || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('phone') || "Phone"}</p>
                <p className="font-semibold text-white mt-1">{data?.phone || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bio') || "Bio"}</p>
                <p className="text-sm text-gray-300 mt-1">{data?.bio || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('languages') || "Languages"}</p>
                <p className="text-sm text-gray-300 mt-1">{data?.languages?.join(", ") || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('rup')}</p>
                <p className={`font-semibold mt-1 ${data?.is_rup_region ? "text-rup-emerald" : "text-white"}`}>
                  {data?.is_rup_region ? "Sí" : "No"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-void-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-hyper-violet/20 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-hyper-violet" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{data?.org_name || "—"}</h3>
                    <p className="text-sm text-gray-400 font-mono">OID/PIC: <span className="text-gray-300">{data?.oid_number || "—"}</span></p>
                  </div>
                </div>
                {data?.verified ? (
                  <div className="px-3 py-1 rounded-full bg-rup-emerald/10 border border-rup-emerald flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse"></div>
                    <span className="text-xs font-bold text-rup-emerald uppercase tracking-wider">Entidad Verificada</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">En revisión</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('countryHq')}</p>
                  <p className="font-semibold text-white mt-1">{data?.country_hq || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('contactEmail') || "Contact Email"}</p>
                  <p className="font-semibold text-white mt-1">{data?.contact_email || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('website') || "Website"}</p>
                  {data?.website ? (
                    <a href={data.website.startsWith('http') ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-plasma-cyan hover:underline mt-1 inline-block">
                      {data.website}
                    </a>
                  ) : (
                    <p className="font-semibold text-white mt-1">—</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('description') || "Description/Mission"}</p>
                  <p className="text-sm text-gray-300 mt-1">{data?.description || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {state?.success && (
          <div className="p-3 rounded-lg bg-rup-emerald/20 border border-rup-emerald text-rup-emerald text-sm font-medium text-center animate-in zoom-in-95 duration-300">
            {state.success}
          </div>
        )}

        <button
          onClick={() => setIsEditing(true)}
          className={`w-full font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-white border
            ${role === "youth" 
              ? "border-plasma-cyan/30 hover:border-plasma-cyan hover:bg-plasma-cyan/10" 
              : "border-hyper-violet/30 hover:border-hyper-violet hover:bg-hyper-violet/10"
            }`}
        >
          <Edit2 className="w-5 h-5" />
          {t('editProfile') || "Edit Profile"}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <input type="hidden" name="role" value={role} />

      {role === "youth" ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('fullName')}</label>
            <input
              type="text"
              name="full_name"
              defaultValue={initialData?.full_name || ""}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder={t('fullNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('birthDate')}</label>
              <input
                type="date"
                name="birth_date"
                defaultValue={initialData?.birth_date || ""}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('countryResident')}</label>
              <CountrySelect 
                name="country_code" 
                defaultValue={initialData?.country_code || ""} 
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <input type="hidden" name="is_rup_region" value={isRup.toString()} />
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isRup} onChange={(e) => setIsRup(e.target.checked)} />
                <div className={`w-12 h-7 rounded-full transition-colors ${isRup ? 'bg-rup-emerald' : 'bg-void-deep border border-void-border'}`}></div>
                <div className={`absolute w-5 h-5 rounded-full bg-white top-1 transition-transform ${isRup ? 'translate-x-6' : 'translate-x-1'}`}></div>
              </div>
              <div>
                <span className={`block text-sm font-bold transition-colors ${isRup ? 'text-rup-emerald' : 'text-gray-300'}`}>{t('rup')}</span>
                <span className="text-xs text-gray-500">{t('rupDesc')}</span>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('phone') || "Phone"}</label>
            <input
              type="text"
              name="phone"
              defaultValue={initialData?.phone || ""}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('languages') || "Languages (comma separated)"}</label>
            <input
              type="text"
              name="languages"
              defaultValue={initialData?.languages?.join(", ") || ""}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder="ES, EN, FR..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('bio') || "Bio"}</label>
            <textarea
              name="bio"
              defaultValue={initialData?.bio || ""}
              rows={4}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('orgName')}</label>
            <input
              type="text"
              name="org_name"
              defaultValue={initialData?.org_name || ""}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
              placeholder={t('orgNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('picNumber') || "OID / PIC Number"}</label>
              <input
                type="text"
                name="oid_number"
                defaultValue={initialData?.oid_number || ""}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
                placeholder="Ej: E12345678"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('countryHq')}</label>
              <CountrySelect 
                name="country_hq" 
                defaultValue={initialData?.country_hq || ""} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('contactEmail') || "Contact Email"}</label>
              <input
                type="email"
                name="contact_email"
                defaultValue={initialData?.contact_email || ""}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">{t('website') || "Website"}</label>
              <input
                type="url"
                name="website"
                defaultValue={initialData?.website || ""}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('description') || "Description"}</label>
            <textarea
              name="description"
              defaultValue={initialData?.description || ""}
              rows={4}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
            />
          </div>
        </>
      )}

      {state?.error && (
        <div className="p-3 rounded-lg bg-nova-flare/20 border border-nova-flare text-nova-flare text-sm font-medium text-center">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3 rounded-lg bg-rup-emerald/20 border border-rup-emerald text-rup-emerald text-sm font-medium text-center animate-in zoom-in-95 duration-300">
          {state.success}
        </div>
      )}

      <div className="pt-4 border-t border-void-border flex gap-4">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-6 py-3 rounded-lg text-gray-400 hover:text-white transition-colors border border-void-border hover:border-gray-600"
        >
          {t('cancel') || "Cancel"}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className={`flex-1 font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-void-deep
            ${role === "youth" 
              ? "bg-plasma-cyan hover:bg-plasma-cyan/80 shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)]" 
              : "bg-hyper-violet hover:bg-hyper-violet/80 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
            } disabled:opacity-50`}
        >
          <Save className="w-5 h-5" />
          {isPending ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
