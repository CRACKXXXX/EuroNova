"use client";

/* eslint-disable @next/next/no-img-element */
import React from "react";
import {
  Bookmark,
  Send,
  FolderOpen,
  Pencil,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import {
  type CustomFolder,
  type MissionTranslator,
  FILTER_TYPES,
  FOLDER_COLOR_CLASSES,
} from "./MissionsTypes";
import { COUNTRIES } from "@/lib/constants/countries";

interface MissionsFiltersBarProps {
  activeFolderId: string;
  activeCustomFolder: CustomFolder | undefined;
  filteredCount: number;
  searchQuery: string;
  onSearchInput: (val: string) => void;
  selectedType: string;
  onTypeSelect: (type: string) => void;
  selectedDest: string;
  onCountryToggle: (code: string) => void;
  availableCountries: (string | undefined)[];
  onStartEditFolder: (f: CustomFolder) => void;
  onOpenDeleteFolder: (f: CustomFolder) => void;
  t: MissionTranslator;
}

export function MissionsFiltersBar({
  activeFolderId,
  activeCustomFolder,
  filteredCount,
  searchQuery,
  onSearchInput,
  selectedType,
  onTypeSelect,
  selectedDest,
  onCountryToggle,
  availableCountries,
  onStartEditFolder,
  onOpenDeleteFolder,
  t,
}: MissionsFiltersBarProps) {
  return (
    <div className="space-y-4">
      {/* Header of Active Collection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-void-surface/50 border border-void-border backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-void-deep border border-void-border flex items-center justify-center shrink-0">
            {activeFolderId === "applied" ? (
              <Send className="w-5 h-5 text-hyper-violet" />
            ) : activeCustomFolder ? (
              <FolderOpen className={`w-5 h-5 ${FOLDER_COLOR_CLASSES[activeCustomFolder.color]?.text || "text-plasma-cyan"}`} />
            ) : (
              <Bookmark className="w-5 h-5 text-plasma-cyan" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {activeFolderId === "applied"
                  ? (t("appliedMissions"))
                  : activeCustomFolder
                  ? activeCustomFolder.name
                  : (t("allFavorites"))}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-void-deep border border-void-border text-gray-400">
                {filteredCount}
              </span>

              {activeCustomFolder && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    type="button"
                    onClick={() => onStartEditFolder(activeCustomFolder)}
                    title={t("renameCollection")}
                    className="p-1 rounded-lg border border-void-border bg-void-deep text-gray-400 hover:text-white hover:border-plasma-cyan transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDeleteFolder(activeCustomFolder)}
                    title={t("deleteCollection")}
                    className="p-1 rounded-lg border border-void-border bg-void-deep text-gray-400 hover:text-nova-flare hover:border-nova-flare transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeFolderId === "applied"
                ? "Missions you have officially marked as applied."
                : activeCustomFolder
                ? "Custom collection organized by you."
                : "All bookmarked opportunities in your orbit."}
            </p>
          </div>
        </div>

        {/* Instant Search Bar */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-void-surface border border-void-border rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-all"
          />
        </div>
      </div>

      {/* Type Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="bg-void-surface/90 backdrop-blur-xl border border-void-border/80 rounded-2xl p-1.5 shadow-[0_0_25px_rgba(0,0,0,0.6)] flex items-center gap-1 overflow-x-auto max-w-full">
          <div className="flex items-center gap-1.5 px-2.5 text-gray-400 text-xs shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5 text-plasma-cyan" />
            <span className="hidden sm:inline">{t("filterType")}</span>
          </div>
          {FILTER_TYPES.map((type) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeSelect(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-105"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Secondary Destination Country Filters */}
        {availableCountries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onCountryToggle("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                !selectedDest
                  ? "bg-void-surface border-plasma-cyan/60 text-plasma-cyan shadow-[0_0_8px_rgba(0,229,255,0.15)]"
                  : "bg-void-deep border-void-border text-gray-400 hover:text-white"
              }`}
            >
              {t("allCountries")}
            </button>

            {availableCountries.map((countryCode) => {
              if (!countryCode) return null;
              const countryInfo = COUNTRIES.find((c) => c.code === countryCode);
              const isSelected = selectedDest === countryCode;
              return (
                <button
                  key={countryCode}
                  type="button"
                  onClick={() => onCountryToggle(countryCode)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-plasma-cyan/20 border-plasma-cyan text-white shadow-[0_0_10px_rgba(0,229,255,0.15)]"
                      : "bg-void-surface border-void-border text-gray-400 hover:text-white"
                  }`}
                >
                  {countryInfo ? (
                    <img
                      src={countryInfo.flagUrl}
                      alt={countryInfo.name}
                      className="w-4 h-auto rounded-[2px]"
                    />
                  ) : (
                    <span>🌍</span>
                  )}
                  <span>{countryCode}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
