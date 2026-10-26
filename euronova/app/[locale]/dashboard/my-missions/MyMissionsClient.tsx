"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast, Toaster } from "sonner";
import {
  type MissionInteraction,
  type CustomFolder,
  type MyMissionsClientProps,
  ITEMS_PER_PAGE,
  DEFAULT_CUSTOM_FOLDERS,
} from "./components/MissionsTypes";
import { MissionsSidebar } from "./components/MissionsSidebar";
import { MissionsFiltersBar } from "./components/MissionsFiltersBar";
import { MissionsGrid } from "./components/MissionsGrid";
import { MissionsModals } from "./components/MissionsModals";

export type { MissionInteraction, CustomFolder, MyMissionsClientProps };

export function MyMissionsClient({
  userId,
  initialInteractions,
  initialTab = "saved",
  initialType = "ALL",
  initialDest = "",
  initialQuery = "",
}: MyMissionsClientProps) {
  const t = useTranslations("MyMissions");
  const format = useFormatter();

  // Claves de almacenamiento rigurosamente aisladas por el UUID del usuario autenticado
  const foldersStorageKey = `user_${userId}_folders`;
  const assignmentsStorageKey = `user_${userId}_assignments`;

  // Selección de colección activa: "all" (Todos los favoritos), "applied" (Misiones aplicadas) o ID de carpeta personalizada
  const [activeFolderId, setActiveFolderId] = useState<string>(
    initialTab === "applied" ? "applied" : "all"
  );

  // Carpetas y asignaciones cargadas desde localStorage estrictamente para userId
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>(DEFAULT_CUSTOM_FOLDERS);
  const [folderAssignments, setFolderAssignments] = useState<Record<string, string[]>>({});

  // Modales interactivos (Cero popups nativos de navegador)
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [newFolderColor, setNewFolderColor] = useState<CustomFolder["color"]>("plasma-cyan");

  const [folderToEdit, setFolderToEdit] = useState<CustomFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState<string>("");
  const [editFolderColor, setEditFolderColor] = useState<CustomFolder["color"]>("plasma-cyan");

  const [folderToDelete, setFolderToDelete] = useState<CustomFolder | null>(null);

  const [managingProject, setManagingProject] = useState<{ id: string; title: string } | null>(null);

  // Filtros y búsqueda
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedDest, setSelectedDest] = useState<string>(initialDest);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);

  // Paginación independiente
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Carga reactiva de carpetas y asignaciones scoped al usuario autenticado
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      try {
        const legacyFoldersKey = `euronova_mission_folders_${userId}`;
        const legacyAssignmentsKey = `euronova_project_folders_${userId}`;

        const storedFolders = localStorage.getItem(foldersStorageKey) || localStorage.getItem(legacyFoldersKey);
        if (storedFolders) {
          setCustomFolders(JSON.parse(storedFolders));
        } else {
          setCustomFolders(DEFAULT_CUSTOM_FOLDERS);
          localStorage.setItem(foldersStorageKey, JSON.stringify(DEFAULT_CUSTOM_FOLDERS));
        }

        const storedAssignments = localStorage.getItem(assignmentsStorageKey) || localStorage.getItem(legacyAssignmentsKey);
        if (storedAssignments) {
          setFolderAssignments(JSON.parse(storedAssignments));
        } else {
          setFolderAssignments({});
        }
      } catch {
        // LocalStorage access restricted
      }
    });
    return () => {
      ignore = true;
    };
  }, [userId, foldersStorageKey, assignmentsStorageKey]);

  const saveCustomFolders = (updatedFolders: CustomFolder[]) => {
    setCustomFolders(updatedFolders);
    if (!userId) return;
    try {
      localStorage.setItem(foldersStorageKey, JSON.stringify(updatedFolders));
    } catch {
      // LocalStorage access restricted
    }
  };

  const saveAssignments = (updatedAssignments: Record<string, string[]>) => {
    setFolderAssignments(updatedAssignments);
    if (!userId) return;
    try {
      localStorage.setItem(assignmentsStorageKey, JSON.stringify(updatedAssignments));
    } catch {
      // LocalStorage access restricted
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      toast.error(t("enterCollectionNameError"));
      return;
    }

    const newId = `folder_${Date.now()}`;
    const newFolder: CustomFolder = {
      id: newId,
      name: trimmed,
      color: newFolderColor,
    };

    const updated = [...customFolders, newFolder];
    saveCustomFolders(updated);
    setActiveFolderId(newId);
    setNewFolderName("");
    setIsCreatingFolder(false);
    toast.success(t("collectionCreatedSuccess", { name: trimmed }));
  };

  const handleStartEditFolder = (f: CustomFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolderToEdit(f);
    setEditFolderName(f.name);
    setEditFolderColor(f.color);
  };

  const handleSaveEditFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToEdit) return;
    const trimmed = editFolderName.trim();
    if (!trimmed) {
      toast.error(t("enterCollectionNameError"));
      return;
    }

    const updated = customFolders.map((f) =>
      f.id === folderToEdit.id ? { ...f, name: trimmed, color: editFolderColor } : f
    );
    saveCustomFolders(updated);
    toast.success(t("collectionUpdatedSuccess", { name: trimmed }));
    setFolderToEdit(null);
  };

  const handleConfirmDeleteFolder = () => {
    if (!folderToDelete) return;
    const folderId = folderToDelete.id;
    const folderName = folderToDelete.name;

    const updated = customFolders.filter((f) => f.id !== folderId);
    saveCustomFolders(updated);

    // Limpiar asignaciones asociadas a esta carpeta
    const updatedAssignments = { ...folderAssignments };
    Object.keys(updatedAssignments).forEach((projId) => {
      updatedAssignments[projId] = (updatedAssignments[projId] || []).filter((id) => id !== folderId);
    });
    saveAssignments(updatedAssignments);

    if (activeFolderId === folderId) {
      setActiveFolderId("all");
    }

    setFolderToDelete(null);
    toast.success(t("collectionDeletedSuccess", { name: folderName }));
  };

  const toggleProjectInFolder = (projectId: string, folderId: string) => {
    const currentFolders = folderAssignments[projectId] || [];
    const exists = currentFolders.includes(folderId);
    const updatedList = exists
      ? currentFolders.filter((id) => id !== folderId)
      : [...currentFolders, folderId];

    const updatedAssignments = {
      ...folderAssignments,
      [projectId]: updatedList,
    };
    saveAssignments(updatedAssignments);

    const targetFolder = customFolders.find((f) => f.id === folderId);
    if (exists) {
      toast.info(t("removedFromCollection", { name: targetFolder?.name || t("collectionDefault") }));
    } else {
      toast.success(t("addedToCollection", { name: targetFolder?.name || t("collectionDefault") }));
    }
  };

  // Filtrado de interacciones válidas del usuario autenticado
  const validInteractions = useMemo(() => {
    return initialInteractions.filter(
      (item) => item.projects && typeof item.projects === "object"
    );
  }, [initialInteractions]);

  const savedList = useMemo(() => {
    return validInteractions.filter((item) => item.is_favorite);
  }, [validInteractions]);

  const appliedList = useMemo(() => {
    return validInteractions.filter((item) => item.is_applied);
  }, [validInteractions]);

  // Lista de proyectos de la colección activa
  const currentFolderList = useMemo(() => {
    if (activeFolderId === "all") {
      return savedList;
    }
    if (activeFolderId === "applied") {
      return appliedList;
    }
    // Carpeta personalizada
    return savedList.filter((item) => {
      const projId = item.projects?.id;
      if (!projId) return false;
      const assigned = folderAssignments[projId] || [];
      return assigned.includes(activeFolderId);
    });
  }, [activeFolderId, savedList, appliedList, folderAssignments]);

  // Recuento de proyectos por carpeta personalizada
  const customFolderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customFolders.forEach((f) => {
      counts[f.id] = savedList.filter((item) => {
        const projId = item.projects?.id;
        if (!projId) return false;
        return (folderAssignments[projId] || []).includes(f.id);
      }).length;
    });
    return counts;
  }, [customFolders, savedList, folderAssignments]);

  // Filtrado reactivo por tipo, destino y query
  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return currentFolderList.filter((item) => {
      const proj = item.projects;
      if (!proj) return false;

      if (selectedType && selectedType !== "ALL") {
        const pType = proj.project_type;
        const matches =
          pType === selectedType ||
          (selectedType === "YE" && pType === "Youth Exchange") ||
          (selectedType === "TC" && pType === "Training");
        if (!matches) return false;
      }

      if (selectedDest && proj.dest_country !== selectedDest) {
        return false;
      }

      if (query && !proj.title.toLowerCase().includes(query)) {
        return false;
      }

      return true;
    });
  }, [currentFolderList, selectedType, selectedDest, searchQuery]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const fromIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const toIndex = fromIndex + ITEMS_PER_PAGE;
  const paginatedList = filteredList.slice(fromIndex, toIndex);

  // Sincronización limpia de parámetros URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeFolderId === "applied") params.set("tab", "applied");
    else if (activeFolderId !== "all") params.set("folder", activeFolderId);
    if (selectedType && selectedType !== "ALL") params.set("type", selectedType);
    if (selectedDest) params.set("dest", selectedDest);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    const qs = params.toString();
    const nextUrl = `/dashboard/my-missions${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeFolderId, selectedType, selectedDest, searchQuery]);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleCountryToggle = (code: string) => {
    setSelectedDest((prev) => (prev === code ? "" : code));
    setCurrentPage(1);
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedType("ALL");
    setSelectedDest("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const availableCountries = useMemo(() => {
    return Array.from(
      new Set(currentFolderList.map((i) => i.projects?.dest_country).filter(Boolean))
    ).slice(0, 8);
  }, [currentFolderList]);

  const activeCustomFolder = customFolders.find((f) => f.id === activeFolderId);

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" theme="dark" closeButton />

      {/* MOBILE TOP FOLDER TABS & DESKTOP SIDEBAR */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        <MissionsSidebar
          activeFolderId={activeFolderId}
          setActiveFolderId={setActiveFolderId}
          setCurrentPage={setCurrentPage}
          savedCount={savedList.length}
          appliedCount={appliedList.length}
          customFolders={customFolders}
          customFolderCounts={customFolderCounts}
          onOpenCreateFolder={() => setIsCreatingFolder(true)}
          onStartEditFolder={handleStartEditFolder}
          onOpenDeleteFolder={(f) => setFolderToDelete(f)}
          t={t}
        />

        {/* MAIN CONTROLS, FILTERS & MISSIONS GRID */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          <MissionsFiltersBar
            activeFolderId={activeFolderId}
            activeCustomFolder={activeCustomFolder}
            filteredCount={filteredList.length}
            searchQuery={searchQuery}
            onSearchInput={handleSearchInput}
            selectedType={selectedType}
            onTypeSelect={handleTypeSelect}
            selectedDest={selectedDest}
            onCountryToggle={handleCountryToggle}
            availableCountries={availableCountries}
            onStartEditFolder={handleStartEditFolder}
            onOpenDeleteFolder={(f) => setFolderToDelete(f)}
            t={t}
          />

          <MissionsGrid
            paginatedList={paginatedList}
            currentFolderList={currentFolderList}
            filteredListLength={filteredList.length}
            activeFolderId={activeFolderId}
            activeCustomFolder={activeCustomFolder}
            customFolders={customFolders}
            folderAssignments={folderAssignments}
            currentPage={currentPage}
            totalPages={totalPages}
            fromIndex={fromIndex}
            toIndex={toIndex}
            onPageChange={setCurrentPage}
            onResetFilters={handleResetFilters}
            onGoToAllFavorites={() => setActiveFolderId("all")}
            onManageProject={setManagingProject}
            format={format}
            t={t}
          />
        </div>
      </div>

      {/* ALL INTERACTIVE MODALS */}
      <MissionsModals
        isCreatingFolder={isCreatingFolder}
        setIsCreatingFolder={setIsCreatingFolder}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        newFolderColor={newFolderColor}
        setNewFolderColor={setNewFolderColor}
        handleCreateFolder={handleCreateFolder}
        folderToEdit={folderToEdit}
        setFolderToEdit={setFolderToEdit}
        editFolderName={editFolderName}
        setEditFolderName={setEditFolderName}
        editFolderColor={editFolderColor}
        setEditFolderColor={setEditFolderColor}
        handleSaveEditFolder={handleSaveEditFolder}
        folderToDelete={folderToDelete}
        setFolderToDelete={setFolderToDelete}
        handleConfirmDeleteFolder={handleConfirmDeleteFolder}
        managingProject={managingProject}
        setManagingProject={setManagingProject}
        customFolders={customFolders}
        folderAssignments={folderAssignments}
        toggleProjectInFolder={toggleProjectInFolder}
        t={t}
      />
    </div>
  );
}

export default MyMissionsClient;
