"use client";

import { useState, useMemo } from "react";
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
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";
import {
  ECOSYSTEM_RESOURCES,
  type EcosystemCategory,
  type EcosystemResource,
} from "@/lib/data/ecosystem";

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

  const countryOptions = useMemo(() => {
    const presentCodes = new Set(ECOSYSTEM_RESOURCES.map((r) => r.countryCode));
    const list = COUNTRIES.filter((c) => presentCodes.has(c.code)).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return [
      { code: "all", label: t("countryAll") },
      { code: "EU", label: t("countryEurope") },
      ...list.map((c) => ({ code: c.code, label: c.name })),
    ];
  }, [t]);

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
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesDesc = res.description.toLowerCase().includes(q);
        const matchesCountry = res.countryName.toLowerCase().includes(q);
        const matchesTags = res.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesCountry && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedCountry]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCountry("all");
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
      {/* Search & Filter Control Deck */}
      <div className="bg-void-surface/90 border border-void-border rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Top: Live Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-12 pr-4 py-3.5 bg-void-deep rounded-xl border border-void-border focus:border-plasma-cyan text-sm sm:text-base text-white placeholder-gray-500 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded bg-void-surface text-gray-400 hover:text-white"
            >
              Clear
            </button>
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
                <button
                  key={tab.key}
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
              );
            })}
          </div>

          {/* Country Selector Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-hyper-violet" />
              <span>Location:</span>
            </span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-void-deep border border-void-border text-gray-200 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-hyper-violet focus:ring-1 focus:ring-hyper-violet transition-all cursor-pointer"
            >
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code} className="bg-void-surface text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Bar: Results Counter */}
        <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-rup-emerald animate-pulse" />
            <span>{t("resultsCount", { count: filteredResources.length })}</span>
          </div>
          {(selectedCategory !== "all" || selectedCountry !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-plasma-cyan hover:underline cursor-pointer font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t("resetFilters")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of External Resource Cards */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res: EcosystemResource) => {
            const theme = getCategoryTheme(res.category);
            const CategoryIcon = theme.icon;
            const countryObj = COUNTRIES.find((c) => c.code === res.countryCode);

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

                    {/* Country Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-void-deep border border-void-border text-gray-300">
                      {res.countryCode === "EU" ? (
                        <span>🇪🇺</span>
                      ) : countryObj?.flagUrl ? (
                        <Image
                          src={countryObj.flagUrl}
                          alt={res.countryName}
                          width={14}
                          height={10}
                          unoptimized
                          className="w-3.5 h-auto rounded-[2px]"
                        />
                      ) : (
                        <span>🌐</span>
                      )}
                      <span>{res.countryName}</span>
                    </span>
                  </div>

                  {res.badge && (
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider hidden sm:inline-block">
                      {res.badge}
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

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {res.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-void-deep/80 border border-void-border text-gray-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Card Action: Strict target="_blank" rel="noopener noreferrer" or Link Pending */}
                <div className="mt-auto pt-4 border-t border-void-border/60">
                  {res.url === "#" ? (
                    <div
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-void-deep/80 border border-void-border/80 text-amber-400 font-semibold text-xs sm:text-sm cursor-not-allowed select-none shadow-inner"
                      title={t("linkPending")}
                    >
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{t("linkPending")}</span>
                    </div>
                  ) : (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-plasma-cyan/10 hover:bg-plasma-cyan/20 border border-plasma-cyan/30 hover:border-plasma-cyan text-plasma-cyan font-bold text-xs sm:text-sm transition-all group/btn shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                    >
                      <span>{t("openResource")}</span>
                      <ExternalLink className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center border border-dashed border-void-border rounded-3xl bg-void-surface/50 p-8 max-w-xl mx-auto space-y-4">
          <Globe className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">{t("noResultsTitle")}</h3>
          <p className="text-sm text-gray-400 leading-relaxed font-light">
            {t("noResultsDesc")}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-plasma-cyan text-void-deep font-bold text-xs shadow-lg hover:brightness-110 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("resetFilters")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

