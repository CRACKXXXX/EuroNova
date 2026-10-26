"use client";

import React from "react";
import {
  Bookmark,
  Send,
  Folder,
  FolderPlus,
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  type CustomFolder,
  type MissionTranslator,
  FOLDER_COLOR_CLASSES,
} from "./MissionsTypes";

interface MissionsSidebarProps {
  activeFolderId: string;
  setActiveFolderId: (id: string) => void;
  setCurrentPage: (p: number) => void;
  savedCount: number;
  appliedCount: number;
  customFolders: CustomFolder[];
  customFolderCounts: Record<string, number>;
  onOpenCreateFolder: () => void;
  onStartEditFolder: (f: CustomFolder, e?: React.MouseEvent) => void;
  onOpenDeleteFolder: (f: CustomFolder) => void;
  t: MissionTranslator;
}

export function MissionsSidebar({
  activeFolderId,
  setActiveFolderId,
  setCurrentPage,
  savedCount,
  appliedCount,
  customFolders,
  customFolderCounts,
  onOpenCreateFolder,
  onStartEditFolder,
  onOpenDeleteFolder,
  t,
}: MissionsSidebarProps) {
  return (
    <>
      {/* ========================================================
          MOBILE TOP FOLDER TABS (< lg)
      ======================================================== */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {/* All Favorites Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveFolderId("all");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
            activeFolderId === "all"
              ? "bg-plasma-cyan/20 border-plasma-cyan text-white shadow-[0_0_12px_rgba(0,229,255,0.25)]"
              : "bg-void-surface border-void-border text-gray-400"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-plasma-cyan" />
          <span>{t("allFavorites")}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-void-border text-gray-300">
            {savedCount}
          </span>
        </button>

        {/* Applied Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveFolderId("applied");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
            activeFolderId === "applied"
              ? "bg-hyper-violet/20 border-hyper-violet text-white shadow-[0_0_12px_rgba(99,102,241,0.25)]"
              : "bg-void-surface border-void-border text-gray-400"
          }`}
        >
          <Send className="w-3.5 h-3.5 text-hyper-violet" />
          <span>{t("appliedMissions")}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-void-border text-gray-300">
            {appliedCount}
          </span>
        </button>

        {/* Custom Folders Chips */}
        {customFolders.map((f) => {
          const isSelected = activeFolderId === f.id;
          const colorStyles = FOLDER_COLOR_CLASSES[f.color] || FOLDER_COLOR_CLASSES["plasma-cyan"];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setActiveFolderId(f.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? `${colorStyles.bg} ${colorStyles.border} text-white shadow-[0_0_12px_rgba(0,229,255,0.2)]`
                  : "bg-void-surface border-void-border text-gray-400"
              }`}
            >
              {isSelected ? (
                <FolderOpen className={`w-3.5 h-3.5 ${colorStyles.text}`} />
              ) : (
                <Folder className={`w-3.5 h-3.5 ${colorStyles.text}`} />
              )}
              <span>{f.name}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-void-border text-gray-300">
                {customFolderCounts[f.id] || 0}
              </span>
            </button>
          );
        })}

        {/* New Folder Button Mobile */}
        <button
          type="button"
          onClick={onOpenCreateFolder}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-plasma-cyan/40 text-plasma-cyan text-xs font-semibold shrink-0 hover:bg-plasma-cyan/10 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("newFolder")}</span>
        </button>
      </div>

      {/* ========================================================
          DESKTOP 2-COLUMN LAYOUT (Sidebar)
      ======================================================== */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 space-y-5 bg-void-surface/50 border border-void-border rounded-2xl p-5 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-void-border">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-plasma-cyan" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              {t("collectionsTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenCreateFolder}
            title={t("newFolder")}
            className="p-1.5 rounded-lg bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan hover:bg-plasma-cyan/20 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* System Collections */}
        <div className="space-y-1.5">
          {/* All Favorites */}
          <button
            type="button"
            onClick={() => {
              setActiveFolderId("all");
              setCurrentPage(1);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              activeFolderId === "all"
                ? "bg-plasma-cyan/15 border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                : "bg-void-deep/60 border-transparent text-gray-400 hover:text-white hover:bg-void-surface"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Bookmark className={`w-4 h-4 shrink-0 ${activeFolderId === "all" ? "text-plasma-cyan" : "text-gray-400"}`} />
              <span className="truncate">{t("allFavorites")}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeFolderId === "all"
                  ? "bg-plasma-cyan text-void-deep"
                  : "bg-void-border text-gray-300"
              }`}
            >
              {savedCount}
            </span>
          </button>

          {/* Applied Missions */}
          <button
            type="button"
            onClick={() => {
              setActiveFolderId("applied");
              setCurrentPage(1);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              activeFolderId === "applied"
                ? "bg-hyper-violet/20 border-hyper-violet text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                : "bg-void-deep/60 border-transparent text-gray-400 hover:text-white hover:bg-void-surface"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Send className={`w-4 h-4 shrink-0 ${activeFolderId === "applied" ? "text-hyper-violet" : "text-gray-400"}`} />
              <span className="truncate">{t("appliedMissions")}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeFolderId === "applied"
                  ? "bg-hyper-violet text-white"
                  : "bg-void-border text-gray-300"
              }`}
            >
              {appliedCount}
            </span>
          </button>
        </div>

        {/* Custom Collections Section */}
        <div className="pt-3 border-t border-void-border space-y-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block px-1">
            {t("customFolders")}
          </span>

          <div className="space-y-1">
            {customFolders.map((f) => {
              const isSelected = activeFolderId === f.id;
              const colorStyles = FOLDER_COLOR_CLASSES[f.color] || FOLDER_COLOR_CLASSES["plasma-cyan"];
              const count = customFolderCounts[f.id] || 0;

              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setActiveFolderId(f.id);
                    setCurrentPage(1);
                  }}
                  className={`group/fitem flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? `${colorStyles.bg} ${colorStyles.border} text-white shadow-[0_0_15px_rgba(0,229,255,0.12)]`
                      : "bg-void-deep/60 border-transparent text-gray-400 hover:text-white hover:bg-void-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {isSelected ? (
                      <FolderOpen className={`w-4 h-4 shrink-0 ${colorStyles.text}`} />
                    ) : (
                      <Folder className={`w-4 h-4 shrink-0 ${colorStyles.text}`} />
                    )}
                    <span className="truncate">{f.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-void-border text-gray-300">
                      {count}
                    </span>
                    {/* Rename folder button */}
                    <button
                      type="button"
                      onClick={(e) => onStartEditFolder(f, e)}
                      title={t("renameFolder")}
                      className="opacity-0 group-hover/fitem:opacity-100 p-1 hover:text-plasma-cyan transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete folder button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteFolder(f);
                      }}
                      title={t("deleteFolder")}
                      className="opacity-0 group-hover/fitem:opacity-100 p-1 hover:text-nova-flare transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create Folder button */}
          <button
            type="button"
            onClick={onOpenCreateFolder}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-void-border text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/40 hover:bg-plasma-cyan/5 text-xs font-semibold transition-all cursor-pointer mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("createFolder")}</span>
          </button>
        </div>

        <div className="pt-2 text-[10px] text-gray-500 border-t border-void-border/50">
          🔒 Private collections mathematically isolated to your account.
        </div>
      </aside>
    </>
  );
}
