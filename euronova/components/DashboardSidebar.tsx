"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Filter, Menu, X, Rocket, User, Tag, Target, DollarSign } from "lucide-react";
import { CountrySelect } from "@/components/CountrySelect";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const THEMES_LIST = [
  { key: "Medio Ambiente", tKey: "theme_environment" },
  { key: "Tecnología", tKey: "theme_tech" },
  { key: "Arte", tKey: "theme_art" },
  { key: "Sociedad", tKey: "theme_society" },
  { key: "Deportes", tKey: "theme_sports" },
  { key: "Salud", tKey: "theme_health" }
];

function DashboardSidebarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Sidebar");

  // Estados locales para los filtros
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [types, setTypes] = useState<string[]>(
    searchParams.get("types") ? searchParams.get("types")!.split(",") : []
  );
  const [age, setAge] = useState(searchParams.get("age") || "");
  const [countries, setCountries] = useState<string[]>(
    searchParams.get("dest") ? searchParams.get("dest")!.split(",") : []
  );
  const [targetProfile, setTargetProfile] = useState(searchParams.get("target_profile") || "");
  const [themes, setThemes] = useState<string[]>(
    searchParams.get("themes") ? searchParams.get("themes")!.split(",") : []
  );
  
  const [eligible, setEligible] = useState<string[]>(
    searchParams.get("eligible") ? searchParams.get("eligible")!.split(",") : []
  );
  const [duration, setDuration] = useState(searchParams.get("duration") || "");
  const [minBudget, setMinBudget] = useState(searchParams.get("min_budget") || "");
  const [maxBudget, setMaxBudget] = useState(searchParams.get("max_budget") || "");
  const [maxFee, setMaxFee] = useState(searchParams.get("max_fee") || "");
  const [accommodation, setAccommodation] = useState(searchParams.get("accommodation") === "true");

  const [rup, setRup] = useState(searchParams.get("rup") === "true");
  const [lastMinute, setLastMinute] = useState(searchParams.get("last_minute") === "true");

  const toggleTheme = (theme: string) => {
    setThemes(prev => prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]);
  };
  
  const toggleType = (missionType: string) => {
    setTypes(prev => prev.includes(missionType) ? prev.filter(t => t !== missionType) : [...prev, missionType]);
  };

  // Aplicar filtros debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (types.length > 0) params.set("types", types.join(","));
      if (age) params.set("age", age);
      if (countries.length > 0) params.set("dest", countries.join(","));
      if (targetProfile) params.set("target_profile", targetProfile);
      if (themes.length > 0) params.set("themes", themes.join(","));
      if (eligible.length > 0) params.set("eligible", eligible.join(","));
      if (duration) params.set("duration", duration);
      if (minBudget) params.set("min_budget", minBudget);
      if (maxBudget) params.set("max_budget", maxBudget);
      if (maxFee) params.set("max_fee", maxFee);
      if (accommodation) params.set("accommodation", "true");
      if (rup) params.set("rup", "true");
      if (lastMinute) params.set("last_minute", "true");

      router.push(`/dashboard?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, types, age, countries, targetProfile, themes, eligible, duration, minBudget, maxBudget, maxFee, accommodation, rup, lastMinute, router]);

  const SidebarContent = (
    <div className="flex flex-col h-full bg-void-deep text-white w-72 border-r border-void-border">
      <div className="p-6 flex items-center gap-3 border-b border-void-border">
        <Image src="/logo-small.png" alt="EuroNova Icon" width={40} height={40} />
        <h1 className="text-xl font-black tracking-tight">EuroNova</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
          <MultiSelectCountry 
            selected={countries}
            onChange={setCountries}
            placeholder={t('anyCountry')}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {t('eligibleCountries') || "Eligible Countries"}
          </h3>
          <MultiSelectCountry 
            selected={eligible}
            onChange={setEligible}
            placeholder={t('anyCountry')}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-3 h-3" /> {t('missionType')}
          </h3>
          <div className="flex flex-col gap-2">
            {["ESC", "Youth Exchange", "Training"].map((mType) => (
              <label 
                key={mType} 
                onClick={(e) => {
                  e.preventDefault();
                  toggleType(mType);
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300 cursor-pointer group hover:bg-void-surface
                  ${types.includes(mType) ? 'border-plasma-cyan bg-plasma-cyan/10' : 'border-void-border'}`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors
                  ${types.includes(mType) ? 'border-plasma-cyan bg-plasma-cyan' : 'border-gray-500 group-hover:border-plasma-cyan'}
                `}>
                  {types.includes(mType) && <div className="w-2 h-2 rounded-full bg-void-deep" />}
                </div>
                <span className={`text-sm ${types.includes(mType) ? 'text-white font-medium' : 'text-gray-400'}`}>
                  {mType === "ESC" ? "European Solidarity Corps" : mType === "Training" ? "Training Course" : mType}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Target className="w-3 h-3" /> {t('targetProfile')}
          </h3>
          <select
            value={targetProfile}
            onChange={(e) => setTargetProfile(e.target.value)}
            className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all appearance-none cursor-pointer"
          >
            <option value="">{t('anyProfile')}</option>
            <option value="Estudiantes">Estudiantes</option>
            <option value="Desempleados">Desempleados</option>
            <option value="Sin requisitos">Sin requisitos previos</option>
          </select>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('age')}</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Ej: 22"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('duration') || "Max Duration (Days)"}</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Ej: 30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('travelBudget') || "Travel Budget (€)"}</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <DollarSign className="w-3 h-3" /> {t('maxFee') || "Max Participation Fee (€)"}
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Ej: 50"
              value={maxFee}
              onChange={(e) => setMaxFee(e.target.value)}
              className="w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Tag className="w-3 h-3" /> {t('themes')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {THEMES_LIST.map((themeObj) => (
              <button
                key={themeObj.key}
                onClick={() => toggleTheme(themeObj.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-300 ${
                  themes.includes(themeObj.key)
                    ? "bg-hyper-violet/20 border-hyper-violet text-hyper-violet shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                    : "bg-void-surface border-void-border text-gray-400 hover:border-gray-500"
                }`}
              >
                {t(themeObj.tKey as any)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('specialFilters')}</h3>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={accommodation} onChange={(e) => setAccommodation(e.target.checked)} />
              <div className={`w-10 h-6 rounded-full transition-colors ${accommodation ? 'bg-plasma-cyan' : 'bg-void-surface border border-void-border'}`}></div>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${accommodation ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className={`text-sm font-medium transition-colors ${accommodation ? 'text-plasma-cyan' : 'text-gray-400 group-hover:text-gray-300'}`}>{t('accommodation') || "Accommodation Included"}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={rup} onChange={(e) => setRup(e.target.checked)} />
              <div className={`w-10 h-6 rounded-full transition-colors ${rup ? 'bg-rup-emerald' : 'bg-void-surface border border-void-border'}`}></div>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${rup ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className={`text-sm font-medium transition-colors ${rup ? 'text-rup-emerald' : 'text-gray-400 group-hover:text-gray-300'}`}>{t('rupFlights')}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={lastMinute} onChange={(e) => setLastMinute(e.target.checked)} />
              <div className={`w-10 h-6 rounded-full transition-colors ${lastMinute ? 'bg-nova-flare' : 'bg-void-surface border border-void-border'}`}></div>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${lastMinute ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className={`text-sm font-medium transition-colors ${lastMinute ? 'text-nova-flare' : 'text-gray-400 group-hover:text-gray-300'}`}>{t('lastMinute')}</span>
          </label>
        </div>
      </div>

      <div className="p-6 border-t border-void-border bg-void-deep">
        <Link href="/dashboard/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-void-surface hover:bg-plasma-cyan/10 border border-void-border hover:border-plasma-cyan/30 text-gray-300 hover:text-plasma-cyan transition-all duration-300 group">
          <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-sm">{t('myProfile')}</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 w-full h-16 bg-void-deep border-b border-void-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src="/logo-small.png" alt="EuroNova Icon" width={32} height={32} />
          <span className="font-black text-white">EuroNova</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </div>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex pt-16">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative z-40 w-72 h-full bg-void-deep border-r border-void-border animate-in slide-in-from-left">
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export function DashboardSidebar() {
  return (
    <Suspense fallback={<div className="w-72 h-full bg-void-deep border-r border-void-border animate-pulse" />}>
      <DashboardSidebarInner />
    </Suspense>
  );
}
