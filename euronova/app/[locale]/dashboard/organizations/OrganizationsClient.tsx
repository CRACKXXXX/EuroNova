"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Search, Building } from "lucide-react";
import { MultiSelectCountry } from "@/components/MultiSelectCountry";
import { CustomSelect } from "@/components/CustomSelect";
import { useTranslations } from "next-intl";

const ENTITY_TYPES = [
  "NGO / Association",
  "Private Company",
  "Public Body",
  "Educational Institution",
];

export function OrganizationsClient({
  initialQ,
  initialCountries,
  initialVerified,
  initialEntityType,
}: {
  initialQ: string;
  initialCountries: string[];
  initialVerified: boolean;
  initialEntityType: string;
}) {
  const t = useTranslations("OrgFilters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMountedRef = useRef(false);

  const [q, setQ] = useState(initialQ);
  const [countries, setCountries] = useState<string[]>(initialCountries);
  const [verified, setVerified] = useState(initialVerified);
  const [entityType, setEntityType] = useState(initialEntityType);

  // Sync state during render if URL changes externally (e.g. back navigation)
  const [prevParamsString, setPrevParamsString] = useState(searchParams.toString());
  const currentParamsString = searchParams.toString();
  if (prevParamsString !== currentParamsString) {
    setPrevParamsString(currentParamsString);
    setQ(searchParams.get("q") || "");
    const cParam = searchParams.get("countries");
    setCountries(cParam ? cParam.split(",") : []);
    setVerified(searchParams.get("verified") === "true");
    setEntityType(searchParams.get("entityType") || "");
  }

  useEffect(() => {
    // Avoid running on initial render when user hasn't touched any filters
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (countries.length > 0) params.set("countries", countries.join(","));
      if (verified) params.set("verified", "true");
      if (entityType) params.set("entityType", entityType);

      const newParams = new URLSearchParams(params.toString());
      const curParams = new URLSearchParams(searchParams.toString());
      newParams.sort();
      curParams.sort();

      if (newParams.toString() !== curParams.toString()) {
        const newQuery = params.toString();
        router.push(`/dashboard/organizations${newQuery ? `?${newQuery}` : ""}`);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [q, countries, verified, entityType, router, searchParams]);

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

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <CustomSelect
            value={entityType}
            onChange={(val) => setEntityType(val)}
            placeholder={t("entityType")}
            icon={<Building className="w-4 h-4 text-gray-500" />}
            options={[
              { value: "", label: t("entityType") },
              ...ENTITY_TYPES.map((type) => ({ value: type, label: type })),
            ]}
          />
        </div>

        <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
          <label className="flex items-center gap-3 cursor-pointer group bg-void-deep px-4 py-2.5 rounded-lg border border-void-border w-full sm:w-auto">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  verified ? "bg-rup-emerald" : "bg-void-surface border border-void-border"
                }`}
              ></div>
              <div
                className={`absolute w-4 h-4 rounded-full bg-white top-1 transition-transform ${
                  verified ? "translate-x-5" : "translate-x-1"
                }`}
              ></div>
            </div>
            <span
              className={`text-sm font-medium transition-colors ${
                verified ? "text-rup-emerald" : "text-gray-400 group-hover:text-gray-300"
              }`}
            >
              {t("onlyVerified")}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
