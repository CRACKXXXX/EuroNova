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
  MapPin,
  ChevronDown,
  Check,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { COUNTRIES, getFlagUrl } from "@/lib/constants/countries";
import {
  ECOSYSTEM_RESOURCES,
  type EcosystemCategory,
  type EcosystemResource,
} from "@/lib/data/ecosystem";
import { CosmicTooltip } from "@/components/CosmicTooltip";

const CATEGORY_TABS: { key: "all" | EcosystemCategory; translationKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", translationKey: "categoryAll", icon: Sparkles },
  { key: "official", translationKey: "categoryOfficial", icon: Globe },
  { key: "ngo", translationKey: "categoryNgo", icon: Building2 },
  { key: "whatsapp", translationKey: "categoryWhatsapp", icon: MessageCircle },
  { key: "telegram", translationKey: "categoryTelegram", icon: Send },
];

export function EcosystemDirectoryClient() {
  const t = useTranslations("Ecosystem");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | EcosystemCategory>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Custom accessible dropdown state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedCountry]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    if (isCountryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCountryDropdownOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCountryDropdownOpen) {
        setIsCountryDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCountryDropdownOpen]);

  // Country counts & options with flags
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
      { code: "EU", label: t("countryEurope"), flagUrl: "https://flagcdn.com/w20/eu.png", count: countsByCode["EU"] || 0 },
      ...list.map((c) => ({
        code: c.code,
        label: c.name,
        flagUrl: c.flagUrl || getFlagUrl(c.code),
        count: countsByCode[c.code] || 0,
      })),
    ];
  }, [t]);

  // Selected country option object for trigger display
  const currentCountryOption = useMemo(() => {
    return countryOptions.find((c) => c.code === selectedCountry) || countryOptions[0];
  }, [countryOptions, selectedCountry]);

  // Filtered country options inside the custom dropdown search
  const filteredCountryOptions = useMemo(() => {
    if (!countrySearchQuery.trim()) return countryOptions;
    const q = countrySearchQuery.toLowerCase().trim();
    return countryOptions.filter(
      (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countryOptions, countrySearchQuery]);

  // Main resource list filtering with normalized tags
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
      // Search query filter (checks title, description, country name, and normalized tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesDesc = res.description.toLowerCase().includes(q);
        const matchesCountry = res.countryName.toLowerCase().includes(q);
        const matchesTags = res.tags.some((tag) => tag.toLowerCase().trim().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesCountry && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedCountry]);

  // Paginated slice (50 items per page)
  const paginatedResources = filteredResources.slice(0, page * 50);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCountry("all");
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery("");
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

  return (
    <div className="space-y-8">
      {/* Search & Filter Control Deck (relative z-30 solves stacking context over resource cards) */}
      <div className="relative z-30 bg-void-surface/90 border border-void-border rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Top: Live Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-12 pr-16 py-3.5 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm sm:text-base text-white placeholder-gray-500 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <CosmicTooltip content={t("clearSearch")} side="left">
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold px-2 py-1 rounded bg-void-surface text-gray-400 hover:text-white border border-void-border cursor-pointer transition-colors"
                >
                  {t("clearSearch")}
                </button>
              </CosmicTooltip>
            </div>
          )}
        </div>

        {/* Filter Row: Categories and Country Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-void-border/60">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedCategory === tab.key;
              return (
                <CosmicTooltip key={tab.key} content={t(tab.translationKey)} side="top">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-plasma-cyan text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                        : "bg-void-deep border border-void-border text-gray-300 hover:text-white hover:border-gray-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t(tab.translationKey)}</span>
                  </button>
                </CosmicTooltip>
              );
            })}
          </div>

          {/* Custom Accessible Country Dropdown with FlagCDN Image Support */}
          <div ref={countryDropdownRef} className="relative flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 shrink-0 hidden sm:inline-flex">
              <MapPin className="w-3.5 h-3.5 text-plasma-cyan" />
              <span>{t("locationLabel")}</span>
            </span>

            <div className="relative w-full sm:w-auto">
              <CosmicTooltip content={t("filterByCountryTooltip")} side="top">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isCountryDropdownOpen}
                  onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                  className="w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[42px] rounded-xl bg-void-deep border border-void-border hover:border-plasma-cyan/60 focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-inner min-w-[210px] sm:min-w-[250px]"
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
                        isCountryDropdownOpen ? "rotate-180 text-plasma-cyan" : ""
                      }`}
                    />
                  </div>
                </button>
              </CosmicTooltip>

              {/* Dropdown Menu Overhaul: Solid Background (bg-void-deep), z-50, max-h-64 overflow-y-auto */}
              {isCountryDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-full mt-2 w-full sm:w-80 rounded-2xl bg-void-deep border border-void-border shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(0,229,255,0.1)] z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150"
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
                            setIsCountryDropdownOpen(false);
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
          </div>
        </div>

        {/* Status Bar: Results Counter */}
        <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse" />
            <span>{t("resultsCount", { count: filteredResources.length })}</span>
          </div>
          {(selectedCategory !== "all" || selectedCountry !== "all" || searchQuery) && (
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

      {/* Grid of External Resource Cards (relative z-10 ensures dropdown z-30 is on top) */}
      {filteredResources.length > 0 ? (
        <div className="space-y-8">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedResources.map((res: EcosystemResource) => {
              const theme = getCategoryTheme(res.category);
              const CategoryIcon = theme.icon;

              return (
                <div
                  key={res.id}
                  className="bg-void-surface/90 border border-void-border rounded-2xl p-6 flex flex-col h-full hover:border-plasma-cyan/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,0,0,0.6)] group"
                >
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
                        <span>{res.countryName}</span>
                      </span>
                    </div>

                    {/* Badge mapped through i18n */}
                    {(res.badgeKey || res.badge) && (
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider hidden sm:inline-block">
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
                    {res.description}
                  </p>

                  {/* Normalized Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {res.tags.map((tag, idx) => {
                      const normalizedTag = tag.toLowerCase().trim();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSearchQuery(normalizedTag)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-void-deep/80 hover:bg-void-surface border border-void-border hover:border-plasma-cyan/40 text-gray-400 hover:text-plasma-cyan transition-colors cursor-pointer"
                        >
                          #{normalizedTag}
                        </button>
                      );
                    })}
                  </div>

                  {/* Card Action: Verified Direct Link or Google Search Fallback for Expired Community Links */}
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
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs sm:text-sm transition-all group/btn shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:scale-[1.01]"
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
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-plasma-cyan/10 hover:bg-plasma-cyan/20 border border-plasma-cyan/30 hover:border-plasma-cyan text-plasma-cyan font-bold text-xs sm:text-sm transition-all group/btn shadow-[0_0_15px_rgba(0,229,255,0.1)]"
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

          {/* Load More Pagination Button */}
          {filteredResources.length > page * 50 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 pb-2">
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-void-surface hover:bg-void-surface/80 border border-plasma-cyan/40 hover:border-plasma-cyan text-plasma-cyan font-bold text-sm transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,229,255,0.25)] hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-3 shadow-lg group"
              >
                <span>{t("loadMore")}</span>
                <span className="text-xs font-mono text-gray-400 bg-void-deep px-2.5 py-1 rounded-lg border border-void-border group-hover:border-plasma-cyan/30">
                  {paginatedResources.length} / {filteredResources.length}
                </span>
              </button>
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
