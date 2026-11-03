"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Search,
  ExternalLink,
  Globe,
  Building2,
  MessageCircle,
  Send,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Tag,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { COUNTRIES, getFlagUrl } from "@/lib/constants/countries";
import {
  ECOSYSTEM_RESOURCES,
  type EcosystemCategory,
  type EcosystemResource,
} from "@/lib/data/ecosystem";
import {
  getLocalizedCountryName,
  getLocalizedDescription,
} from "@/lib/data/ecosystem-i18n";
import { CosmicTooltip } from "@/components/CosmicTooltip";

const ITEMS_PER_PAGE = 50;

type ActiveDropdown = "category" | "country" | "tags" | null;

export function EcosystemDirectoryClient() {
  const t = useTranslations("Ecosystem");
  const locale = useLocale();
  const deckRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | EcosystemCategory>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Unified Mutually Exclusive Dropdowns State
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  const filterDeckContainerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterDeckContainerRef.current &&
        !filterDeckContainerRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeDropdown]);

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeDropdown !== null) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDropdown]);

  // Category counts and options
  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {
      all: ECOSYSTEM_RESOURCES.length,
      official: 0,
      ngo: 0,
      whatsapp: 0,
      telegram: 0,
    };
    ECOSYSTEM_RESOURCES.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });

    return [
      { key: "all" as const, label: t("categoryAll"), icon: Sparkles, count: counts.all },
      { key: "official" as const, label: t("categoryOfficial"), icon: Globe, count: counts.official },
      { key: "ngo" as const, label: t("categoryNgo"), icon: Building2, count: counts.ngo },
      { key: "whatsapp" as const, label: t("categoryWhatsapp"), icon: MessageCircle, count: counts.whatsapp },
      { key: "telegram" as const, label: t("categoryTelegram"), icon: Send, count: counts.telegram },
    ];
  }, [t]);

  const currentCategoryOption = useMemo(() => {
    return categoryOptions.find((c) => c.key === selectedCategory) || categoryOptions[0];
  }, [categoryOptions, selectedCategory]);

  // Country counts & options with FlagCDN flags
  const countryOptions = useMemo(() => {
    const countsByCode: Record<string, number> = {};
    ECOSYSTEM_RESOURCES.forEach((r) => {
      countsByCode[r.countryCode] = (countsByCode[r.countryCode] || 0) + 1;
    });

    const presentCodes = new Set(Object.keys(countsByCode));
    const list = COUNTRIES.filter((c) => presentCodes.has(c.code)).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return [
      { code: "all", label: t("countryAll"), flagUrl: "", count: ECOSYSTEM_RESOURCES.length },
      { code: "EU", label: getLocalizedCountryName("EU", locale), flagUrl: "https://flagcdn.com/w20/eu.png", count: countsByCode["EU"] || 0 },
      ...list.map((c) => ({
        code: c.code,
        label: getLocalizedCountryName(c.code, locale, c.name),
        flagUrl: c.flagUrl || getFlagUrl(c.code),
        count: countsByCode[c.code] || 0,
      })),
    ];
  }, [t, locale]);

  const currentCountryOption = useMemo(() => {
    return countryOptions.find((c) => c.code === selectedCountry) || countryOptions[0];
  }, [countryOptions, selectedCountry]);

  const filteredCountryOptions = useMemo(() => {
    if (!countrySearchQuery.trim()) return countryOptions;
    const q = countrySearchQuery.toLowerCase().trim();
    return countryOptions.filter(
      (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countryOptions, countrySearchQuery]);

  // Unique normalized tags with frequency count
  const allAvailableTags = useMemo(() => {
    const counts: Record<string, number> = {};
    ECOSYSTEM_RESOURCES.forEach((r) => {
      r.tags.forEach((tag) => {
        const normalized = tag.toLowerCase().trim();
        if (normalized) {
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, []);

  const filteredTagOptions = useMemo(() => {
    if (!tagSearchQuery.trim()) return allAvailableTags;
    const q = tagSearchQuery.toLowerCase().trim();
    return allAvailableTags.filter((item) => item.tag.includes(q));
  }, [allAvailableTags, tagSearchQuery]);

  // Toggle tag in multi-select (resets page to 1)
  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  // Main resource list filtering with multi-tag matching
  const filteredResources = useMemo(() => {
    return ECOSYSTEM_RESOURCES.filter((res) => {
      // Category filter
      if (selectedCategory !== "all" && res.category !== selectedCategory) {
        return false;
      }
      // Country filter
      if (selectedCountry !== "all" && res.countryCode !== selectedCountry) {
        return false;
      }
      // Selected Tags filter (Resource must contain ALL selected tags)
      if (selectedTags.length > 0) {
        const resNormalizedTags = res.tags.map((x) => x.toLowerCase().trim());
        const hasAllTags = selectedTags.every((t) => resNormalizedTags.includes(t));
        if (!hasAllTags) {
          return false;
        }
      }
      // Search query filter (checks title, description, localized description, country name, and normalized tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesDesc = res.description.toLowerCase().includes(q);
        const matchesLocDesc = getLocalizedDescription(res, locale).toLowerCase().includes(q);
        const matchesCountry =
          res.countryName.toLowerCase().includes(q) ||
          getLocalizedCountryName(res.countryCode, locale, res.countryName).toLowerCase().includes(q);
        const matchesTags = res.tags.some((tag) => tag.toLowerCase().trim().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesLocDesc && !matchesCountry && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedCountry, selectedTags, locale]);

  // Numeric pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredResources.length / ITEMS_PER_PAGE));
  const paginatedResources = filteredResources.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    deckRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCountry("all");
    setSelectedTags([]);
    setActiveDropdown(null);
    setCountrySearchQuery("");
    setTagSearchQuery("");
    setPage(1);
  };

  const getCategoryTheme = (category: EcosystemCategory) => {
    switch (category) {
      case "official":
        return {
          badge: "bg-plasma-cyan/15 text-plasma-cyan border-plasma-cyan/30",
          icon: Globe,
          label: t("categoryOfficial"),
        };
      case "ngo":
        return {
          badge: "bg-hyper-violet/15 text-hyper-violet border-hyper-violet/30",
          icon: Building2,
          label: t("categoryNgo"),
        };
      case "whatsapp":
        return {
          badge: "bg-rup-emerald/15 text-rup-emerald border-rup-emerald/30",
          icon: MessageCircle,
          label: t("categoryWhatsapp"),
        };
      case "telegram":
        return {
          badge: "bg-sky-400/15 text-sky-400 border-sky-400/30",
          icon: Send,
          label: t("categoryTelegram"),
        };
    }
  };

  const CurrentCategoryIcon = currentCategoryOption.icon;

  return (
    <div ref={deckRef} className="space-y-8">
      {/* Search & Unified 3-Dropdown Filter Deck */}
      <div
        ref={filterDeckContainerRef}
        className="relative z-30 bg-void-surface/90 border border-void-border rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6"
      >
        {/* Top: Live Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-12 pr-16 py-3.5 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm sm:text-base text-white placeholder-gray-500 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <CosmicTooltip content={t("clearSearch")} side="left">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="text-xs font-bold px-2 py-1 rounded bg-void-surface text-gray-400 hover:text-white border border-void-border cursor-pointer transition-colors"
                >
                  {t("clearSearch")}
                </button>
              </CosmicTooltip>
            </div>
          )}
        </div>

        {/* 3-Column Dropdown Filter Deck */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-void-border/60">
          
          {/* ========================================================== */}
          {/* DROPDOWN 1: Category (Single-Select)                       */}
          {/* ========================================================== */}
          <div ref={categoryDropdownRef} className="relative">
            <CosmicTooltip content={t("filterByCategoryTooltip")} side="top">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "category"}
                onClick={() =>
                  setActiveDropdown((prev) => (prev === "category" ? null : "category"))
                }
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-void-deep border border-void-border hover:border-plasma-cyan/60 focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-inner"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <CurrentCategoryIcon className="w-4 h-4 text-plasma-cyan shrink-0" />
                  <span className="truncate">{currentCategoryOption.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-void-surface border border-void-border">
                    {currentCategoryOption.count}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                      activeDropdown === "category" ? "rotate-180 text-plasma-cyan" : ""
                    }`}
                  />
                </div>
              </button>
            </CosmicTooltip>

            {activeDropdown === "category" && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-void-deep border border-void-border shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(0,229,255,0.1)] z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
              >
                {categoryOptions.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedCategory(cat.key);
                        setPage(1);
                        setActiveDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-plasma-cyan/15 text-plasma-cyan font-bold border border-plasma-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                          : "text-gray-300 hover:bg-void-surface hover:text-white border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 text-plasma-cyan shrink-0" />
                        <span className="truncate font-medium">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-void-surface border border-void-border">
                          {cat.count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* DROPDOWN 2: Location (Country Single-Select with FlagCDN)   */}
          {/* ========================================================== */}
          <div ref={countryDropdownRef} className="relative">
            <CosmicTooltip content={t("filterByCountryTooltip")} side="top">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "country"}
                onClick={() =>
                  setActiveDropdown((prev) => (prev === "country" ? null : "country"))
                }
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-void-deep border border-void-border hover:border-plasma-cyan/60 focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-inner"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {currentCountryOption.code === "all" ? (
                    <Globe className="w-4 h-4 text-plasma-cyan shrink-0" />
                  ) : (
                    <Image
                      src={currentCountryOption.flagUrl || getFlagUrl(currentCountryOption.code)}
                      alt={currentCountryOption.label}
                      width={20}
                      height={15}
                      unoptimized
                      className="rounded-sm object-cover shrink-0"
                    />
                  )}
                  <span className="truncate">{currentCountryOption.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-void-surface border border-void-border">
                    {currentCountryOption.count}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                      activeDropdown === "country" ? "rotate-180 text-plasma-cyan" : ""
                    }`}
                  />
                </div>
              </button>
            </CosmicTooltip>

            {activeDropdown === "country" && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-void-deep border border-void-border shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(0,229,255,0.1)] z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Pinned Search Input at the top */}
                <div className="relative pb-1 border-b border-void-border/60">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                    placeholder={t("searchCountryPlaceholder")}
                    className="w-full pl-8 pr-3 py-2 bg-void-surface rounded-xl border border-void-border text-xs text-white placeholder-gray-500 outline-none focus:border-plasma-cyan transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Constrained Height with Smooth Scrolling: max-h-64 overflow-y-auto */}
                <div className="max-h-64 overflow-y-auto overscroll-contain space-y-1 pr-1">
                  {filteredCountryOptions.map((c) => {
                    const isSelected = selectedCountry === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedCountry(c.code);
                          setPage(1);
                          setActiveDropdown(null);
                          setCountrySearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-plasma-cyan/15 text-plasma-cyan font-bold border border-plasma-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                            : "text-gray-300 hover:bg-void-surface hover:text-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {c.code === "all" ? (
                            <Globe className="w-4 h-4 text-plasma-cyan shrink-0" />
                          ) : (
                            <Image
                              src={c.flagUrl || getFlagUrl(c.code)}
                              alt={c.label}
                              width={20}
                              height={15}
                              unoptimized
                              className="rounded-sm object-cover shrink-0"
                            />
                          )}
                          <span className="truncate font-medium">{c.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-void-surface border border-void-border">
                            {c.count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                  {filteredCountryOptions.length === 0 && (
                    <div className="text-center py-6 text-xs text-gray-500 font-mono">
                      {t("noCountryFound")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* DROPDOWN 3: Tags (Multi-Select with Search)                */}
          {/* ========================================================== */}
          <div ref={tagsDropdownRef} className="relative">
            <CosmicTooltip content={t("filterByTagsTooltip")} side="top">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "tags"}
                onClick={() =>
                  setActiveDropdown((prev) => (prev === "tags" ? null : "tags"))
                }
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-void-deep border border-void-border hover:border-plasma-cyan/60 focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-inner"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Tag className="w-4 h-4 text-plasma-cyan shrink-0" />
                  <span className="truncate">
                    {selectedTags.length === 0
                      ? t("allTags")
                      : `${selectedTags.length} ${t("tagsLabel")}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-void-surface border border-void-border">
                    {selectedTags.length > 0 ? selectedTags.length : allAvailableTags.length}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                      activeDropdown === "tags" ? "rotate-180 text-plasma-cyan" : ""
                    }`}
                  />
                </div>
              </button>
            </CosmicTooltip>

            {activeDropdown === "tags" && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-void-deep border border-void-border shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(0,229,255,0.1)] z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Pinned Search Input at the top */}
                <div className="relative pb-1 border-b border-void-border/60">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder={t("searchTagsPlaceholder")}
                    className="w-full pl-8 pr-3 py-2 bg-void-surface rounded-xl border border-void-border text-xs text-white placeholder-gray-500 outline-none focus:border-plasma-cyan transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Tags List */}
                <div className="max-h-64 overflow-y-auto overscroll-contain space-y-1 pr-1">
                  {filteredTagOptions.map((item) => {
                    const isSelected = selectedTags.includes(item.tag);
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleToggleTag(item.tag)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-plasma-cyan/15 text-plasma-cyan font-bold border border-plasma-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                            : "text-gray-300 hover:bg-void-surface hover:text-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-xs">#{item.tag}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-void-surface border border-void-border">
                            {item.count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                  {filteredTagOptions.length === 0 && (
                    <div className="text-center py-6 text-xs text-gray-500 font-mono">
                      {t("noTagsFound")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Selected Tag Pills Row (Dedicated row below the 3 dropdowns) */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-void-border/40 animate-in fade-in duration-200">
            <span className="text-xs font-semibold text-gray-400 mr-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-plasma-cyan" />
              <span>{t("tagsLabel")}:</span>
            </span>
            {selectedTags.map((tag) => (
              <span
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/40 hover:bg-plasma-cyan/25 cursor-pointer transition-colors"
              >
                <span>#{tag}</span>
                <X className="w-3 h-3 hover:text-white" />
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedTags([]);
                setPage(1);
              }}
              className="text-xs text-gray-400 hover:text-nova-flare underline cursor-pointer ml-2"
            >
              {t("clearTags")}
            </button>
          </div>
        )}

        {/* Status Bar: Results Counter & Reset Action */}
        <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse" />
            <span>{t("resultsCount", { count: filteredResources.length })}</span>
          </div>
          {(selectedCategory !== "all" ||
            selectedCountry !== "all" ||
            selectedTags.length > 0 ||
            searchQuery) && (
            <CosmicTooltip content={t("resetFilters")} side="top">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-plasma-cyan hover:underline cursor-pointer font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t("resetFilters")}</span>
              </button>
            </CosmicTooltip>
          )}
        </div>
      </div>

      {/* Grid of External Resource Cards */}
      {filteredResources.length > 0 ? (
        <div className="space-y-8">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedResources.map((res: EcosystemResource) => {
              const theme = getCategoryTheme(res.category);
              const CategoryIcon = theme.icon;

              return (
                <div
                  key={res.id}
                  className="bg-void-surface/90 border border-void-border rounded-2xl p-6 flex flex-col h-full hover:border-plasma-cyan/60 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.85),0_0_25px_rgba(0,229,255,0.22),inset_0_1px_1px_rgba(255,255,255,0.12)] group relative overflow-hidden"
                >
                  {/* Shimmer Sheen on Hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-plasma-cyan/5 to-transparent pointer-events-none rounded-2xl" />

                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Category Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${theme.badge}`}
                      >
                        <CategoryIcon className="w-3 h-3 shrink-0" />
                        <span>{theme.label}</span>
                      </span>

                      {/* Country Badge with Flag Image */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-void-deep border border-void-border text-gray-300">
                        <Image
                          src={getFlagUrl(res.countryCode)}
                          alt={res.countryName}
                          width={20}
                          height={15}
                          unoptimized
                          className="rounded-sm object-cover shrink-0"
                        />
                        <span>{getLocalizedCountryName(res.countryCode, locale, res.countryName)}</span>
                      </span>
                    </div>

                    {/* High-Visibility Top-Right Card Badge */}
                    {(res.badgeKey || res.badge) && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-plasma-cyan/10 text-gray-100 border border-white/20 shadow-sm shrink-0">
                        {res.badgeKey ? t(res.badgeKey) : res.badge}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-plasma-cyan transition-colors line-clamp-2">
                    {res.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-300 font-light leading-relaxed mb-4 flex-1">
                    {getLocalizedDescription(res, locale)}
                  </p>

                  {/* Normalized Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {res.tags.map((tag, idx) => {
                      const normalizedTag = tag.toLowerCase().trim();
                      const isTagActive = selectedTags.includes(normalizedTag);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleTag(normalizedTag)}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer hover:scale-105 active:scale-95 ${
                            isTagActive
                              ? "bg-plasma-cyan/20 text-plasma-cyan border-plasma-cyan/50 font-bold shadow-[0_0_10px_rgba(0,229,255,0.25)]"
                              : "bg-void-deep/80 hover:bg-void-surface border-void-border hover:border-plasma-cyan/40 text-gray-400 hover:text-plasma-cyan"
                          }`}
                        >
                          #{normalizedTag}
                        </button>
                      );
                    })}
                  </div>

                  {/* Card Action */}
                  <div className="mt-auto pt-4 border-t border-void-border/60">
                    {res.url === "#" ? (
                      <CosmicTooltip
                        content={t("expiredLinkTooltip")}
                        side="top"
                      >
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(res.title + " " + t("searchGoogleSuffix"))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs sm:text-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group/btn shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Search className="w-4 h-4 transition-transform group-hover/btn:scale-110 shrink-0 text-amber-400" />
                          <span>{t("searchGoogle")}</span>
                        </a>
                      </CosmicTooltip>
                    ) : (
                      <CosmicTooltip
                        content={`${t("openResource")}: ${res.title}`}
                        side="top"
                      >
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-plasma-cyan/10 hover:bg-plasma-cyan/20 border border-plasma-cyan/30 hover:border-plasma-cyan text-plasma-cyan font-bold text-xs sm:text-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group/btn shadow-[0_0_15px_rgba(0,229,255,0.15)] hover:shadow-[0_0_25px_rgba(0,229,255,0.35)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <span>{t("openResource")}</span>
                          <ExternalLink className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 shrink-0" />
                        </a>
                      </CosmicTooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sleek Numeric Pagination Bar */}
          {totalPages > 1 && (
            <div className="mt-10 pt-6 border-t border-void-border flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Left: Showing items status */}
              <div className="text-xs sm:text-sm text-gray-400 font-medium">
                {t("showingItems", {
                  from: (page - 1) * ITEMS_PER_PAGE + 1,
                  to: Math.min(page * ITEMS_PER_PAGE, filteredResources.length),
                  total: filteredResources.length,
                })}
              </div>

              {/* Center / Right: Numbered Buttons with Previous & Next */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {/* Previous Button */}
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                    page <= 1
                      ? "border-void-border bg-void-surface/40 text-gray-600 cursor-not-allowed"
                      : "border-void-border bg-void-surface text-gray-300 hover:border-plasma-cyan hover:text-white hover:shadow-[0_0_12px_rgba(0,229,255,0.2)] cursor-pointer"
                  }`}
                  aria-label={t("previousPage")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Buttons (1, 2, 3, 4...) */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isActive = p === page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center cursor-pointer ${
                        isActive
                          ? "bg-plasma-cyan text-void-deep font-black shadow-[0_0_20px_rgba(0,229,255,0.45)] scale-105"
                          : "bg-void-surface border border-void-border text-gray-300 hover:border-plasma-cyan/50 hover:text-white hover:scale-105 active:scale-95"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
                    page >= totalPages
                      ? "border-void-border bg-void-surface/40 text-gray-600 cursor-not-allowed"
                      : "border-void-border bg-void-surface text-gray-300 hover:border-plasma-cyan hover:text-white hover:shadow-[0_0_12px_rgba(0,229,255,0.2)] cursor-pointer"
                  }`}
                  aria-label={t("nextPage")}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center border border-dashed border-void-border rounded-3xl bg-void-surface/50 p-8 max-w-xl mx-auto space-y-4">
          <Globe className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">{t("noResultsTitle")}</h3>
          <p className="text-sm text-gray-400 leading-relaxed font-light">
            {t("noResultsDesc")}
          </p>
          <CosmicTooltip content={t("resetFilters")} side="top">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t("resetFilters")}</span>
            </button>
          </CosmicTooltip>
        </div>
      )}
    </div>
  );
}
