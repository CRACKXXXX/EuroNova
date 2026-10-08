"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import { updateProfile, deleteMyAccount } from "./actions";
import { Save, Edit2, Building, Trash2, AlertTriangle, User, Upload } from "lucide-react";
import { CountrySelect } from "@/components/CountrySelect";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function ProfileForm({ initialData, role }: { initialData: Record<string, unknown> | null, role: "youth" | "org" }) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const [state, action, isPending] = useActionState(updateProfile, null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRup, setIsRup] = useState(initialData?.is_rup_region || false);
  const [isDeleting, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>((initialData?.avatar_url as string) || null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const executeDelete = () => {
    startTransition(async () => {
      setDeleteError(null);
      const result = await deleteMyAccount();
      if (result?.error) {
        setDeleteError(result.error);
      }
    });
  };

  console.log("CLIENT DATA RECIBIDA:", initialData);
  
  useEffect(() => {
    if (state?.success) {
      router.refresh();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false);
    }
  }, [state?.success, router]);

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="bg-void-deep border border-void-border rounded-xl p-6 space-y-4">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className={`w-24 h-24 rounded-full border-2 overflow-hidden flex items-center justify-center bg-void-surface ${role === "youth" ? "border-plasma-cyan" : "border-hyper-violet"}`}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : role === "youth" ? (
                <User className="w-10 h-10 text-plasma-cyan/50" />
              ) : (
                <Building className="w-10 h-10 text-hyper-violet/50" />
              )}
            </div>
          </div>
          {role === "youth" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('fullName')}</p>
                <p className="font-semibold text-white mt-1">{initialData?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('birthDate')}</p>
                <p className="font-semibold text-white mt-1">{initialData?.birth_date || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('countryResident')}</p>
                <p className="font-semibold text-white mt-1">{initialData?.country_code || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('phone') || "Phone"}</p>
                <p className="font-semibold text-white mt-1">{initialData?.phone || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('bio') || "Bio"}</p>
                <p className="text-sm text-gray-300 mt-1">{initialData?.bio || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('languages') || "Languages"}</p>
                <p className="text-sm text-gray-300 mt-1">{initialData?.languages?.join(", ") || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('rup')}</p>
                <p className={`font-semibold mt-1 ${initialData?.is_rup_region ? "text-rup-emerald" : "text-white"}`}>
                  {initialData?.is_rup_region ? "Sí" : "No"}
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
                    <h3 className="text-xl font-bold text-white">{initialData?.org_name || "—"}</h3>
                    <p className="text-sm text-gray-400 font-mono">OID/PIC: <span className="text-gray-300">{initialData?.oid_number || "—"}</span></p>
                  </div>
                </div>
                {initialData?.verification_status === 'verified' ? (
                  <div className="px-3 py-1 rounded-full bg-rup-emerald/10 border border-rup-emerald flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse"></div>
                    <span className="text-xs font-bold text-rup-emerald uppercase tracking-wider">Entidad Verificada</span>
                  </div>
                ) : initialData?.verification_status === 'rejected' ? (
                  <div className="px-3 py-1 rounded-full bg-nova-flare/10 border border-nova-flare/30 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-nova-flare"></div>
                    <span className="text-xs font-bold text-nova-flare uppercase tracking-wider">Rechazada</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Pendiente de verificación</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('countryHq')}</p>
                  <p className="font-semibold text-white mt-1">{initialData?.country_hq || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('contactEmail') || "Contact Email"}</p>
                  <p className="font-semibold text-white mt-1">{initialData?.contact_email || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('website') || "Website"}</p>
                  {initialData?.website ? (
                    <a href={initialData.website.startsWith('http') ? initialData.website : `https://${initialData.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-plasma-cyan hover:underline mt-1 inline-block">
                      {initialData.website}
                    </a>
                  ) : (
                    <p className="font-semibold text-white mt-1">—</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('description') || "Description/Mission"}</p>
                  <p className="text-sm text-gray-300 mt-1">{initialData?.description || "—"}</p>
                </div>
                <div className="md:col-span-2 mt-2 pt-4 border-t border-void-border/50">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('socialMedia') || "Social Media"}</p>
                  <div className="flex flex-col gap-2 text-sm">
                    {initialData?.social_instagram && <a href={initialData.social_instagram as string} target="_blank" rel="noopener noreferrer" className="text-plasma-cyan hover:underline">Instagram: {initialData.social_instagram as string}</a>}
                    {initialData?.social_tiktok && <a href={initialData.social_tiktok as string} target="_blank" rel="noopener noreferrer" className="text-plasma-cyan hover:underline">TikTok: {initialData.social_tiktok as string}</a>}
                    {initialData?.social_youtube && <a href={initialData.social_youtube as string} target="_blank" rel="noopener noreferrer" className="text-plasma-cyan hover:underline">YouTube: {initialData.social_youtube as string}</a>}
                    {initialData?.social_linkedin && <a href={initialData.social_linkedin as string} target="_blank" rel="noopener noreferrer" className="text-plasma-cyan hover:underline">LinkedIn: {initialData.social_linkedin as string}</a>}
                    {!initialData?.social_instagram && !initialData?.social_tiktok && !initialData?.social_youtube && !initialData?.social_linkedin && <span className="text-gray-500">—</span>}
                  </div>
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

        <div className="mt-8 p-6 rounded-xl border border-red-500/30 bg-red-500/10 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-red-400">{t('dangerZone')}</h3>
            <p className="text-sm text-gray-400 mt-1">{t('dangerZoneDesc')}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            type="button"
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50"
          >
            <Trash2 className="w-5 h-5" />
            {t('deleteAccount')}
          </button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4">
            <div className="bg-void-surface border border-red-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,0,0,0.15)] animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white">{t('modalTitle')}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t('modalDesc')}
                </p>

                {deleteError && (
                  <div className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mt-4">
                    {deleteError}
                  </div>
                )}

                <div className="w-full flex flex-col gap-3 mt-8">
                  <button
                    onClick={() => { setIsModalOpen(false); setDeleteError(null); }}
                    disabled={isDeleting}
                    type="button"
                    className="w-full py-3 rounded-lg font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 disabled:opacity-50"
                  >
                    {t('cancelDelete')}
                  </button>
                  <button
                    onClick={executeDelete}
                    disabled={isDeleting}
                    type="button"
                    className="w-full py-3 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <span className="animate-pulse">...</span> : t('confirmDelete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <input type="hidden" name="role" value={role} />

      <div className="flex flex-col items-center justify-center space-y-4 mb-8">
        <div className={`w-24 h-24 rounded-full border-2 overflow-hidden flex items-center justify-center relative group bg-void-surface ${role === "youth" ? "border-plasma-cyan" : "border-hyper-violet"}`}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : role === "youth" ? (
            <User className="w-10 h-10 text-plasma-cyan/50" />
          ) : (
            <Building className="w-10 h-10 text-hyper-violet/50" />
          )}
          <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <Upload className="w-6 h-6 text-white mb-1" />
            <span className="text-[10px] text-white font-medium uppercase">Subir</span>
            <input type="file" name="avatar" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>
      </div>

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
              defaultValue={initialData?.description as string || ""}
              rows={4}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-void-border/50">
            <h4 className="text-sm font-medium text-gray-300">{t('socialMedia') || "Social Media"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="url" name="social_instagram" defaultValue={initialData?.social_instagram as string || ""} placeholder={t('instagram') || "Instagram URL"} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm" />
              <input type="url" name="social_tiktok" defaultValue={initialData?.social_tiktok as string || ""} placeholder={t('tiktok') || "TikTok URL"} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm" />
              <input type="url" name="social_youtube" defaultValue={initialData?.social_youtube as string || ""} placeholder={t('youtube') || "YouTube URL"} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm" />
              <input type="url" name="social_linkedin" defaultValue={initialData?.social_linkedin as string || ""} placeholder={t('linkedin') || "LinkedIn URL"} className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm" />
            </div>
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

      <div className="mt-8 p-6 rounded-xl border border-red-500/30 bg-red-500/10 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-red-400">{t('dangerZone')}</h3>
          <p className="text-sm text-gray-400 mt-1">{t('dangerZoneDesc')}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          type="button"
          className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50"
        >
          <Trash2 className="w-5 h-5" />
          {t('deleteAccount')}
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4">
          <div className="bg-void-surface border border-red-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,0,0,0.15)] animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">{t('modalTitle')}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t('modalDesc')}
              </p>

              {deleteError && (
                <div className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mt-4">
                  {deleteError}
                </div>
              )}

              <div className="w-full flex flex-col gap-3 mt-8">
                <button
                  onClick={() => { setIsModalOpen(false); setDeleteError(null); }}
                  disabled={isDeleting}
                  type="button"
                  className="w-full py-3 rounded-lg font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 disabled:opacity-50"
                >
                  {t('cancelDelete')}
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isDeleting}
                  type="button"
                  className="w-full py-3 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <span className="animate-pulse">...</span> : t('confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
