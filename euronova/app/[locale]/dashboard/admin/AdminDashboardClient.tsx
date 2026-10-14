"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building,
  Users,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Trash2,
  Mail,
  Globe,
  Camera,
  Music,
  PlaySquare,
  Briefcase,
  User,
  Calendar,
  AlertCircle,
  Phone,
  Languages,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { COUNTRIES } from "@/lib/constants/countries";
import {
  approveOrganization,
  revokeOrganization,
  deleteOrganization,
  deleteYouthUser,
  publishProject,
  deleteProject,
} from "./actions";

export interface OrgItem {
  id: string;
  org_name: string | null;
  oid_number?: string | null;
  country_hq: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  login_email?: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  social_linkedin: string | null;
  verification_status: string | null;
  created_at: string;
}

export interface YouthUserItem {
  id: string;
  full_name: string | null;
  birth_date?: string | null;
  country_code: string | null;
  is_rup_region: boolean | null;
  bio: string | null;
  phone: string | null;
  languages: string[] | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

export interface ProjectItem {
  id: string;
  org_id?: string;
  title: string;
  description: string | null;
  project_type: string;
  dest_country: string;
  duration_days?: number | null;
  status: string;
  login_email?: string | null;
  created_at: string;
  users_org?: {
    org_name: string | null;
    contact_email?: string | null;
  } | null;
}

interface AdminDashboardClientProps {
  pendingOrgs: OrgItem[];
  verifiedOrgs: OrgItem[];
  youthUsers: YouthUserItem[];
  pendingProjects: ProjectItem[];
  publishedProjects: ProjectItem[];
  totalProjects: number;
  totalOrgs: number;
  totalYouth: number;
  totalPendingOrgs: number;
  totalVerifiedOrgs: number;
  totalPendingProjects: number;
  totalPublishedProjects: number;
  currentPage: number;
  totalPages: number;
  currentTab?: "orgs" | "youth" | "projects";
  pageSize?: number;
}

function isFilled(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const maskedLocal = local.length > 1 ? `${local[0]}***` : "*";
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return "***";
  const visible = trimmed.slice(0, 6);
  return `${visible} *** ***`;
}

function formatId(id: string | null | undefined, showSensitive: boolean): string {
  if (!id) return "—";
  if (!showSensitive) {
    return `${id.slice(0, 4)}...`;
  }
  return id;
}

export function AdminDashboardClient({
  pendingOrgs,
  verifiedOrgs,
  youthUsers,
  pendingProjects,
  publishedProjects,
  totalProjects,
  totalOrgs,
  totalYouth,
  totalPendingOrgs,
  totalVerifiedOrgs,
  totalPendingProjects,
  totalPublishedProjects,
  currentPage,
  totalPages,
  currentTab = "orgs",
  pageSize = 50,
}: AdminDashboardClientProps) {
  const t = useTranslations("AdminPanel");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab strictly bound to URL parameter for resilient state persistence
  const tabFromUrl = searchParams.get("tab") as "orgs" | "youth" | "projects" | null;
  const activeTab: "orgs" | "youth" | "projects" = tabFromUrl || currentTab || "orgs";

  const [showSensitive, setShowSensitive] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleRunScraper = async () => {
    if (isScraping) return;
    setIsScraping(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/scraper/official?secret=Euronova.2007", { method: "GET" });
      if (!res.ok) throw new Error("Scraper failed to run");
      setFeedback({ type: "success", message: "Auto-Scraper executed successfully! Refreshing data..." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Error running scraper. Check console." });
    } finally {
      setIsScraping(false);
    }
  };

  // Custom Delete Modal Configuration State
  const [deleteConfig, setDeleteConfig] = useState<{
    action: () => Promise<{ success?: boolean; error?: string }>;
    title: string;
    message: string;
  } | null>(null);

  const handleTabChange = (tab: "orgs" | "youth" | "projects") => {
    router.push(`?tab=${tab}&page=1`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    router.push(`?tab=${activeTab}&page=${newPage}`);
  };

  const handleAction = (actionFn: () => Promise<{ success?: boolean; error?: string }>) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await actionFn();
      if (res?.error) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({ type: "success", message: "Action executed successfully." });
        router.refresh();
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfig) return;
    const actionToRun = deleteConfig.action;
    setDeleteConfig(null);
    handleAction(actionToRun);
  };

  const renderContactIcons = (org: OrgItem) => {
    const website = isFilled(org.website) ? org.website.trim() : null;
    const instagram = isFilled(org.social_instagram) ? org.social_instagram.trim() : null;
    const tiktok = isFilled(org.social_tiktok) ? org.social_tiktok.trim() : null;
    const youtube = isFilled(org.social_youtube) ? org.social_youtube.trim() : null;
    const linkedin = isFilled(org.social_linkedin) ? org.social_linkedin.trim() : null;
    const rawEmail = isFilled(org.login_email)
      ? org.login_email.trim()
      : isFilled(org.contact_email)
      ? org.contact_email.trim()
      : null;
    const displayEmail = showSensitive ? rawEmail : maskEmail(rawEmail);

    const hasAnyContact = website || instagram || tiktok || youtube || linkedin || rawEmail;
    if (!hasAnyContact) return null;

    return (
      <div className="flex flex-wrap items-center gap-2 mb-4 pt-3 border-t border-void-border/60">
        {rawEmail && (
          <a
            href={`mailto:${rawEmail}`}
            title={`Email: ${rawEmail}`}
            className={`flex items-center gap-1.5 text-xs text-gray-300 hover:text-plasma-cyan bg-void-deep px-2.5 py-1 rounded-md border border-void-border transition-colors ${
              showSensitive ? "break-all whitespace-normal" : "truncate max-w-[200px]"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
            <span className={showSensitive ? "break-all whitespace-normal" : "truncate"}>
              {displayEmail}
            </span>
          </a>
        )}
        {website && (
          <a
            href={website.startsWith("http") ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Website"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
          </a>
        )}
        {instagram && (
          <a
            href={instagram.startsWith("http") ? instagram : `https://${instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </a>
        )}
        {tiktok && (
          <a
            href={tiktok.startsWith("http") ? tiktok : `https://${tiktok}`}
            target="_blank"
            rel="noopener noreferrer"
            title="TikTok"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Music className="w-3.5 h-3.5" />
          </a>
        )}
        {youtube && (
          <a
            href={youtube.startsWith("http") ? youtube : `https://${youtube}`}
            target="_blank"
            rel="noopener noreferrer"
            title="YouTube"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <PlaySquare className="w-3.5 h-3.5" />
          </a>
        )}
        {linkedin && (
          <a
            href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn"
            className="w-7 h-7 rounded-md bg-void-deep border border-void-border flex items-center justify-center text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/50 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  };

  const renderCountry = (countryCode: string | null) => {
    if (!countryCode) return <span className="text-gray-500">—</span>;
    const c = COUNTRIES.find((x) => x.code === countryCode);
    return c ? (
      <span className="flex items-center gap-1.5 text-xs text-gray-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.flagUrl} alt={c.name} className="w-4 h-auto rounded-[2px]" title={c.name} />
        {c.name}
      </span>
    ) : (
      <span className="text-xs text-gray-400">{countryCode}</span>
    );
  };

  const renderPagination = (totalItems: number) => {
    if (totalPages <= 1 || totalItems === 0) return null;
    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    return (
      <div className="mt-8 pt-6 border-t border-void-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-gray-400 font-medium">
          {t("showingResults", {
            from,
            to,
            total: totalItems,
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-void-border disabled:hover:shadow-none"
          >
            <ChevronLeft className="w-4 h-4 text-plasma-cyan" />
            <span>{t("previous")}</span>
          </button>

          <div className="px-4 py-2 rounded-lg border border-void-border bg-void-deep text-xs font-semibold text-plasma-cyan tracking-wider">
            {t("pageOf", {
              current: currentPage,
              total: totalPages,
            })}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-void-border disabled:hover:shadow-none"
          >
            <span>{t("next")}</span>
            <ChevronRight className="w-4 h-4 text-plasma-cyan" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Header: Navigation Tabs & Privacy Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-void-border">
        {/* Navigation Tabs with True Total Counts */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleTabChange("orgs")}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
              activeTab === "orgs"
                ? "bg-hyper-violet/20 border-hyper-violet text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            <Building className="w-4 h-4 text-hyper-violet" />
            <span>{t("tabOrgs")}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-hyper-violet/30 text-white font-mono">
              {totalOrgs}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("youth")}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
              activeTab === "youth"
                ? "bg-plasma-cyan/20 border-plasma-cyan text-white shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            <Users className="w-4 h-4 text-plasma-cyan" />
            <span>{t("tabYouth")}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-plasma-cyan/30 text-white font-mono">
              {totalYouth}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("projects")}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 border ${
              activeTab === "projects"
                ? "bg-nova-flare/20 border-nova-flare text-white shadow-[0_0_20px_rgba(255,46,99,0.25)]"
                : "bg-void-surface border-void-border text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            <FolderGit2 className="w-4 h-4 text-nova-flare" />
            <span>{t("tabProjects")}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-nova-flare/30 text-white font-mono">
              {totalProjects}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start sm:self-auto">
          {/* Run Auto-Scraper Trigger Button */}
          <button
            type="button"
            onClick={handleRunScraper}
            disabled={isScraping || isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all shadow-sm bg-void-surface border-plasma-cyan/40 text-plasma-cyan hover:bg-plasma-cyan/10 hover:border-plasma-cyan hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 text-plasma-cyan shrink-0 ${isScraping ? "animate-spin" : ""}`} />
            <span>{isScraping ? "Running Scraper..." : "Run Auto-Scraper"}</span>
          </button>

          {/* Privacy Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSensitive((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all shadow-sm ${
              showSensitive
                ? "bg-nova-flare/15 border-nova-flare/40 text-nova-flare hover:bg-nova-flare/25 shadow-[0_0_15px_rgba(255,46,99,0.2)]"
                : "bg-void-surface border-void-border text-gray-300 hover:text-white hover:border-plasma-cyan"
            }`}
          >
            {showSensitive ? (
              <>
                <EyeOff className="w-4 h-4 text-nova-flare shrink-0" />
                <span>Hide Sensitive Data</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-plasma-cyan shrink-0" />
                <span>Show Sensitive Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in duration-300 ${
            feedback.type === "error"
              ? "bg-nova-flare/15 border border-nova-flare/40 text-nova-flare"
              : "bg-rup-emerald/15 border border-rup-emerald/40 text-rup-emerald"
          }`}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <p>{feedback.message}</p>
        </div>
      )}

      {/* TAB 1: ORGANIZATIONS */}
      {activeTab === "orgs" && (
        <div className="space-y-12 animate-in fade-in duration-300">
          {/* Section 1: Pending Verification */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-void-border pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                {t("pending")}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                  {totalPendingOrgs}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-void-surface border border-yellow-400/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-yellow-400/5 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                      {org.org_name || t("unnamed")}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 uppercase tracking-wider shrink-0 ml-2">
                      {t("pendingBadge")}
                    </span>
                  </div>

                  {/* Org ID with privacy mask & full view */}
                  <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    ID: {formatId(org.id, showSensitive)}
                    {org.oid_number ? ` • OID: ${showSensitive ? org.oid_number : `${org.oid_number.slice(0, 4)}...`}` : ""}
                  </div>

                  <div className="mb-3">{renderCountry(org.country_hq)}</div>

                  <p className="text-sm text-gray-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                    {org.description || t("noDescription")}
                  </p>

                  {renderContactIcons(org)}

                  <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-auto pt-2">
                    <button
                      disabled={isPending}
                      onClick={() => handleAction(() => approveOrganization(org.id))}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("approve")}</span>
                    </button>
                    <a
                      href={`mailto:${org.login_email || org.contact_email || ""}?subject=EuroNova%20-%20Action%20Required&body=Hello,%20we%20are%20reviewing%20your%20profile.%20Please%20update%20the%20following:%0A%0A-%20...`}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-400 border border-yellow-400/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("requestChanges")}</span>
                    </a>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setDeleteConfig({
                          action: () => deleteOrganization(org.id),
                          title: "Reject & Delete Organization",
                          message: `Are you sure you want to permanently delete "${org.org_name || "this organization"}"? This will remove all associated projects and records.`,
                        });
                      }}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("rejectDelete")}</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingOrgs.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                  <p className="text-gray-400 text-sm">{t("noPending")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Verified Entities */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-void-border pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-rup-emerald" />
                {t("verified")}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30">
                  {totalVerifiedOrgs}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {verifiedOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-void-surface border border-rup-emerald/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-rup-emerald/5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                      {org.org_name || t("unnamed")}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 uppercase tracking-wider shrink-0 ml-2">
                      {t("verifiedBadge")}
                    </span>
                  </div>

                  {/* Org ID with privacy mask & full view */}
                  <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    ID: {formatId(org.id, showSensitive)}
                    {org.oid_number ? ` • OID: ${showSensitive ? org.oid_number : `${org.oid_number.slice(0, 4)}...`}` : ""}
                  </div>

                  <div className="mb-3">{renderCountry(org.country_hq)}</div>

                  <p className="text-sm text-gray-300 mb-4 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                    {org.description || t("noDescription")}
                  </p>

                  {renderContactIcons(org)}

                  <div className="flex gap-2.5 mt-auto pt-2">
                    <button
                      disabled={isPending}
                      onClick={() => handleAction(() => revokeOrganization(org.id))}
                      className="flex-1 py-2 px-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("revoke")}</span>
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setDeleteConfig({
                          action: () => deleteOrganization(org.id),
                          title: "Delete Verified Entity",
                          message: `Are you sure you want to permanently delete "${org.org_name || "this organization"}"? This action cannot be undone.`,
                        });
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("deleteEntity")}</span>
                    </button>
                  </div>
                </div>
              ))}

              {verifiedOrgs.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                  <p className="text-gray-400 text-sm">{t("noVerified")}</p>
                </div>
              )}
            </div>

            {renderPagination(totalVerifiedOrgs)}
          </div>
        </div>
      )}

      {/* TAB 2: YOUTH USERS */}
      {activeTab === "youth" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-void-border pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Users className="w-5 h-5 text-plasma-cyan" />
              {t("youthTitle")}
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/30">
                {totalYouth}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {youthUsers.map((user) => (
              <div
                key={user.id}
                className="bg-void-surface border border-void-border hover:border-plasma-cyan/40 rounded-2xl p-6 sm:p-7 flex flex-col transition-all shadow-md"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full border-2 border-plasma-cyan/60 overflow-hidden flex items-center justify-center bg-void-deep shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                    {user.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-plasma-cyan/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white break-all whitespace-normal">
                      {user.full_name || t("unnamed")}
                    </h3>
                    <p className={`text-xs text-gray-400 font-mono mt-0.5 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                      {user.email ? (showSensitive ? user.email : maskEmail(user.email)) : "No email"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {renderCountry(user.country_code)}
                      {user.is_rup_region && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                          {t("rupBadge")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Youth Details: Phone & Languages */}
                <div className="space-y-1.5 mb-3 text-xs">
                  {user.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
                      <span className="text-gray-400 font-medium">{t("phone")}:</span>
                      <span className={`font-mono text-gray-200 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                        {showSensitive ? user.phone : maskPhone(user.phone)}
                      </span>
                    </div>
                  )}
                  {user.languages && user.languages.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Languages className="w-3.5 h-3.5 text-hyper-violet shrink-0" />
                      <span className="text-gray-400 font-medium">{t("languages")}:</span>
                      <span className={`text-gray-200 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                        {user.languages.join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Youth Details: Bio */}
                {user.bio ? (
                  <div className="mb-4 bg-void-deep/60 p-3 rounded-lg border border-void-border/40">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      {t("bio")}
                    </span>
                    <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
                      {user.bio}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic mb-4">
                    {t("noDescription")}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-void-border/60 flex items-center justify-between">
                  <span className={`text-[11px] text-gray-500 font-mono ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    ID: {formatId(user.id, showSensitive)}
                  </span>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      setDeleteConfig({
                        action: () => deleteYouthUser(user.id),
                        title: "Delete Youth User",
                        message: `Are you sure you want to permanently delete user "${user.full_name || user.email || "this user"}"? This action cannot be undone.`,
                      });
                    }}
                    className="py-2 px-3.5 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("deleteUser")}</span>
                  </button>
                </div>
              </div>
            ))}

            {youthUsers.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                <p className="text-gray-400 text-sm">{t("noYouthUsers")}</p>
              </div>
            )}
          </div>

          {renderPagination(totalYouth)}
        </div>
      )}

      {/* TAB 3: PROJECTS */}
      {activeTab === "projects" && (
        <div className="space-y-12 animate-in fade-in duration-300">
          {/* Section 1: Pending Review */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-void-border pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-nova-flare animate-pulse" />
                {t("pendingProjects")}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30">
                  {totalPendingProjects}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-void-surface border border-nova-flare/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-nova-flare/5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                      {project.title}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-nova-flare/15 text-nova-flare border border-nova-flare/40 uppercase tracking-wider shrink-0 ml-2">
                      {t("pendingBadge")}
                    </span>
                  </div>

                  {/* Project ID with privacy mask & full view */}
                  <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    ID: {formatId(project.id, showSensitive)}
                  </div>

                  <p className="text-xs text-plasma-cyan font-medium mb-1">
                    {project.users_org?.org_name || t("unnamed")}
                  </p>

                  {(project.login_email || project.users_org?.contact_email) && (
                    <p className={`text-xs text-gray-400 font-mono mb-3 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                      Contact: {showSensitive ? (project.login_email || project.users_org?.contact_email) : maskEmail(project.login_email || project.users_org?.contact_email)}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>{project.duration_days ? `${project.duration_days} days` : "—"}</span>
                    </div>
                    <span>•</span>
                    <div>{renderCountry(project.dest_country)}</div>
                  </div>

                  <p className="text-sm text-gray-300 mb-6 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                    {project.description || t("noDescription")}
                  </p>

                  <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-auto pt-2">
                    <button
                      disabled={isPending}
                      onClick={() => handleAction(() => publishProject(project.id))}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("approvePublish")}</span>
                    </button>
                    <a
                      href={`mailto:${project.login_email || project.users_org?.contact_email || ""}?subject=EuroNova%20-%20Project%20Review:%20${encodeURIComponent(project.title)}&body=Hello,%20your%20project%20was%20flagged.%20Please%20modify%20it%20so%20we%20can%20publish:%0A%0A-%20...`}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-400 border border-yellow-400/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("requestChanges")}</span>
                    </a>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setDeleteConfig({
                          action: () => deleteProject(project.id),
                          title: "Delete Pending Project",
                          message: `Are you sure you want to delete "${project.title}"?`,
                        });
                      }}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("deleteProject")}</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingProjects.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                  <p className="text-gray-400 text-sm">{t("noPendingProjects")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Published Projects */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-void-border pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-rup-emerald" />
                {t("publishedProjects")}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30">
                  {totalPublishedProjects}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {publishedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-void-surface border border-void-border hover:border-rup-emerald/30 rounded-2xl p-6 sm:p-7 flex flex-col transition-all shadow-md"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                      {project.title}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 uppercase tracking-wider shrink-0 ml-2">
                      {t("publishedBadge")}
                    </span>
                  </div>

                  {/* Project ID with privacy mask & full view */}
                  <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                    ID: {formatId(project.id, showSensitive)}
                  </div>

                  <p className="text-xs text-plasma-cyan font-medium mb-1">
                    {project.users_org?.org_name || t("unnamed")}
                  </p>

                  {(project.login_email || project.users_org?.contact_email) && (
                    <p className={`text-xs text-gray-400 font-mono mb-3 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                      Contact: {showSensitive ? (project.login_email || project.users_org?.contact_email) : maskEmail(project.login_email || project.users_org?.contact_email)}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>{project.duration_days ? `${project.duration_days} days` : "—"}</span>
                    </div>
                    <span>•</span>
                    <div>{renderCountry(project.dest_country)}</div>
                  </div>

                  <p className="text-sm text-gray-300 mb-6 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                    {project.description || t("noDescription")}
                  </p>

                  <div className="mt-auto pt-2 border-t border-void-border/50">
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setDeleteConfig({
                          action: () => deleteProject(project.id),
                          title: "Delete Published Project",
                          message: `Are you sure you want to delete "${project.title}"? It will be permanently removed from public view.`,
                        });
                      }}
                      className="w-full py-2.5 px-3 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("deleteProject")}</span>
                    </button>
                  </div>
                </div>
              ))}

              {publishedProjects.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
                  <p className="text-gray-400 text-sm">{t("noPublishedProjects")}</p>
                </div>
              )}
            </div>

            {renderPagination(totalPublishedProjects)}
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-deep/90 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-nova-flare/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_40px_rgba(255,46,99,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-nova-flare/10 border border-nova-flare/30 rounded-full flex items-center justify-center mb-1">
                <Trash2 className="w-8 h-8 text-nova-flare" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {deleteConfig.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {deleteConfig.message}
              </p>

              <div className="w-full flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteConfig(null)}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold bg-void-deep hover:bg-gray-800 text-gray-300 hover:text-white transition-colors border border-void-border disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold bg-nova-flare hover:bg-nova-flare/90 text-white transition-all shadow-[0_0_20px_rgba(255,46,99,0.35)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
