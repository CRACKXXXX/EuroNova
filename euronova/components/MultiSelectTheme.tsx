"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X, Tag } from "lucide-react";
import { PROJECT_THEMES, ERASMUS_THEMES, type ProjectThemeId } from "@/lib/constants/themes";
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Canonical themes list
  const canonicalThemes = useMemo(() => {
    return PROJECT_THEMES.map((t) => ({
      id: t.id,
      label: tThemes.has(t.labelKey) ? tThemes(t.labelKey) : t.id,
      isCanonical: true,
    }));
  }, [tThemes]);

  // Additional Erasmus themes list (excluding canonical duplicates)
  const additionalThemes = useMemo(() => {
    const canonicalSet = new Set(PROJECT_THEMES.map((t) => t.id));
    return ERASMUS_THEMES
      .filter((th) => !canonicalSet.has(th as ProjectThemeId))
      .map((th) => ({
        id: th,
        label: tThemes.has(th) ? tThemes(th) : th,
        isCanonical: false,
      }));
  }, [tThemes]);

  // Filtered by internal search query
  const filteredCanonical = useMemo(() => {
    if (!searchQuery.trim()) return canonicalThemes;
    const q = searchQuery.toLowerCase();
    return canonicalThemes.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [canonicalThemes, searchQuery]);

  const filteredAdditional = useMemo(() => {
    if (!searchQuery.trim()) return additionalThemes;
    const q = searchQuery.toLowerCase();
    return additionalThemes.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [additionalThemes, searchQuery]);

  const getThemeLabel = (themeId: string) => {
    const canonical = canonicalThemes.find((ct) => ct.id === themeId);
    if (canonical) return canonical.label;
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
        className="w-full min-h-[44px] bg-void-surface border border-void-border rounded-xl px-4 py-2.5 text-sm text-white focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none focus:border-plasma-cyan transition-all cursor-pointer flex justify-between items-center text-left"
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
                placeholder="Filter themes..."
                className="w-full bg-void-surface border border-void-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable list of categories */}
          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-2 max-h-60">
            {/* Core Canonical Categories */}
            {filteredCanonical.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-bold text-plasma-cyan uppercase tracking-wider">
                  Core Categories ({filteredCanonical.length})
                </div>
                <div className="space-y-0.5">
                  {filteredCanonical.map((theme) => {
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
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? "bg-plasma-cyan/15 text-white font-semibold"
                            : "text-gray-300 hover:bg-void-deep hover:text-white"
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
                  })}
                </div>
              </div>
            )}

            {/* Additional Erasmus+ Themes */}
            {filteredAdditional.length > 0 && (
              <div className="pt-1 border-t border-void-border/60">
                <div className="px-2.5 py-1 text-[10px] font-bold text-hyper-violet uppercase tracking-wider">
                  Erasmus+ Topics ({filteredAdditional.length})
                </div>
                <div className="space-y-0.5">
                  {filteredAdditional.map((theme) => {
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
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? "bg-hyper-violet/20 text-white font-semibold"
                            : "text-gray-300 hover:bg-void-deep hover:text-white"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? "bg-hyper-violet border-hyper-violet text-white font-bold"
                              : "border-gray-500"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{theme.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredCanonical.length === 0 && filteredAdditional.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-500">
                No matching themes found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
