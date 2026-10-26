"use client";

import React from "react";
import Link from "next/link";
import {
  Bookmark,
  Send,
  Compass,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FolderOpen,
  FolderPlus,
  Tag,
} from "lucide-react";
import { ProjectCard, type ProjectData } from "@/components/ProjectCard";
import {
  type CustomFolder,
  type MissionInteraction,
  type MissionTranslator,
  type MissionFormatter,
  FOLDER_COLOR_CLASSES,
} from "./MissionsTypes";

interface MissionsGridProps {
  paginatedList: MissionInteraction[];
  currentFolderList: MissionInteraction[];
  filteredListLength: number;
  activeFolderId: string;
  activeCustomFolder: CustomFolder | undefined;
  customFolders: CustomFolder[];
  folderAssignments: Record<string, string[]>;
  currentPage: number;
  totalPages: number;
  fromIndex: number;
  toIndex: number;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  onGoToAllFavorites: () => void;
  onManageProject: (proj: { id: string; title: string }) => void;
  format: MissionFormatter;
  t: MissionTranslator;
}

export function MissionsGrid({
  paginatedList,
  currentFolderList,
  filteredListLength,
  activeFolderId,
  activeCustomFolder,
  customFolders,
  folderAssignments,
  currentPage,
  totalPages,
  fromIndex,
  toIndex,
  onPageChange,
  onResetFilters,
  onGoToAllFavorites,
  onManageProject,
  format,
  t,
}: MissionsGridProps) {
  if (paginatedList.length > 0) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {paginatedList.map((interaction) => {
            const proj = interaction.projects!;
            const org = Array.isArray(proj.users_org)
              ? proj.users_org[0] || {}
              : proj.users_org || {};

            const projectData: ProjectData = {
              id: proj.id,
              title: proj.title,
              project_type: proj.project_type,
              dest_country: proj.dest_country,
              min_age: proj.min_age,
              max_age: proj.max_age,
              covers_rup_flights: proj.covers_rup_flights,
              is_last_minute: proj.is_last_minute,
              themes: proj.themes,
              duration_days: proj.duration_days,
              travel_budget_min: proj.travel_budget_min,
              travel_budget_max: proj.travel_budget_max,
              financing_type: proj.financing_type,
              org_name: org.org_name,
              org_logo_url: org.avatar_url,
              created_at: proj.created_at,
              verification_status: org.verification_status,
              is_favorite: interaction.is_favorite,
              is_applied: interaction.is_applied,
            };

            const updatedDate = format.dateTime(new Date(interaction.updated_at), {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            // Carpetas personalizadas a las que pertenece este proyecto
            const assignedFolderIds = folderAssignments[proj.id] || [];
            const assignedFolders = customFolders.filter((f) => assignedFolderIds.includes(f.id));

            return (
              <div key={proj.id} className="flex flex-col h-full space-y-2">
                {/* Top interaction badge */}
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    {activeFolderId === "applied" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-hyper-violet" />
                        <span>{t("appliedOn")} {updatedDate}</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-plasma-cyan" />
                        <span>{t("savedOn")} {updatedDate}</span>
                      </>
                    )}
                  </span>

                  {/* Botón para organizar proyecto en colecciones personalizadas */}
                  <button
                    type="button"
                    onClick={() => onManageProject({ id: proj.id, title: proj.title })}
                    title={t("assignToCollection")}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-plasma-cyan transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Collections ({assignedFolders.length})</span>
                  </button>
                </div>

                {/* Main Project Card */}
                <div className="flex-1">
                  <ProjectCard project={projectData} />
                </div>

                {/* Assigned Folder Pills preview under card */}
                {assignedFolders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                    {assignedFolders.map((af) => {
                      const cStyle = FOLDER_COLOR_CLASSES[af.color] || FOLDER_COLOR_CLASSES["plasma-cyan"];
                      return (
                        <span
                          key={af.id}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${cStyle.badge}`}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{af.name}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Controles de paginación centrados */}
        {totalPages > 1 && (
          <div className="pt-8 border-t border-void-border flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  currentPage <= 1
                    ? "border-void-border bg-void-surface/40 text-gray-600 cursor-not-allowed select-none"
                    : "border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan cursor-pointer"
                }`}
              >
                <ChevronLeft className="w-4 h-4 text-plasma-cyan" />
                <span>{t("previous")}</span>
              </button>

              <div className="px-4 py-2 rounded-lg border border-void-border bg-void-deep text-xs font-semibold text-plasma-cyan tracking-wider">
                {t("pageOf", {
                  current: currentPage,
                  total: totalPages,
                }) || `Page ${currentPage} of ${totalPages}`}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  currentPage >= totalPages
                    ? "border-void-border bg-void-surface/40 text-gray-600 cursor-not-allowed select-none"
                    : "border-void-border bg-void-surface text-gray-200 hover:text-white hover:border-plasma-cyan cursor-pointer"
                }`}
              >
                <span>{t("next")}</span>
                <ChevronRight className="w-4 h-4 text-plasma-cyan" />
              </button>
            </div>

            <span className="text-xs text-gray-500 font-medium">
              {t("showingResults", {
                from: filteredListLength === 0 ? 0 : fromIndex + 1,
                to: Math.min(toIndex, filteredListLength),
                total: filteredListLength,
              }) || `Showing ${filteredListLength === 0 ? 0 : fromIndex + 1} - ${Math.min(toIndex, filteredListLength)} of ${filteredListLength} missions`}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (currentFolderList.length > 0) {
    /* No results matching filter in current folder */
    return (
      <div className="py-20 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40 p-8 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl border border-void-border bg-void-deep flex items-center justify-center text-gray-500">
          <Filter className="w-7 h-7 text-plasma-cyan/60" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {t("noFilteredTitle")}
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          {t("noFilteredDesc")}
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-void-border bg-void-surface text-plasma-cyan text-xs font-semibold hover:border-plasma-cyan transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t("resetFilters")}</span>
        </button>
      </div>
    );
  }

  /* Empty state for this specific folder */
  return (
    <div className="py-24 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/40 p-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-void-border bg-void-deep flex items-center justify-center text-gray-500 shadow-inner">
        {activeFolderId === "applied" ? (
          <Send className="w-8 h-8 text-hyper-violet/60" />
        ) : activeCustomFolder ? (
          <FolderOpen className="w-8 h-8 text-plasma-cyan/60" />
        ) : (
          <Bookmark className="w-8 h-8 text-plasma-cyan/60" />
        )}
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        {activeFolderId === "applied"
          ? (t("noAppliedTitle"))
          : activeCustomFolder
          ? (t("noMissionsInFolderTitle"))
          : (t("noSavedTitle"))}
      </h2>
      <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
        {activeFolderId === "applied"
          ? (t("noAppliedDesc"))
          : activeCustomFolder
          ? (t("noMissionsInFolderDesc"))
          : (t("noSavedDesc"))}
      </p>
      {activeCustomFolder ? (
        <button
          type="button"
          onClick={onGoToAllFavorites}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-plasma-cyan bg-plasma-cyan text-void-deep font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.25)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all cursor-pointer"
        >
          <Bookmark className="w-4 h-4" />
          <span>{t("goToAllFavorites")}</span>
        </button>
      ) : (
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-plasma-cyan bg-plasma-cyan text-void-deep font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.25)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all"
        >
          <Compass className="w-4 h-4" />
          <span>{t("exploreMissions")}</span>
        </Link>
      )}
    </div>
  );
}
