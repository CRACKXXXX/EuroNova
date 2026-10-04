"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Tag, Building } from "lucide-react";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { useTranslations } from "next-intl";

const THEMES_LIST = [
  "Medio Ambiente", "Tecnología", "Arte", "Sociedad", "Deportes", "Salud", "Inclusión", "Educación"
];

const ENTITY_TYPES = [
  "ONG", "Empresa Privada", "Institución Pública", "Universidad"
];

export function OrganizationsClient({ initialQ, initialCountries, initialVerified, initialTheme, initialEntityType }: { initialQ: string, initialCountries: string[], initialVerified: boolean, initialTheme: string, initialEntityType: string }) {
  const t = useTranslations("OrgFilters");
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [countries, setCountries] = useState<string[]>(initialCountries);
  const [verified, setVerified] = useState(initialVerified);
  const [theme, setTheme] = useState(initialTheme);
  const [entityType, setEntityType] = useState(initialEntityType);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (countries.length > 0) params.set("countries", countries.join(","));
      if (verified) params.set("verified", "true");
      if (theme) params.set("theme", theme);
      if (entityType) params.set("entityType", entityType);
      
      router.push(`/dashboard/organizations?${params.toString()}`);
    }, 500);
    return () => clearTimeout(timer);
  }, [q, countries, verified, theme, entityType, router]);

  return (
    <div className="bg-void-surface border border-void-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-void-deep border border-void-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all"
          />
        </div>
        <div className="w-full md:w-64">
          <MultiSelectCountry 
            selected={countries} 
            onChange={setCountries} 
            placeholder={t("countryPlaceholder")} 
          />
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3 relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full bg-void-deep border border-void-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all appearance-none"
          >
            <option value="">{t("entityType")}</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/3 relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full bg-void-deep border border-void-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all appearance-none"
          >
            <option value="">{t("allThemes")}</option>
            {THEMES_LIST.map((th) => (
              <option key={th} value={th}>{th}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/3 flex items-center justify-end">
          <label className="flex items-center gap-3 cursor-pointer group bg-void-deep px-4 py-2.5 rounded-lg border border-void-border w-full md:w-auto">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
              <div className={`w-10 h-6 rounded-full transition-colors ${verified ? 'bg-rup-emerald' : 'bg-void-surface border border-void-border'}`}></div>
              <div className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${verified ? 'translate-x-5' : 'translate-x-1'}`}></div>
            </div>
            <span className={`text-sm font-medium transition-colors ${verified ? 'text-rup-emerald' : 'text-gray-400 group-hover:text-gray-300'}`}>{t("onlyVerified")}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
