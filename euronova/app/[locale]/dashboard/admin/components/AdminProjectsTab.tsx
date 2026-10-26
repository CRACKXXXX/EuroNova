"use client";

import React from "react";
import {
  Layers,
  Building,
  Bot,
  Calendar,
  CheckCircle2,
  Edit3,
  Mail,
  Trash2,
} from "lucide-react";
import {
  type ProjectItem,
  type AdminTranslator,
  formatId,
  maskEmail,
  isProjectScraped,
} from "./AdminTypes";
import {
  CountryBadge,
  AdminPagination,
} from "./AdminCommonComponents";
import {
  publishProject,
  deleteProject,
} from "../actions";

interface AdminProjectsTabProps {
  pendingProjects: ProjectItem[];
  publishedProjects: ProjectItem[];
  totalPendingProjects: number;
  totalPublishedProjects: number;
  projectOriginFilter: "all" | "organic" | "scraper";
  setProjectOriginFilter: (f: "all" | "organic" | "scraper") => void;
  showSensitive: boolean;
  isPending: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  handleAction: (actionFn: () => Promise<{ success?: boolean; error?: string }>) => void;
  handleOpenEditProject: (proj: ProjectItem) => void;
  setDeleteConfig: (cfg: {
    action: () => Promise<{ success?: boolean; error?: string }>;
    title: string;
    message: string;
  }) => void;
  t: AdminTranslator;
}

export function AdminProjectsTab({
  pendingProjects,
  publishedProjects,
  totalPendingProjects,
  totalPublishedProjects,
  projectOriginFilter,
  setProjectOriginFilter,
  showSensitive,
  isPending,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  handleAction,
  handleOpenEditProject,
  setDeleteConfig,
  t,
}: AdminProjectsTabProps) {
  const filteredPending = pendingProjects.filter((p) => {
    const isScraped = isProjectScraped(p);
    if (projectOriginFilter === "organic") return !isScraped;
    if (projectOriginFilter === "scraper") return isScraped;
    return true;
  });

  const filteredPublished = publishedProjects.filter((p) => {
    const isScraped = isProjectScraped(p);
    if (projectOriginFilter === "organic") return !isScraped;
    if (projectOriginFilter === "scraper") return isScraped;
    return true;
  });

  const organicCount =
    pendingProjects.filter((p) => !isProjectScraped(p)).length +
    publishedProjects.filter((p) => !isProjectScraped(p)).length;
  const scrapedCount =
    pendingProjects.filter((p) => isProjectScraped(p)).length +
    publishedProjects.filter((p) => isProjectScraped(p)).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Origin Switcher (Split Views: All vs Organic vs Auto-Scraper) */}
      <div className="bg-void-surface border border-void-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-plasma-cyan" />
            <span>{t("projectOriginFilter")}</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("projectOriginFilterDesc")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setProjectOriginFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              projectOriginFilter === "all"
                ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            <span>All ({pendingProjects.length + publishedProjects.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setProjectOriginFilter("organic")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              projectOriginFilter === "organic"
                ? "bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/40 shadow-[0_0_12px_rgba(0,230,118,0.2)]"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Organic NGO ({organicCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setProjectOriginFilter("scraper")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              projectOriginFilter === "scraper"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                : "bg-void-deep text-gray-400 hover:text-white border border-void-border"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Auto-Scraper ({scrapedCount})</span>
          </button>
        </div>
      </div>

      {/* Section 1: Pending Review */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-void-border pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-nova-flare animate-pulse" />
            <span>{t("pendingProjects")}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-nova-flare/20 text-nova-flare border border-nova-flare/30">
              {projectOriginFilter === "all" ? totalPendingProjects : `${filteredPending.length} of ${totalPendingProjects}`}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPending.map((project) => {
            const isScraped = isProjectScraped(project);

            return (
              <div
                key={project.id}
                className="bg-void-surface border border-nova-flare/30 rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-nova-flare/5"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                    {project.title}
                  </h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-nova-flare/15 text-nova-flare border border-nova-flare/40 uppercase tracking-wider">
                      {t("pendingBadge")}
                    </span>
                    {isScraped ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                        <Bot className="w-3 h-3" />
                        {t("autoScrapedBadge")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        NGO Direct
                      </span>
                    )}
                  </div>
                </div>

                {/* Project ID with privacy mask & full view */}
                <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                  ID: {formatId(project.id, showSensitive)}
                </div>

                <p className="text-xs text-plasma-cyan font-medium mb-1">
                  {isScraped ? (project.users_org?.org_name || "EuroNova Auto-Scraper") : (project.users_org?.org_name || t("unnamed"))}
                </p>

                {(project.login_email || project.users_org?.contact_email) && (
                  <p className={`text-xs text-gray-400 font-mono mb-3 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                    {t("contactLabel", { email: (showSensitive ? (project.login_email || project.users_org?.contact_email) : maskEmail(project.login_email || project.users_org?.contact_email)) || '' })}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>{project.duration_days ? `${project.duration_days} days` : "—"}</span>
                  </div>
                  <span>•</span>
                  <div>
                    <CountryBadge countryCode={project.dest_country} />
                  </div>
                  <span>•</span>
                  <span className="font-mono text-gray-300">{project.project_type || "YE"}</span>
                </div>

                {/* Full description without truncation for Admin review */}
                <p className="text-sm text-gray-300 mb-6 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                  {project.description || t("noDescription")}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-void-border/50">
                  <button
                    disabled={isPending}
                    onClick={() => handleAction(() => publishProject(project.id))}
                    className="flex-1 min-w-[100px] py-2 px-2.5 rounded-lg bg-rup-emerald/15 hover:bg-rup-emerald/25 text-rup-emerald border border-rup-emerald/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t("approvePublish")}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenEditProject(project)}
                    className="py-2 px-3 rounded-lg bg-plasma-cyan/15 hover:bg-plasma-cyan/25 text-plasma-cyan border border-plasma-cyan/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_10px_rgba(0,229,255,0.15)] cursor-pointer"
                    title={t("editProjectTooltip")}
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t("editProjectBtn")}</span>
                  </button>
                  <a
                    href={`mailto:${project.login_email || project.users_org?.contact_email || ""}?subject=EuroNova%20-%20Project%20Review:%20${encodeURIComponent(project.title)}&body=Hello,%20your%20project%20was%20flagged.%20Please%20modify%20it%20so%20we%20can%20publish:%0A%0A-%20...`}
                    className="py-2 px-2.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-400 border border-yellow-400/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer"
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
                    className="py-2 px-2.5 rounded-lg bg-nova-flare/15 hover:bg-nova-flare/25 text-nova-flare border border-nova-flare/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredPending.length === 0 && (
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
            <span>{t("publishedProjects")}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rup-emerald/20 text-rup-emerald border border-rup-emerald/30">
              {filteredPublished.length}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPublished.map((project) => {
            const isScraped = isProjectScraped(project);

            return (
              <div
                key={project.id}
                className="bg-void-surface border border-void-border hover:border-rup-emerald/30 rounded-2xl p-6 sm:p-7 flex flex-col transition-all shadow-md"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white break-all whitespace-normal flex-1">
                    {project.title}
                  </h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 uppercase tracking-wider">
                      {t("publishedBadge")}
                    </span>
                    {isScraped ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                        <Bot className="w-3 h-3" />
                        {t("autoScrapedBadge")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        NGO Direct
                      </span>
                    )}
                  </div>
                </div>

                {/* Project ID with privacy mask & full view */}
                <div className={`text-[11px] text-gray-500 font-mono mb-2 ${showSensitive ? "break-all whitespace-normal" : ""}`}>
                  ID: {formatId(project.id, showSensitive)}
                </div>

                <p className="text-xs text-plasma-cyan font-medium mb-1">
                  {isScraped ? (project.users_org?.org_name || "EuroNova Auto-Scraper") : (project.users_org?.org_name || t("unnamed"))}
                </p>

                {(project.login_email || project.users_org?.contact_email) && (
                  <p className={`text-xs text-gray-400 font-mono mb-3 ${showSensitive ? "break-all whitespace-normal" : "truncate"}`}>
                    {t("contactLabel", { email: (showSensitive ? (project.login_email || project.users_org?.contact_email) : maskEmail(project.login_email || project.users_org?.contact_email)) || '' })}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>{project.duration_days ? `${project.duration_days} days` : "—"}</span>
                  </div>
                  <span>•</span>
                  <div>
                    <CountryBadge countryCode={project.dest_country} />
                  </div>
                  <span>•</span>
                  <span className="font-mono text-gray-300">{project.project_type || "YE"}</span>
                </div>

                {/* Full description without truncation for Admin review */}
                <p className="text-sm text-gray-300 mb-6 flex-1 whitespace-pre-wrap leading-relaxed break-words">
                  {project.description || t("noDescription")}
                </p>

                <div className="mt-auto pt-3 border-t border-void-border/50 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenEditProject(project)}
                    className="flex-1 py-2 px-3 rounded-lg bg-plasma-cyan/15 hover:bg-plasma-cyan/25 text-plasma-cyan border border-plasma-cyan/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t("editProjectBtn")}</span>
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      setDeleteConfig({
                        action: () => deleteProject(project.id),
                        title: "Delete Published Project",
                        message: `Are you sure you want to delete "${project.title}"? It will be permanently removed from public view.`,
                      });
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-nova-flare/10 hover:bg-nova-flare/20 text-nova-flare border border-nova-flare/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t("deleteProject")}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredPublished.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40">
              <p className="text-gray-400 text-sm">{t("noPublishedProjects")}</p>
            </div>
          )}
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalPublishedProjects}
          pageSize={pageSize}
          isPending={isPending}
          onPageChange={onPageChange}
          showingResultsText={t("showingResults", {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, totalPublishedProjects),
            total: totalPublishedProjects,
          })}
          previousText={t("previous")}
          nextText={t("next")}
          pageOfText={t("pageOf", { current: currentPage, total: totalPages })}
        />
      </div>
    </div>
  );
}
