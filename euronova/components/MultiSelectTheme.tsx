"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X, Tag } from "lucide-react";
import { PROJECT_THEMES, ERASMUS_THEMES } from "@/lib/constants/themes";
import { useTranslations } from "next-intl";

interface MultiSelectThemeProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectTheme({
  selected,
  onChange,
  placeholder = "Select themes...",
  className = "",
}: MultiSelectThemeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tThemes = useTranslations("ProjectThemes");
  const tSidebar = useTranslations("Sidebar");
  const tCommon = useTranslations("Common");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleTheme = (themeId: string) => {
    if (selected.includes(themeId)) {
      onChange(selected.filter((t) => t !== themeId));
    } else {
      onChange([...selected, themeId]);
    }
  };

  // Cohesive unified themes list (deduplicated canonical + additional themes, sorted alphabetically)
  const unifiedThemes = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; label: string }[] = [];

    // 1. Add canonical project themes
    for (const t of PROJECT_THEMES) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        list.push({
          id: t.id,
          label: tThemes.has(t.labelKey) ? tThemes(t.labelKey) : t.id,
        });
      }
    }

    // 2. Add additional Erasmus+ themes
    for (const th of ERASMUS_THEMES) {
      if (!seen.has(th)) {
        seen.add(th);
        list.push({
          id: th,
          label: tThemes.has(th) ? tThemes(th) : th,
        });
      }
    }

    // Alphabetical sort by localized label for seamless browsing
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [tThemes]);

  // Filtered by internal search query
  const filteredThemes = useMemo(() => {
    if (!searchQuery.trim()) return unifiedThemes;
    const q = searchQuery.toLowerCase();
    return unifiedThemes.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [unifiedThemes, searchQuery]);

  const getThemeLabel = (themeId: string) => {
    const found = unifiedThemes.find((ut) => ut.id === themeId);
    if (found) return found.label;
    if (tThemes.has(themeId)) return tThemes(themeId);
    return themeId;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            if (prev) setSearchQuery("");
            return !prev;
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => {
              if (prev) setSearchQuery("");
              return !prev;
            });
          } else if (e.key === "Escape" && isOpen) {
            e.preventDefault();
            setIsOpen(false);
            setSearchQuery("");
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder}
        className="w-full min-h-[44px] bg-void-surface border border-void-border rounded-xl px-4 py-2.5 text-sm text-white focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none focus:border-plasma-cyan transition-all cursor-pointer flex justify-between items-center text-left touch-manipulation"
      >
        <span className="truncate pr-3 text-gray-300 flex items-center gap-2">
          <Tag className="w-4 h-4 text-plasma-cyan shrink-0" />
          {selected.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            <span className="text-white font-medium">
              {selected.length === 1
                ? getThemeLabel(selected[0])
                : `${selected.length} themes selected`}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? "rotate-180 text-plasma-cyan" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 w-full mt-2 bg-void-surface/98 border border-plasma-cyan/40 rounded-xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] max-h-72 overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Internal Quick Search Bar */}
          <div className="p-2 border-b border-void-border bg-void-deep/80 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tSidebar("searchPlaceholder")}
                className="w-full bg-void-surface border border-void-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer touch-manipulation"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Unified Scrollable Cohesive Theme List */}
          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 max-h-60">
            {filteredThemes.length > 0 ? (
              filteredThemes.map((theme) => {
                const isSelected = selected.includes(theme.id);
                return (
                  <div
                    key={theme.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => toggleTheme(theme.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleTheme(theme.id);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 min-h-[38px] rounded-lg cursor-pointer transition-colors text-xs select-none touch-manipulation ${
                      isSelected
                        ? "bg-plasma-cyan/15 text-white font-semibold"
                        : "text-gray-300 hover:bg-void-deep hover:text-white active:bg-void-deep"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? "bg-plasma-cyan border-plasma-cyan text-void-deep font-bold"
                          : "border-gray-500"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{theme.label}</span>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">
                {tCommon("noOptions")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelectTheme;
