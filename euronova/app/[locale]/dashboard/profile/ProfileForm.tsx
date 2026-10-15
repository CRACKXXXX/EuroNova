"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import { updateProfile, deleteMyAccount, ProfileActionState } from "./actions";
import {
  Save,
  Edit2,
  Building,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  User,
  Upload,
} from "lucide-react";
import { CountrySelect } from "@/components/CountrySelect";
import { COUNTRIES } from "@/lib/constants/countries";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

function getString(
  data: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!data || !(key in data)) return "";
  const val = data[key];
  return typeof val === "string" ? val : "";
}

function getStringArray(
  data: Record<string, unknown> | null | undefined,
  key: string
): string[] {
  if (!data || !(key in data)) return [];
  const val = data[key];
  return Array.isArray(val)
    ? val.filter((item): item is string => typeof item === "string")
    : [];
}

function getBoolean(
  data: Record<string, unknown> | null | undefined,
  key: string
): boolean {
  if (!data || !(key in data)) return false;
  return Boolean(data[key]);
}

interface ProfileFormProps {
  initialData: Record<string, unknown> | null;
  role: "youth" | "org";
}

export function ProfileForm({ initialData, role }: ProfileFormProps) {
  const t = useTranslations("Profile");
  const router = useRouter();

  const [state, action, isPending] = useActionState<ProfileActionState, FormData>(
    updateProfile,
    null
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isRup, setIsRup] = useState<boolean>(getBoolean(initialData, "is_rup_region"));
  const [isDeleting, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [avatarLocalPreview, setAvatarLocalPreview] = useState<string | null>(null);

  const currentData = state?.data || initialData;
  const displayedAvatar =
    avatarLocalPreview || getString(currentData, "avatar_url") || null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarLocalPreview(URL.createObjectURL(file));
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

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false);
      setAvatarLocalPreview(null);
    }
  }, [state?.success, router]);

  if (!isEditing) {
    const youthFullName = getString(currentData, "full_name");
    const youthBirthDate = getString(currentData, "birth_date");
    const youthCountryCode = getString(currentData, "country_code");
    const youthPhone = getString(currentData, "phone");
    const youthBio = getString(currentData, "bio");
    const youthLanguages = getStringArray(currentData, "languages");
    const youthIsRup = getBoolean(currentData, "is_rup_region");

    const orgName = getString(currentData, "org_name");
    const orgOid = getString(currentData, "oid_number");
    const orgCountryHq = getString(currentData, "country_hq");
    const orgContactEmail = getString(currentData, "contact_email");
    const orgWebsite = getString(currentData, "website");
    const orgDescription = getString(currentData, "description");
    const orgInstagram = getString(currentData, "social_instagram");
    const orgTiktok = getString(currentData, "social_tiktok");
    const orgYoutube = getString(currentData, "social_youtube");
    const orgLinkedin = getString(currentData, "social_linkedin");
    const orgVerificationStatus = getString(currentData, "verification_status");

    return (
      <div className="space-y-6">
        <div className="bg-void-deep border border-void-border rounded-xl p-6 space-y-4">
          <div className="flex flex-col items-center justify-center mb-6">
            <div
              className={`w-24 h-24 rounded-full border-2 overflow-hidden flex items-center justify-center shadow-lg ${
                role === "youth" ? "border-plasma-cyan shadow-[0_0_20px_rgba(0,229,255,0.2)]" : "border-hyper-violet shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              } ${displayedAvatar ? "bg-void-surface" : "bg-gradient-to-br from-void-surface to-plasma-cyan/20"}`}
            >
              {displayedAvatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={displayedAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : role === "youth" ? (
                <User className="w-10 h-10 text-plasma-cyan" />
              ) : (
                <Building className="w-10 h-10 text-plasma-cyan" />
              )}
            </div>
          </div>

          {role === "youth" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("fullName")}
                </p>
                <p className="font-semibold text-white mt-1">
                  {youthFullName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("birthDate")}
                </p>
                <p className="font-semibold text-white mt-1">
                  {youthBirthDate || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("countryResident")}
                </p>
                <div className="font-semibold text-white mt-1">
                  {(() => {
                    if (!youthCountryCode) return "—";
                    const c = COUNTRIES.find((x) => x.code === youthCountryCode);
                    return c ? (
                      <span className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.flagUrl}
                          alt={c.name}
                          className="w-5 h-auto rounded-[2px]"
                          title={c.name}
                        />
                        {c.name}
                      </span>
                    ) : (
                      youthCountryCode
                    );
                  })()}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("phone") || "Phone"}
                </p>
                <p className="font-semibold text-white mt-1">
                  {youthPhone || "—"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("bio") || "Bio"}
                </p>
                <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">
                  {youthBio || "—"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("languages") || "Languages"}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  {youthLanguages.length > 0 ? youthLanguages.join(", ") : "—"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("rup")}
                </p>
                <p
                  className={`font-semibold mt-1 ${
                    youthIsRup ? "text-rup-emerald" : "text-white"
                  }`}
                >
                  {youthIsRup ? t("yes") : t("no")}
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
                    <h3 className="text-xl font-bold text-white">
                      {orgName || "—"}
                    </h3>
                    <p className="text-sm text-gray-400 font-mono">
                      OID/PIC: <span className="text-gray-300">{orgOid || "—"}</span>
                    </p>
                  </div>
                </div>
                {orgVerificationStatus === "verified" ? (
                  <div className="px-3 py-1 rounded-full bg-rup-emerald/10 border border-rup-emerald flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse" />
                    <span className="text-xs font-bold text-rup-emerald uppercase tracking-wider">
                      {t("verifiedEntity")}
                    </span>
                  </div>
                ) : orgVerificationStatus === "rejected" ? (
                  <div className="px-3 py-1 rounded-full bg-nova-flare/10 border border-nova-flare/30 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-nova-flare" />
                    <span className="text-xs font-bold text-nova-flare uppercase tracking-wider">
                      {t("rejectedEntity")}
                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">
                      {t("pendingEntity")}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {t("countryHq")}
                  </p>
                  <div className="font-semibold text-white mt-1">
                    {(() => {
                      if (!orgCountryHq) return "—";
                      const c = COUNTRIES.find((x) => x.code === orgCountryHq);
                      return c ? (
                        <span className="flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.flagUrl}
                            alt={c.name}
                            className="w-5 h-auto rounded-[2px]"
                            title={c.name}
                          />
                          {c.name}
                        </span>
                      ) : (
                        orgCountryHq
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {t("contactEmail") || "Contact Email"}
                  </p>
                  <p className="font-semibold text-white mt-1">
                    {orgContactEmail || "—"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {t("website") || "Website"}
                  </p>
                  {orgWebsite ? (
                    <a
                      href={
                        orgWebsite.startsWith("http")
                          ? orgWebsite
                          : `https://${orgWebsite}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-plasma-cyan hover:underline mt-1 inline-block"
                    >
                      {orgWebsite}
                    </a>
                  ) : (
                    <p className="font-semibold text-white mt-1">—</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    {t("description") || "Description/Mission"}
                  </p>
                  <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">
                    {orgDescription || "—"}
                  </p>
                </div>
                <div className="md:col-span-2 mt-2 pt-4 border-t border-void-border/50">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                    {t("socialMedia") || "Social Media"}
                  </p>
                  <div className="flex flex-col gap-2 text-sm">
                    {orgInstagram && (
                      <a
                        href={orgInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-plasma-cyan hover:underline"
                      >
                        Instagram: {orgInstagram}
                      </a>
                    )}
                    {orgTiktok && (
                      <a
                        href={orgTiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-plasma-cyan hover:underline"
                      >
                        TikTok: {orgTiktok}
                      </a>
                    )}
                    {orgYoutube && (
                      <a
                        href={orgYoutube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-plasma-cyan hover:underline"
                      >
                        YouTube: {orgYoutube}
                      </a>
                    )}
                    {orgLinkedin && (
                      <a
                        href={orgLinkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-plasma-cyan hover:underline"
                      >
                        LinkedIn: {orgLinkedin}
                      </a>
                    )}
                    {!orgInstagram &&
                      !orgTiktok &&
                      !orgYoutube &&
                      !orgLinkedin && <span className="text-gray-500">—</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {state?.success && (
          <div
            role="status"
            className="p-4 rounded-xl bg-rup-emerald/15 border border-rup-emerald/40 text-rup-emerald text-sm font-medium flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.15)] animate-in zoom-in-95 duration-300"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{state.success}</span>
          </div>
        )}

        <button
          onClick={() => setIsEditing(true)}
          className={`w-full font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-white border ${
            role === "youth"
              ? "border-plasma-cyan/30 hover:border-plasma-cyan hover:bg-plasma-cyan/10"
              : "border-hyper-violet/30 hover:border-hyper-violet hover:bg-hyper-violet/10"
          }`}
        >
          <Edit2 className="w-5 h-5" />
          {t("editProfile") || "Edit Profile"}
        </button>

        <div className="mt-8 p-6 rounded-xl border border-red-500/30 bg-red-500/10 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-red-400">{t("dangerZone")}</h3>
            <p className="text-sm text-gray-400 mt-1">{t("dangerZoneDesc")}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            type="button"
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50"
          >
            <Trash2 className="w-5 h-5" />
            {t("deleteAccount")}
          </button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4">
            <div className="bg-void-surface border border-red-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,0,0,0.15)] animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {t("modalTitle")}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t("modalDesc")}
                </p>

                {deleteError && (
                  <div
                    role="alert"
                    className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mt-4 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="w-full flex flex-col gap-3 mt-8">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setDeleteError(null);
                    }}
                    disabled={isDeleting}
                    type="button"
                    className="w-full py-3 rounded-lg font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 disabled:opacity-50"
                  >
                    {t("cancelDelete")}
                  </button>
                  <button
                    onClick={executeDelete}
                    disabled={isDeleting}
                    type="button"
                    className="w-full py-3 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      t("confirmDelete")
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const defaultYouthFullName = getString(currentData, "full_name");
  const defaultYouthBirthDate = getString(currentData, "birth_date");
  const defaultYouthCountryCode = getString(currentData, "country_code");
  const defaultYouthPhone = getString(currentData, "phone");
  const defaultYouthBio = getString(currentData, "bio");
  const defaultYouthLanguages = getStringArray(currentData, "languages").join(", ");

  const defaultOrgName = getString(currentData, "org_name");
  const defaultOrgOid = getString(currentData, "oid_number");
  const defaultOrgCountryHq = getString(currentData, "country_hq");
  const defaultOrgContactEmail = getString(currentData, "contact_email");
  const defaultOrgWebsite = getString(currentData, "website");
  const defaultOrgDescription = getString(currentData, "description");
  const defaultOrgInstagram = getString(currentData, "social_instagram");
  const defaultOrgTiktok = getString(currentData, "social_tiktok");
  const defaultOrgYoutube = getString(currentData, "social_youtube");
  const defaultOrgLinkedin = getString(currentData, "social_linkedin");

  return (
    <form
      action={action}
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <input type="hidden" name="role" value={role} />

      {state?.error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-nova-flare/15 border border-nova-flare/40 text-nova-flare text-sm font-medium flex items-center gap-3 shadow-[0_0_20px_rgba(255,46,99,0.15)] animate-in fade-in duration-300"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-nova-flare" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div
          role="status"
          className="p-4 rounded-xl bg-rup-emerald/15 border border-rup-emerald/40 text-rup-emerald text-sm font-medium flex items-center gap-3 shadow-[0_0_20px_rgba(0,230,118,0.15)] animate-in zoom-in-95 duration-300"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <div className="flex flex-col items-center justify-center space-y-4 mb-8">
        <div
          className={`w-24 h-24 rounded-full border-2 overflow-hidden flex items-center justify-center relative group shadow-lg ${
            role === "youth" ? "border-plasma-cyan shadow-[0_0_20px_rgba(0,229,255,0.2)]" : "border-hyper-violet shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          } ${displayedAvatar ? "bg-void-surface" : "bg-gradient-to-br from-void-surface to-plasma-cyan/20"}`}
        >
          {displayedAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={displayedAvatar}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : role === "youth" ? (
            <User className="w-10 h-10 text-plasma-cyan" />
          ) : (
            <Building className="w-10 h-10 text-plasma-cyan" />
          )}
          <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <Upload className="w-6 h-6 text-white mb-1" />
            <span className="text-[10px] text-white font-medium uppercase">
              {t("upload")}
            </span>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
      </div>

      {role === "youth" ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t("fullName")}
            </label>
            <input
              type="text"
              name="full_name"
              defaultValue={defaultYouthFullName}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder={t("fullNamePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {t("birthDate")}
              </label>
              <input
                type="date"
                name="birth_date"
                defaultValue={defaultYouthBirthDate}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {t("countryResident")}
              </label>
              <CountrySelect
                name="country_code"
                defaultValue={defaultYouthCountryCode}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <input type="hidden" name="is_rup_region" value={isRup.toString()} />
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isRup}
                  onChange={(e) => setIsRup(e.target.checked)}
                />
                <div
                  className={`w-12 h-7 rounded-full transition-colors ${
                    isRup ? "bg-rup-emerald" : "bg-void-deep border border-void-border"
                  }`}
                />
                <div
                  className={`absolute w-5 h-5 rounded-full bg-white top-1 transition-transform ${
                    isRup ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </div>
              <div>
                <span
                  className={`block text-sm font-bold transition-colors ${
                    isRup ? "text-rup-emerald" : "text-gray-300"
                  }`}
                >
                  {t("rup")}
                </span>
                <span className="text-xs text-gray-500">{t("rupDesc")}</span>
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t("phone") || "Phone"}
            </label>
            <input
              type="text"
              name="phone"
              defaultValue={defaultYouthPhone}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t("languages") || "Languages (comma separated)"}
            </label>
            <input
              type="text"
              name="languages"
              defaultValue={defaultYouthLanguages}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
              placeholder="ES, EN, FR..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t("bio") || "Bio"}
            </label>
            <textarea
              name="bio"
              defaultValue={defaultYouthBio}
              rows={4}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t("orgName")}
            </label>
            <input
              type="text"
              name="org_name"
              defaultValue={defaultOrgName}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
              placeholder={t("orgNamePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {t("picNumber") || "OID / PIC Number"}
              </label>
              <input
                type="text"
                name="oid_number"
                defaultValue={defaultOrgOid}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
                placeholder="Ej: E12345678"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {t("countryHq")}
              </label>
              <CountrySelect
                name="country_hq"
                defaultValue={defaultOrgCountryHq}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {t("contactEmail") || "Contact Email"}
              </label>
              <input
                type="email"
                name="contact_email"
                defaultValue={defaultOrgContactEmail}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {t("website") || "Website"}
              </label>
              <input
                type="url"
                name="website"
                defaultValue={defaultOrgWebsite}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t("description") || "Description"}
            </label>
            <textarea
              name="description"
              defaultValue={defaultOrgDescription}
              rows={4}
              className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-void-border/50">
            <h4 className="text-sm font-medium text-gray-300">
              {t("socialMedia") || "Social Media"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="url"
                name="social_instagram"
                defaultValue={defaultOrgInstagram}
                placeholder={t("instagram") || "Instagram URL"}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm"
              />
              <input
                type="url"
                name="social_tiktok"
                defaultValue={defaultOrgTiktok}
                placeholder={t("tiktok") || "TikTok URL"}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm"
              />
              <input
                type="url"
                name="social_youtube"
                defaultValue={defaultOrgYoutube}
                placeholder={t("youtube") || "YouTube URL"}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm"
              />
              <input
                type="url"
                name="social_linkedin"
                defaultValue={defaultOrgLinkedin}
                placeholder={t("linkedin") || "LinkedIn URL"}
                className="w-full bg-void-deep border border-void-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all text-sm"
              />
            </div>
          </div>
        </>
      )}

      <div className="pt-4 border-t border-void-border flex gap-4">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-6 py-3 rounded-lg text-gray-400 hover:text-white transition-colors border border-void-border hover:border-gray-600"
        >
          {t("cancel") || "Cancel"}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className={`flex-1 font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-void-deep ${
            role === "youth"
              ? "bg-plasma-cyan hover:bg-plasma-cyan/80 shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)]"
              : "bg-hyper-violet hover:bg-hyper-violet/80 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
          } disabled:opacity-50`}
        >
          <Save className="w-5 h-5" />
          {isPending ? t("saving") : t("save")}
        </button>
      </div>

      <div className="mt-8 p-6 rounded-xl border border-red-500/30 bg-red-500/10 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-red-400">{t("dangerZone")}</h3>
          <p className="text-sm text-gray-400 mt-1">{t("dangerZoneDesc")}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          type="button"
          className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50"
        >
          <Trash2 className="w-5 h-5" />
          {t("deleteAccount")}
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4">
          <div className="bg-void-surface border border-red-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,0,0,0.15)] animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {t("modalTitle")}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t("modalDesc")}
              </p>

              {deleteError && (
                <div
                  role="alert"
                  className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mt-4 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="w-full flex flex-col gap-3 mt-8">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  type="button"
                  className="w-full py-3 rounded-lg font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors border border-gray-600 disabled:opacity-50"
                >
                  {t("cancelDelete")}
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isDeleting}
                  type="button"
                  className="w-full py-3 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    t("confirmDelete")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
