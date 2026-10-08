"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Filter, DollarSign, Tag, Calendar, User } from "lucide-react";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { useTranslations } from "next-intl";

import { ERASMUS_THEMES } from "@/lib/constants/themes";

export function DashboardSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Sidebar");

  // Estados locales para los filtros
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

  const toggleTheme = (theme: string) => setThemes(prev => prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]);
  const toggleType = (missionType: string) => setTypes(prev => prev.includes(missionType) ? prev.filter(t => t !== missionType) : [...prev, missionType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
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

      router.push(`/dashboard/projects?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, types, minAge, maxAge, countries, targetProfile, themes, eligible, startDate, endDate, funding, minBudget, maxBudget, accommodation, rup, lastMinute, router]);

  return (
    <div className="bg-void-deep border border-void-border rounded-xl flex flex-col h-[calc(100vh-8rem)] sticky top-24">
      <div className="p-4 border-b border-void-border">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Filter className="w-5 h-5 text-plasma-cyan" /> {t('filters')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
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

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {t('destination')}
          </h3>
          <MultiSelectCountry selected={countries} onChange={setCountries} placeholder={t('anyCountry')} />
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {t('eligibleCountries')}
          </h3>
          <MultiSelectCountry selected={eligible} onChange={setEligible} placeholder={t('anyCountry')} />
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-3 h-3" /> {t('dates')}
          </h3>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-void-surface border border-void-border rounded-lg px-2 py-2 text-xs focus:border-plasma-cyan" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-void-surface border border-void-border rounded-lg px-2 py-2 text-xs focus:border-plasma-cyan" />
          </div>
        </div>

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

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-3 h-3" /> {t('missionType')}
          </h3>
          <div className="flex flex-col gap-2">
            {["ESC", "Youth Exchange", "Training"].map((mType) => (
              <label key={mType} onClick={(e) => { e.preventDefault(); toggleType(mType); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer group hover:bg-void-surface ${types.includes(mType) ? 'border-plasma-cyan bg-plasma-cyan/10' : 'border-void-border'}`}>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${types.includes(mType) ? 'border-plasma-cyan bg-plasma-cyan' : 'border-gray-500'}`}>
                  {types.includes(mType) && <div className="w-2 h-2 rounded-full bg-void-deep" />}
                </div>
                <span className={`text-sm ${types.includes(mType) ? 'text-white' : 'text-gray-400'}`}>{mType}</span>
              </label>
            ))}
          </div>
        </div>

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
            <option value="">{t('addCustomTheme', { defaultValue: 'Add theme...' })}</option>
            {ERASMUS_THEMES.map(th => (
              <option key={th} value={th} disabled={themes.includes(th)}>{th}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4 pt-2 border-t border-void-border">
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
