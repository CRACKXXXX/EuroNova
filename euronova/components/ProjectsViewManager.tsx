"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { ProjectCard, ProjectData } from "@/components/ProjectCard";
import { CreateAlertButton } from "@/components/CreateAlertButton";
import { useTranslations } from "next-intl";

interface ProjectsViewManagerProps {
  projects: ProjectData[];
}

const STORAGE_KEY = "euronova_projects_view_mode";

export function ProjectsViewManager({ projects }: ProjectsViewManagerProps) {
  const t = useTranslations("Projects");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "grid" || saved === "list") {
          setViewMode(saved);
        }
      } catch {
        // Ignorar
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggle = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignorar
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Top Utility Bar: Create Alert + Grid/List Switcher */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-void-border/60">
        <div className="flex items-center gap-3">
          <CreateAlertButton />
          <span className="text-xs text-gray-400 hidden sm:inline-block">
            {projects.length} missions in current orbit
          </span>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-void-surface border border-void-border shadow-inner">
          <button
            type="button"
            onClick={() => handleToggle("grid")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
            title={t("gridView")}
            aria-label={t("gridView")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToggle("list")}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
            title={t("listView")}
            aria-label={t("listView")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projects Container (Grid or Horizontal Row Layout) */}
      {projects && projects.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max"
              : "flex flex-col gap-4"
          }
        >
          {projects.map((project) => (
            <div key={project.id} className={viewMode === "list" ? "w-full" : "h-full"}>
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-void-border rounded-2xl bg-void-surface/50">
          <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {t("waitingTransmissions")}
          </h3>
          <p className="text-gray-400">{t("adjustFilters")}</p>
        </div>
      )}
    </div>
  );
}
