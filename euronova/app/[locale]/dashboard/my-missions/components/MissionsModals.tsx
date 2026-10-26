"use client";

import React from "react";
import {
  Folder,
  FolderPlus,
  Plus,
  Pencil,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  type CustomFolder,
  type MissionTranslator,
  FOLDER_COLOR_CLASSES,
} from "./MissionsTypes";

interface MissionsModalsProps {
  isCreatingFolder: boolean;
  setIsCreatingFolder: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  newFolderColor: CustomFolder["color"];
  setNewFolderColor: (c: CustomFolder["color"]) => void;
  handleCreateFolder: (e: React.FormEvent) => void;
  folderToEdit: CustomFolder | null;
  setFolderToEdit: (f: CustomFolder | null) => void;
  editFolderName: string;
  setEditFolderName: (v: string) => void;
  editFolderColor: CustomFolder["color"];
  setEditFolderColor: (c: CustomFolder["color"]) => void;
  handleSaveEditFolder: (e: React.FormEvent) => void;
  folderToDelete: CustomFolder | null;
  setFolderToDelete: (f: CustomFolder | null) => void;
  handleConfirmDeleteFolder: () => void;
  managingProject: { id: string; title: string } | null;
  setManagingProject: (p: { id: string; title: string } | null) => void;
  customFolders: CustomFolder[];
  folderAssignments: Record<string, string[]>;
  toggleProjectInFolder: (projectId: string, folderId: string) => void;
  t: MissionTranslator;
}

const AVAILABLE_FOLDER_COLORS: CustomFolder["color"][] = [
  "plasma-cyan",
  "hyper-violet",
  "rup-emerald",
  "nova-flare",
  "amber-400",
];

export function MissionsModals({
  isCreatingFolder,
  setIsCreatingFolder,
  newFolderName,
  setNewFolderName,
  newFolderColor,
  setNewFolderColor,
  handleCreateFolder,
  folderToEdit,
  setFolderToEdit,
  editFolderName,
  setEditFolderName,
  editFolderColor,
  setEditFolderColor,
  handleSaveEditFolder,
  folderToDelete,
  setFolderToDelete,
  handleConfirmDeleteFolder,
  managingProject,
  setManagingProject,
  customFolders,
  folderAssignments,
  toggleProjectInFolder,
  t,
}: MissionsModalsProps) {
  return (
    <>
      {/* ========================================================
          MODAL: CREATE NEW COLLECTION (Zero browser prompt)
      ======================================================== */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 bg-void-deep/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-void-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div className="flex items-center gap-2.5">
                <FolderPlus className="w-5 h-5 text-plasma-cyan" />
                <h3 className="text-lg font-bold text-white">{t("createFolder")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                  {t("collectionNameLabel")}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={t("folderNamePlaceholder")}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-plasma-cyan transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                  {t("selectColor")}
                </label>
                <div className="flex items-center gap-2">
                  {AVAILABLE_FOLDER_COLORS.map((colorKey) => {
                    const isSelected = newFolderColor === colorKey;
                    const cStyles = FOLDER_COLOR_CLASSES[colorKey];
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setNewFolderColor(colorKey)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                          cStyles.bg
                        } ${cStyles.border} ${isSelected ? "scale-110 shadow-lg ring-2 ring-white/40" : "opacity-70 hover:opacity-100"}`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-void-border">
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-4 py-2 rounded-xl border border-void-border text-gray-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] transition-all cursor-pointer"
                >
                  {t("createFolder")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RENAME / EDIT COLLECTION (Zero browser prompt)
      ======================================================== */}
      {folderToEdit && (
        <div className="fixed inset-0 z-50 bg-void-deep/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-void-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div className="flex items-center gap-2.5">
                <Pencil className="w-5 h-5 text-plasma-cyan" />
                <h3 className="text-lg font-bold text-white">{t("editFolder")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setFolderToEdit(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                  {t("collectionNameLabel")}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  placeholder={t("folderNamePlaceholder")}
                  className="w-full bg-void-deep border border-void-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-plasma-cyan transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                  {t("selectColor")}
                </label>
                <div className="flex items-center gap-2">
                  {AVAILABLE_FOLDER_COLORS.map((colorKey) => {
                    const isSelected = editFolderColor === colorKey;
                    const cStyles = FOLDER_COLOR_CLASSES[colorKey];
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setEditFolderColor(colorKey)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                          cStyles.bg
                        } ${cStyles.border} ${isSelected ? "scale-110 shadow-lg ring-2 ring-white/40" : "opacity-70 hover:opacity-100"}`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-void-border">
                <button
                  type="button"
                  onClick={() => setFolderToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-void-border text-gray-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] transition-all cursor-pointer"
                >
                  {t("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM DELETE COLLECTION (Zero browser confirm)
      ======================================================== */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 bg-void-deep/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-nova-flare/40 rounded-2xl p-6 max-w-md w-full shadow-[0_0_35px_rgba(255,46,99,0.2)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-nova-flare/15 border border-nova-flare/40 flex items-center justify-center text-nova-flare shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {t("confirmDeleteFolder")}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {t.rich("deleteFolderWarning", {
                    name: folderToDelete.name,
                    strong: (c: React.ReactNode) => <span className="font-bold text-white">{c}</span>,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 rounded-xl border border-void-border text-gray-300 text-xs font-bold hover:text-white transition-all cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                className="px-5 py-2 rounded-xl bg-nova-flare text-white text-xs font-bold hover:brightness-110 shadow-[0_0_15px_rgba(255,46,99,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{t("deleteCollectionBtn")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MANAGE PROJECT FOLDERS / COLLECTIONS
      ======================================================== */}
      {managingProject && (
        <div className="fixed inset-0 z-50 bg-void-deep/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-void-surface border border-void-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-void-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <Folder className="w-5 h-5 text-plasma-cyan shrink-0" />
                <h3 className="text-base font-bold text-white truncate">
                  {t("manageCollections")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setManagingProject(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 line-clamp-2">
              {t.rich("selectCollectionsDesc", {
                title: managingProject.title,
                strong: (c: React.ReactNode) => <span className="text-white font-semibold">{c}</span>,
              })}
            </p>

            {customFolders.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {customFolders.map((cf) => {
                  const assigned = (folderAssignments[managingProject.id] || []).includes(cf.id);
                  const cStyle = FOLDER_COLOR_CLASSES[cf.color] || FOLDER_COLOR_CLASSES["plasma-cyan"];

                  return (
                    <div
                      key={cf.id}
                      onClick={() => toggleProjectInFolder(managingProject.id, cf.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        assigned
                          ? `${cStyle.bg} ${cStyle.border} text-white`
                          : "bg-void-deep border-void-border text-gray-400 hover:text-white hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder className={`w-4 h-4 ${cStyle.text}`} />
                        <span>{cf.name}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          assigned
                            ? "bg-plasma-cyan border-plasma-cyan text-void-deep"
                            : "border-void-border bg-void-surface"
                        }`}
                      >
                        {assigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-4 text-center">
                {t("noCustomCollectionsDesc")}
              </p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-void-border">
              <button
                type="button"
                onClick={() => {
                  setManagingProject(null);
                  setIsCreatingFolder(true);
                }}
                className="text-xs text-plasma-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("newFolder")}</span>
              </button>

              <button
                type="button"
                onClick={() => setManagingProject(null)}
                className="px-5 py-2 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
