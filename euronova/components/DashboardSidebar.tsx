"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Filter, DollarSign, Tag, Calendar, User, ArrowUpDown, ChevronDown } from "lucide-react";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { useTranslations } from "next-intl";

import { ERASMUS_THEMES } from "@/lib/constants/themes";
import { PROJECT_TYPES } from "@/lib/constants/projectTypes";

export function DashboardSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Sidebar");
  const tTypes = useTranslations("ProjectTypes");

  // Estado para colapsar/expandir en dispositivos móviles
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Estados locales para los filtros
  const [sort, setSort] = useState(searchParams.get("sort") || "");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [types, setTypes] = useState<string[]>(searchParams.get("types") ? searchParams.get("types")!.split(",") : []);
  const [minAge, setMinAge] = useState(searchParams.get("min_age") || "");
  const [maxAge, setMaxAge] = useState(searchParams.get("max_age") || "");
  const [countries, setCountries] = useState<string[]>(searchParams.get("dest") ? searchParams.get("dest")!.split(",") : []);
  const [targetProfile] = useState(searchParams.get("target_profile") || "");
  const [themes, setThemes] = useState<string[]>(searchParams.get("themes") ? searchParams.get("themes")!.split(",") : []);
  const [eligible, setEligible] = useState<string[]>(searchParams.get("eligible") ? searchParams.get("eligible")!.split(",") : []);

  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");

  const [funding, setFunding] = useState(searchParams.get("funding") || "");
  const [minBudget] = useState(searchParams.get("min_budget") || "");
  const [maxBudget] = useState(searchParams.get("max_budget") || "");

  const [accommodation, setAccommodation] = useState(searchParams.get("accommodation") === "true");
  const [rup, setRup] = useState(searchParams.get("rup") === "true");
  const [lastMinute, setLastMinute] = useState(searchParams.get("last_minute") === "true");
  const [favorites, setFavorites] = useState(searchParams.get("favorites") === "true");

  const toggleTheme = (theme: string) => setThemes(prev => prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]);
  const toggleType = (missionType: string) => setTypes(prev => prev.includes(missionType) ? prev.filter(t => t !== missionType) : [...prev, missionType]);

  useEffect(() => {
    const s = searchParams.get("sort") || "";
    setSort(s);
  }, [searchParams]);

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
      if (funding) params.set("funding", funding);
      if (minBudget) params.set("min_budget", minBudget);
      if (maxBudget) params.set("max_budget", maxBudget);
      if (accommodation) params.set("accommodation", "true");
      if (rup) params.set("rup", "true");
      if (lastMinute) params.set("last_minute", "true");
      if (favorites) params.set("favorites", "true");

      router.push(`/dashboard/projects?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [sort, search, types, minAge, maxAge, countries, targetProfile, themes, eligible, startDate, endDate, funding, minBudget, maxBudget, accommodation, rup, lastMinute, favorites, router]);

  return (
    <div className="bg-void-deep border border-void-border rounded-xl flex flex-col lg:h-[calc(100vh-8rem)] lg:sticky lg:top-24">
      {/* Encabezado con botón de despliegue móvil */}
      <div className="p-4 border-b border-void-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Filter className="w-5 h-5 text-plasma-cyan" /> {t('filters')}
        </h2>
        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-void-border bg-void-surface text-xs font-semibold text-plasma-cyan hover:border-plasma-cyan transition-colors"
          aria-label="Toggle Filters"
        >
          <span>{isMobileOpen ? "Hide" : "Show"}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Cuerpo de filtros con visibilidad responsiva */}
      <div className={`${isMobileOpen ? "block" : "hidden lg:block"} flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar`}>
        {/* Sort By Dropdown */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowUpDown className="w-3 h-3 text-plasma-cyan" /> {t('sortBy')}
          </h3>
          <select
            value={sort || "newest"}
            onChange={(e) => setSort(e.target.value)}
            className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all cursor-pointer appearance-none"
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="oldest">{t('sortOldest')}</option>
            <option value="urgent">{t('sortUrgent')}</option>
            <option value="rup_first">{t('sortRup')}</option>
            <option value="longest">{t('sortLongest')}</option>
            <option value="shortest">{t('sortShortest')}</option>
            <option value="a_z">{t('sortAZ')}</option>
          </select>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Search className="w-3 h-3" /> {t('search')}
          </h3>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
          />
        </div>

        {/* Destination */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {t('destination')}
          </h3>
          <MultiSelectCountry selected={countries} onChange={setCountries} placeholder={t('anyCountry')} />
        </div>

        {/* Eligible Countries */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {t('eligibleCountries')}
          </h3>
          <MultiSelectCountry selected={eligible} onChange={setEligible} placeholder={t('anyCountry')} />
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-3 h-3" /> {t('dates')}
          </h3>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-void-surface border border-void-border rounded-lg px-2 py-2 text-xs focus:border-plasma-cyan" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-void-surface border border-void-border rounded-lg px-2 py-2 text-xs focus:border-plasma-cyan" />
          </div>
        </div>

        {/* Age Range */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <User className="w-3 h-3" /> {t('ageRange')}
          </h3>
          <div className="flex gap-2 items-center">
            <input type="number" placeholder={t('min')} value={minAge} onChange={(e) => setMinAge(e.target.value)} className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-2 text-sm focus:border-plasma-cyan" />
            <span className="text-gray-500">-</span>
            <input type="number" placeholder={t('max')} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-2 text-sm focus:border-plasma-cyan" />
          </div>
        </div>

        {/* Mission Type */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-3 h-3" /> {t('missionType')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPES.map((pt) => {
              const isSelected = types.includes(pt.code);
              return (
                <button
                  key={pt.code}
                  type="button"
                  onClick={() => toggleType(pt.code)}
                  className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-all ${isSelected
                      ? 'border-plasma-cyan bg-plasma-cyan/15 text-white shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                      : 'border-void-border bg-void-surface/50 text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                >
                  <div className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'border-plasma-cyan bg-plasma-cyan' : 'border-gray-500'
                    }`}>
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

        {/* Financing */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <DollarSign className="w-3 h-3" /> {t('financing')}
          </h3>
          <select value={funding} onChange={(e) => setFunding(e.target.value)} className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm focus:border-plasma-cyan appearance-none">
            <option value="">{t('any')}</option>
            <option value="Total">{t('total')}</option>
            <option value="Partial">{t('partial')}</option>
            <option value="None">{t('none')}</option>
          </select>
        </div>

        {/* Themes */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Tag className="w-3 h-3" /> {t('themes')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {themes.map(theme => (
              <button key={theme} onClick={() => toggleTheme(theme)} className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-hyper-violet/20 border-hyper-violet text-hyper-violet flex items-center gap-1 hover:bg-hyper-violet/30 transition-colors">
                {theme} <span className="text-[10px] opacity-70 hover:opacity-100">×</span>
              </button>
            ))}
          </div>
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val && !themes.includes(val)) toggleTheme(val);
              e.target.value = "";
            }}
            className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-2 text-sm focus:border-plasma-cyan mt-2 focus:outline-none appearance-none"
          >
            <option value="">{t('addCustomTheme')}</option>
            {ERASMUS_THEMES.map(th => (
              <option key={th} value={th} disabled={themes.includes(th)}>{th}</option>
            ))}
          </select>
        </div>

        {/* Toggle Switches */}
        <div className="space-y-4 pt-2 border-t border-void-border">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="sr-only" checked={favorites} onChange={(e) => setFavorites(e.target.checked)} />
            <div className={`w-10 h-6 rounded-full transition-colors relative ${favorites ? 'bg-plasma-cyan' : 'bg-void-surface border border-void-border'}`}>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${favorites ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className="text-sm font-medium text-gray-300">{t('showFavorites')}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="sr-only" checked={accommodation} onChange={(e) => setAccommodation(e.target.checked)} />
            <div className={`w-10 h-6 rounded-full transition-colors relative ${accommodation ? 'bg-plasma-cyan' : 'bg-void-surface border border-void-border'}`}>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${accommodation ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className="text-sm font-medium text-gray-300">{t('accommodationIncluded')}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="sr-only" checked={rup} onChange={(e) => setRup(e.target.checked)} />
            <div className={`w-10 h-6 rounded-full transition-colors relative ${rup ? 'bg-rup-emerald' : 'bg-void-surface border border-void-border'}`}>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${rup ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className="text-sm font-medium text-gray-300">{t('rupFlights')}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="sr-only" checked={lastMinute} onChange={(e) => setLastMinute(e.target.checked)} />
            <div className={`w-10 h-6 rounded-full transition-colors relative ${lastMinute ? 'bg-nova-flare' : 'bg-void-surface border border-void-border'}`}>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${lastMinute ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className="text-sm font-medium text-gray-300">{t('lastMinute')}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
