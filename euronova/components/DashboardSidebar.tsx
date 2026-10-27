"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { 
  Search, MapPin, Filter, Tag, Calendar, User, ArrowUpDown, 
  ChevronDown, History, X, Sparkles, Loader2, Leaf, Laptop, 
  Users, HeartPulse, Palette, Trophy, Shield, Briefcase, 
  Vote, Newspaper, Wheat, Landmark, Check
} from "lucide-react";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { CustomSelect } from "@/components/CustomSelect";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";

import { PROJECT_THEMES, ERASMUS_THEMES, type ProjectThemeId } from "@/lib/constants/themes";
import { PROJECT_TYPES } from "@/lib/constants/projectTypes";
import { parseAiSearchAction } from "@/actions/aiSearch";

// Map of canonical theme IDs to their Lucide icons
const THEME_ICON_MAP: Record<ProjectThemeId, React.ComponentType<{ className?: string }>> = {
  environment: Leaf,
  digital: Laptop,
  inclusion: Users,
  mental_health: HeartPulse,
  arts_culture: Palette,
  sports: Trophy,
  human_rights: Shield,
  entrepreneurship: Briefcase,
  civic_participation: Vote,
  media_literacy: Newspaper,
  rural_development: Wheat,
  heritage: Landmark,
};

export function DashboardSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Sidebar");
  const tTypes = useTranslations("ProjectTypes");
  const tAi = useTranslations("SemanticSearch");
  const tThemes = useTranslations("ProjectThemes");

  // Non-blocking navigation transition
  const [isNavigating, startTransition] = useTransition();

  // Mobile drawer collapse/expand state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // AI Semantic Search Mode & status
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAppliedFeedback, setAiAppliedFeedback] = useState<string | null>(null);

  // Filter local states
  const [sort, setSort] = useState(searchParams.get("sort") || "");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [types, setTypes] = useState<string[]>(
    searchParams.get("types") ? searchParams.get("types")!.split(",") : []
  );
  const [minAge, setMinAge] = useState(searchParams.get("min_age") || "");
  const [maxAge, setMaxAge] = useState(searchParams.get("max_age") || "");
  const [countries, setCountries] = useState<string[]>(
    searchParams.get("dest") ? searchParams.get("dest")!.split(",") : []
  );
  const [targetProfile] = useState(searchParams.get("target_profile") || "");
  const [themes, setThemes] = useState<string[]>(
    searchParams.get("themes") ? searchParams.get("themes")!.split(",") : []
  );
  const [eligible, setEligible] = useState<string[]>(
    searchParams.get("eligible") ? searchParams.get("eligible")!.split(",") : []
  );

  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");

  const [minBudget] = useState(searchParams.get("min_budget") || "");
  const [maxBudget] = useState(searchParams.get("max_budget") || "");

  const [accommodation, setAccommodation] = useState(searchParams.get("accommodation") === "true");
  const [rup, setRup] = useState(searchParams.get("rup") === "true");
  const [lastMinute, setLastMinute] = useState(searchParams.get("last_minute") === "true");

  // Authenticated user ID for recent searches isolation
  const [userId, setUserId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const searchesStorageKey = userId ? `euronova_recent_searches_${userId}` : `euronova_recent_searches_guest`;

  const toggleTheme = (theme: string) => {
    setThemes((prev) => (prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]));
  };

  const toggleType = (missionType: string) => {
    setTypes((prev) => (prev.includes(missionType) ? prev.filter((t) => t !== missionType) : [...prev, missionType]));
  };

  // Load recent searches from localStorage
  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      try {
        const raw = localStorage.getItem(searchesStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
            setRecentSearches(parsed);
          } else {
            setRecentSearches([]);
            localStorage.setItem(searchesStorageKey, JSON.stringify([]));
          }
        } else {
          setRecentSearches([]);
        }
      } catch {
        setRecentSearches([]);
        try {
          localStorage.setItem(searchesStorageKey, JSON.stringify([]));
        } catch {
          // LocalStorage restricted
        }
      }
    });
    return () => {
      ignore = true;
    };
  }, [searchesStorageKey]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const existing = recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...existing].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(searchesStorageKey, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const clearRecentSearches = () => {
    try {
      localStorage.removeItem(searchesStorageKey);
      setRecentSearches([]);
    } catch {
      // Ignore
    }
  };

  // Sync state from external URL changes (e.g. browser back/forward)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSort(searchParams.get("sort") || "");
    setSearch(searchParams.get("q") || "");
    setTypes(searchParams.get("types") ? searchParams.get("types")!.split(",") : []);
    setMinAge(searchParams.get("min_age") || "");
    setMaxAge(searchParams.get("max_age") || "");
    setCountries(searchParams.get("dest") ? searchParams.get("dest")!.split(",") : []);
    setThemes(searchParams.get("themes") ? searchParams.get("themes")!.split(",") : []);
    setEligible(searchParams.get("eligible") ? searchParams.get("eligible")!.split(",") : []);
    setStartDate(searchParams.get("start_date") || "");
    setEndDate(searchParams.get("end_date") || "");
    setAccommodation(searchParams.get("accommodation") === "true");
    setRup(searchParams.get("rup") === "true");
    setLastMinute(searchParams.get("last_minute") === "true");
  }, [searchParams]);

  // Execute AI Natural Language Extraction
  const handleRunAiSearch = async (queryOverride?: string) => {
    const targetQuery = queryOverride ?? search;
    const cleanQuery = targetQuery.trim();
    if (!cleanQuery) return;

    setIsAiLoading(true);
    setAiAppliedFeedback(null);

    try {
      const result = await parseAiSearchAction(cleanQuery);
      if (result.success && result.filters) {
        const f = result.filters;

        // Apply structured filters to local state
        if (f.dest) setCountries(f.dest);
        if (f.types) setTypes(f.types);
        if (f.themes) setThemes(f.themes);
        if (f.rup !== undefined) setRup(f.rup);
        if (f.lastMinute !== undefined) setLastMinute(f.lastMinute);
        if (f.q !== undefined) setSearch(f.q);

        // Build human-readable visual summary for feedback badge
        const summaryChips: string[] = [];
        if (f.dest?.length) summaryChips.push(f.dest.join(", "));
        if (f.types?.length) summaryChips.push(f.types.join(", "));
        if (f.themes?.length) {
          summaryChips.push(
            f.themes.map((th) => (tThemes.has(th) ? tThemes(th) : th)).join(", ")
          );
        }
        if (f.rup) summaryChips.push("RUP Flights");
        if (f.lastMinute) summaryChips.push("Last Minute");
        if (f.q) summaryChips.push(`"${f.q}"`);

        setAiAppliedFeedback(summaryChips.join(" • ") || "AI filters applied");
      }
    } catch {
      // Fallback already handled inside parseAiSearchAction
    } finally {
      setIsAiLoading(false);
    }
  };

  // Clear specific date filters immediately with non-blocking transition
  const handleClearDates = () => {
    setStartDate("");
    setEndDate("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("start_date");
    params.delete("end_date");
    params.delete("page");
    startTransition(() => {
      router.replace(`/dashboard/projects?${params.toString()}`, { scroll: false });
    });
  };

  // Clear all filters completely with non-blocking transition
  const handleClearAllFilters = () => {
    setSort("");
    setSearch("");
    setTypes([]);
    setMinAge("");
    setMaxAge("");
    setCountries([]);
    setThemes([]);
    setEligible([]);
    setStartDate("");
    setEndDate("");
    setAccommodation(false);
    setRup(false);
    setLastMinute(false);
    setAiAppliedFeedback(null);
    startTransition(() => {
      router.replace("/dashboard/projects", { scroll: false });
    });
  };

  // Debounced URL state synchronization with non-blocking transition (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      if (search) params.set("q", search);
      if (types.length > 0) params.set("types", types.join(","));
      if (minAge) params.set("min_age", minAge);
      if (maxAge) params.set("max_age", maxAge);
      if (countries.length > 0) params.set("dest", countries.join(","));
      if (targetProfile) params.set("target_profile", targetProfile);
      if (themes.length > 0) params.set("themes", themes.join(","));
      if (eligible.length > 0) params.set("eligible", eligible.join(","));
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (minBudget) params.set("min_budget", minBudget);
      if (maxBudget) params.set("max_budget", maxBudget);
      if (accommodation) params.set("accommodation", "true");
      if (rup) params.set("rup", "true");
      if (lastMinute) params.set("last_minute", "true");

      // Extract current query parameters EXCLUDING pagination
      const currentParamsWithoutPage = new URLSearchParams(searchParams.toString());
      currentParamsWithoutPage.delete("page");

      // Sort both param sets to prevent false mismatches due to key ordering
      const sortedNew = new URLSearchParams(params.toString());
      sortedNew.sort();
      currentParamsWithoutPage.sort();

      // Only transition if the filter parameters actually changed by user interaction.
      if (sortedNew.toString() !== currentParamsWithoutPage.toString()) {
        const newQuery = params.toString();
        startTransition(() => {
          router.replace(`/dashboard/projects${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    sort, search, types, minAge, maxAge, countries, targetProfile, 
    themes, eligible, startDate, endDate, minBudget, maxBudget, 
    accommodation, rup, lastMinute, router, searchParams
  ]);

  const hasActiveFilters = Boolean(
    search || types.length > 0 || minAge || maxAge || countries.length > 0 ||
    themes.length > 0 || eligible.length > 0 || startDate || endDate ||
    accommodation || rup || lastMinute || aiAppliedFeedback
  );

  return (
    <div className="bg-void-deep border border-void-border rounded-xl flex flex-col lg:h-[calc(100vh-8rem)] lg:sticky lg:top-24">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-void-border flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Filter className={`w-5 h-5 ${isNavigating ? "text-plasma-cyan animate-spin" : "text-plasma-cyan"}`} />
          <span>{t("filters")}</span>
          {isNavigating && (
            <span className="w-2 h-2 rounded-full bg-plasma-cyan animate-ping" />
          )}
        </h2>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs text-plasma-cyan hover:underline font-semibold cursor-pointer"
            >
              {t("clearAll")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-void-border bg-void-surface text-xs font-semibold text-plasma-cyan hover:border-plasma-cyan transition-colors"
            aria-label={t("toggleFilters")}
          >
            <span>{isMobileOpen ? "Hide" : "Show"}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Body with responsive visibility */}
      <div className={`${isMobileOpen ? "block" : "hidden lg:block"} flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar`}>
        {/* Sort By Dropdown */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowUpDown className="w-3 h-3 text-plasma-cyan" /> {t("sortBy")}
          </h3>
          <CustomSelect
            value={sort || "newest"}
            onChange={(val) => setSort(val)}
            options={[
              { value: "newest", label: t("sortNewest") },
              { value: "oldest", label: t("sortOldest") },
              { value: "urgent", label: t("sortUrgent") },
              { value: "rup_first", label: t("sortRup") },
              { value: "longest", label: t("sortLongest") },
              { value: "shortest", label: t("sortShortest") },
              { value: "a_z", label: t("sortAZ") },
            ]}
          />
        </div>

        {/* Search & AI Magic Search */}
        <div className="space-y-3 relative">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" /> {t("search")}
            </h3>

            {/* AI Magic Search Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsAiSearch((prev) => !prev);
                setAiAppliedFeedback(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                isAiSearch
                  ? "bg-gradient-to-r from-plasma-cyan/30 via-hyper-violet/30 to-nova-flare/30 border border-plasma-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.4)] ring-1 ring-plasma-cyan/50"
                  : "bg-void-surface/80 border border-plasma-cyan/40 hover:border-plasma-cyan text-plasma-cyan hover:bg-plasma-cyan/10"
              }`}
              title={t("toggleAiTitle")}
            >
              <Sparkles className={`w-3 h-3 ${isAiSearch ? "text-plasma-cyan animate-pulse" : "text-plasma-cyan"}`} />
              <span>{tAi("aiMagic") || "AI Magic Search"}</span>
            </button>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={
                    isAiSearch
                      ? tAi("aiPlaceholder") || "Describe your ideal mission naturally (e.g., 'intercambio en Italia en verano')..."
                      : t("searchPlaceholder")
                  }
                  value={search}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isAiSearch) {
                        handleRunAiSearch();
                      }
                      saveRecentSearch(search);
                      setIsSearchFocused(false);
                    }
                  }}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full bg-void-surface border rounded-xl px-4 text-sm focus:outline-none transition-all ${
                    isAiSearch
                      ? "py-3 border-plasma-cyan ring-2 ring-plasma-cyan/40 shadow-[0_0_20px_rgba(0,229,255,0.25)] text-white placeholder:text-gray-400 placeholder:text-xs"
                      : "py-2.5 border-void-border focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan text-white"
                  }`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setAiAppliedFeedback(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
                    title={t("clearInputTitle")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Explicit AI Search Action Button */}
              {isAiSearch && (
                <button
                  type="button"
                  onClick={() => handleRunAiSearch()}
                  disabled={isAiLoading || !search.trim()}
                  className="px-3.5 py-3 rounded-xl bg-gradient-to-r from-plasma-cyan to-hyper-violet text-void-deep font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-void-deep" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-void-deep" />
                  )}
                  <span className="hidden sm:inline">{tAi("aiApply") || "Search"}</span>
                </button>
              )}
            </div>

            {/* AI Feedback Banner showing extracted parameters */}
            {aiAppliedFeedback && (
              <div className="mt-2 p-2 rounded-lg bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-between text-xs text-plasma-cyan animate-in fade-in slide-in-from-top-1">
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{aiAppliedFeedback}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAiAppliedFeedback(null)}
                  className="text-plasma-cyan/70 hover:text-white ml-2 shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dropdown de búsquedas recientes */}
            {isSearchFocused && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-void-surface/95 border border-void-border rounded-xl shadow-2xl p-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-void-border/40 text-[10px] uppercase font-bold text-gray-400">
                  <span className="flex items-center gap-1 text-plasma-cyan">
                    <History className="w-3 h-3" />
                    <span>{t("recentSearches")}</span>
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearRecentSearches();
                    }}
                    className="text-gray-500 hover:text-nova-flare transition-colors cursor-pointer"
                  >
                    {t("clearRecentSearches")}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((term, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearch(term);
                        if (isAiSearch) {
                          handleRunAiSearch(term);
                        }
                        saveRecentSearch(term);
                        setIsSearchFocused(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-void-deep flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <span className="truncate">{term}</span>
                      <Search className="w-3 h-3 text-gray-600 group-hover:text-plasma-cyan transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Prompts Suggestions when AI Magic Search is Active */}
          {isAiSearch && (
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-void-surface to-plasma-cyan/5 border border-plasma-cyan/30 space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-[10px] font-bold text-plasma-cyan">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-plasma-cyan" />
                  {tAi("promptSuggestions") || "Try AI Prompts"}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30">
                  {isAiLoading ? tAi("aiAnalyzing") || "Analyzing..." : tAi("aiSemanticActive") || "Semantic AI Active"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  tAi("prompt1") || "🐾 Animal sanctuary in cold Nordic climate",
                  tAi("prompt2") || "🌊 Marine conservation in the Azores",
                  tAi("prompt3") || "🎨 Digital arts & media workshop in Berlin",
                  tAi("prompt4") || "🌱 Organic farming in rural Italy",
                ].map((promptText, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      setSearch(promptText);
                      saveRecentSearch(promptText);
                      handleRunAiSearch(promptText);
                    }}
                    className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-void-deep/80 hover:bg-plasma-cyan/15 border border-void-border hover:border-plasma-cyan/50 text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Destination */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {t("destination")}
          </h3>
          <MultiSelectCountry selected={countries} onChange={setCountries} placeholder={t("anyCountry")} />
        </div>

        {/* Eligible Countries */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {t("eligibleCountries")}
          </h3>
          <MultiSelectCountry selected={eligible} onChange={setEligible} placeholder={t("anyCountry")} />
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" /> {t("dates")}
            </h3>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDates}
                className="text-[11px] text-plasma-cyan hover:underline font-bold transition-colors cursor-pointer"
              >
                {t("clearDates")}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-2 py-2 text-xs focus:border-plasma-cyan text-white"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-2 py-2 text-xs focus:border-plasma-cyan text-white"
            />
          </div>
        </div>

        {/* Age Range */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <User className="w-3 h-3" /> {t("ageRange")}
          </h3>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder={t("min")}
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-2 text-sm focus:border-plasma-cyan text-white"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder={t("max")}
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-2 text-sm focus:border-plasma-cyan text-white"
            />
          </div>
        </div>

        {/* Mission Type */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-3 h-3" /> {t("missionType")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPES.map((pt) => {
              const isSelected = types.includes(pt.code);
              return (
                <button
                  key={pt.code}
                  type="button"
                  onClick={() => toggleType(pt.code)}
                  className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "border-plasma-cyan bg-plasma-cyan/15 text-white shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                      : "border-void-border bg-void-surface/50 text-gray-400 hover:text-white hover:border-gray-700"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-plasma-cyan bg-plasma-cyan" : "border-gray-500"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 bg-void-deep rounded-sm" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block">{pt.code}</span>
                    <span className="text-[10px] text-gray-400 block whitespace-normal leading-tight line-clamp-2" title={tTypes(pt.labelKey)}>
                      {tTypes(pt.labelKey)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics / Themes: 12 Canonical Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Tag className="w-3 h-3 text-plasma-cyan" /> {t("themes")}
            </h3>
            {themes.length > 0 && (
              <button
                type="button"
                onClick={() => setThemes([])}
                className="text-[11px] text-plasma-cyan hover:underline font-semibold cursor-pointer"
              >
                {t("clearAll")}
              </button>
            )}
          </div>

          {/* Canonical 12 Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {PROJECT_THEMES.map((theme) => {
              const isSelected = themes.includes(theme.id);
              const IconComp = THEME_ICON_MAP[theme.id] || Tag;
              const label = tThemes.has(theme.labelKey) ? tThemes(theme.labelKey) : theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => toggleTheme(theme.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "border-hyper-violet bg-hyper-violet/25 text-white shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                      : "border-void-border bg-void-surface/50 text-gray-400 hover:text-white hover:border-gray-700"
                  }`}
                  title={label}
                >
                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-hyper-violet" : "text-gray-500"}`} />
                  <span className="text-[11px] font-medium leading-tight truncate flex-1">
                    {label}
                  </span>
                  {isSelected && (
                    <Check className="w-3 h-3 text-hyper-violet shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Non-Canonical or Custom Themes Badges */}
          {themes.filter((th) => !PROJECT_THEMES.some((pt) => pt.id === th)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {themes
                .filter((th) => !PROJECT_THEMES.some((pt) => pt.id === th))
                .map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => toggleTheme(theme)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border bg-hyper-violet/20 border-hyper-violet text-hyper-violet flex items-center gap-1 hover:bg-hyper-violet/30 transition-colors cursor-pointer"
                  >
                    <span>{theme}</span>
                    <span className="text-[10px] opacity-70 hover:opacity-100">×</span>
                  </button>
                ))}
            </div>
          )}

          {/* Custom Legacy Topic Selector */}
          <CustomSelect
            value=""
            onChange={(val) => {
              if (val && !themes.includes(val)) toggleTheme(val);
            }}
            placeholder={t("addCustomTheme")}
            className="mt-2"
            options={[
              { value: "", label: t("addCustomTheme") },
              ...ERASMUS_THEMES.map((th) => ({
                value: th,
                label: tThemes.has(th) ? tThemes(th) : th,
                disabled: themes.includes(th),
              })),
            ]}
          />
        </div>

        {/* Toggle Switches */}
        <div className="space-y-4 pt-2 border-t border-void-border">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={accommodation}
              onChange={(e) => setAccommodation(e.target.checked)}
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                accommodation ? "bg-plasma-cyan" : "bg-void-surface border border-void-border"
              }`}
            >
              <div
                className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${
                  accommodation ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-gray-300">{t("accommodationIncluded")}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={rup}
              onChange={(e) => setRup(e.target.checked)}
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                rup ? "bg-rup-emerald" : "bg-void-surface border border-void-border"
              }`}
            >
              <div
                className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${
                  rup ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-gray-300">{t("rupFlights")}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={lastMinute}
              onChange={(e) => setLastMinute(e.target.checked)}
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                lastMinute ? "bg-nova-flare" : "bg-void-surface border border-void-border"
              }`}
            >
              <div
                className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${
                  lastMinute ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-gray-300">{t("lastMinute")}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
