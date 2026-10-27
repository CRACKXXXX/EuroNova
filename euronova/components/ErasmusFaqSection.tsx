"use client";

import { useState, useMemo } from "react";
import { HelpCircle, ChevronDown, Search, Star, FileText, ExternalLink, Sparkles, Quote, Users, Languages } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { FAQ_DATA, FaqItem, getLocalizedFaq } from "@/lib/faqData";

export type { FaqItem };
export { FAQ_DATA, getLocalizedFaq };

type UnmaskedLang = "ES" | "EN" | "FR" | "DE" | "IT" | "RU" | "PT";

interface UnmaskedData {
  languages: Record<UnmaskedLang, string>;
  driveLink: string;
}

const UNMASKED_LANGUAGES: { key: UnmaskedLang; label: string; flag: string; flagUrl: string }[] = [
  { key: "ES", label: "Español", flag: "🇪🇸", flagUrl: "https://flagcdn.com/w40/es.png" },
  { key: "EN", label: "English", flag: "🇬🇧", flagUrl: "https://flagcdn.com/w40/gb.png" },
  { key: "FR", label: "Français", flag: "🇫🇷", flagUrl: "https://flagcdn.com/w40/fr.png" },
  { key: "DE", label: "Deutsch", flag: "🇩🇪", flagUrl: "https://flagcdn.com/w40/de.png" },
  { key: "IT", label: "Italiano", flag: "🇮🇹", flagUrl: "https://flagcdn.com/w40/it.png" },
  { key: "RU", label: "Русский", flag: "🇷🇺", flagUrl: "https://flagcdn.com/w40/ru.png" },
  { key: "PT", label: "Português", flag: "🇵🇹", flagUrl: "https://flagcdn.com/w40/pt.png" },
];

function parseUnmaskedAnswer(text: string): UnmaskedData {
  const result: UnmaskedData = {
    languages: {
      ES: "",
      EN: "",
      FR: "",
      DE: "",
      IT: "",
      RU: "",
      PT: "",
    },
    driveLink: "https://docs.google.com/document/d/1Vz91CvytCXFj0bT2MJhfH5RF93dhMQa9ANzFc6Pm-iY/edit?usp=sharing",
  };

  const linkMatch = text.match(/\[LINK\]\s*(https?:\/\/[^\s]+)/i);
  if (linkMatch) {
    result.driveLink = linkMatch[1].trim();
  }

  const langRegex = /\[(ES|EN|FR|DE|IT|RU|PT)\](?:\s*[^\n\r]*)?\n*([\s\S]*?)(?=\[(?:ES|EN|FR|DE|IT|RU|PT|LINK)\]|$)/gi;
  let match;
  while ((match = langRegex.exec(text)) !== null) {
    const lang = match[1].toUpperCase() as UnmaskedLang;
    if (result.languages[lang] !== undefined) {
      result.languages[lang] = match[2].trim();
    }
  }

  return result;
}

function UnmaskedWorkshopView({ rawAnswer }: { rawAnswer: string }) {
  const t = useTranslations("ErasmusFaq");
  const locale = useLocale();
  const defaultLang = useMemo((): UnmaskedLang => {
    const upper = (locale || "es").toUpperCase();
    if (upper === "ES" || upper === "EN" || upper === "FR" || upper === "DE" || upper === "IT" || upper === "RU" || upper === "PT") {
      return upper as UnmaskedLang;
    }
    return "ES";
  }, [locale]);
  const [activeLang, setActiveLang] = useState<UnmaskedLang>(defaultLang);
  const parsed = useMemo(() => parseUnmaskedAnswer(rawAnswer), [rawAnswer]);

  const activeText = parsed.languages[activeLang] || parsed.languages.ES;
  const currentLangObj = UNMASKED_LANGUAGES.find((l) => l.key === activeLang);

  return (
    <div className="space-y-4 pt-1 sm:pl-12">
      {/* Top Banner: Co-Creation Lore Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-hyper-violet/10 border border-hyper-violet/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-hyper-violet/20 border border-hyper-violet/40 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-plasma-cyan" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              {t("campLoreTitle")}
            </span>
            <span className="text-[11px] text-gray-400 block">
              {t("campLoreDesc")}
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-void-deep/80 border border-plasma-cyan/30 text-plasma-cyan text-[11px] font-bold self-start sm:self-auto shrink-0">
          <Sparkles className="w-3 h-3 text-plasma-cyan" />
          <span>{t("coreLanguages")}</span>
        </div>
      </div>

      {/* Language Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mr-1">
          <Languages className="w-3.5 h-3.5 text-plasma-cyan" />
          <span>{t("languageLabel")}</span>
        </div>
        {UNMASKED_LANGUAGES.map((lang) => {
          const isActive = activeLang === lang.key;
          return (
            <button
              key={lang.key}
              type="button"
              onClick={() => setActiveLang(lang.key)}
              className={`inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none ${
                isActive
                  ? "bg-gradient-to-r from-plasma-cyan to-hyper-violet text-void-deep shadow-[0_0_15px_rgba(0,229,255,0.4)] scale-105"
                  : "bg-void-deep/90 text-gray-300 hover:text-white border border-void-border hover:border-plasma-cyan/40"
              }`}
            >
              <Image
                src={lang.flagUrl}
                alt={lang.label}
                width={18}
                height={13}
                unoptimized
                style={{ width: "auto", height: "auto" }}
                className="w-4.5 h-auto rounded-[2px] object-cover shadow-sm inline-block"
              />
              <span className="text-sm leading-none">{lang.flag}</span>
              <span>{lang.key}</span>
              <span className="hidden sm:inline text-[10px] opacity-80">({lang.label})</span>
            </button>
          );
        })}
      </div>

      {/* Narrative Message Box */}
      <div className="relative p-5 sm:p-6 rounded-2xl bg-void-deep/80 border border-void-border/80 backdrop-blur-md shadow-inner overflow-hidden">
        <Quote className="absolute right-4 top-4 w-12 h-12 text-plasma-cyan/10 pointer-events-none select-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/20">
            {currentLangObj && (
              <Image
                src={currentLangObj.flagUrl}
                alt={currentLangObj.label}
                width={16}
                height={12}
                unoptimized
                style={{ width: "auto", height: "auto" }}
                className="w-4 h-auto rounded-[2px] object-cover shadow-xs inline-block"
              />
            )}
            <span className="text-sm leading-none">{currentLangObj?.flag}</span>
            <span>Personal Note · {currentLangObj?.label}</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-normal whitespace-pre-line">
            {activeText}
          </p>
        </div>
      </div>

      {/* Massive Call-to-Action Drive Button */}
      <a
        href={parsed.driveLink}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-hyper-violet/25 via-void-surface to-plasma-cyan/20 hover:from-plasma-cyan hover:via-hyper-violet hover:to-plasma-cyan border-2 border-plasma-cyan/50 hover:border-plasma-cyan transition-all duration-300 shadow-[0_0_25px_rgba(0,229,255,0.2)] hover:shadow-[0_0_40px_rgba(0,229,255,0.45)] cursor-pointer overflow-hidden"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-plasma-cyan/20 group-hover:bg-void-deep border border-plasma-cyan/60 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-colors">
            <FileText className="w-6 h-6 text-plasma-cyan group-hover:text-plasma-cyan transition-colors" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-plasma-cyan/20 group-hover:bg-void-deep/80 text-plasma-cyan group-hover:text-plasma-cyan transition-colors border border-plasma-cyan/30">
                {t("officialDocBadge")}
              </span>
              <span className="text-[10px] text-gray-400 group-hover:text-void-deep font-semibold transition-colors">
                {t("readyToPrint")}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-black text-white group-hover:text-void-deep transition-colors tracking-tight">
              {t("unmaskedGuideTitle")}
            </h4>
            <p className="text-xs text-gray-400 group-hover:text-void-deep/90 transition-colors">
              {t("unmaskedGuideDesc")}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-plasma-cyan group-hover:bg-void-deep text-void-deep group-hover:text-plasma-cyan text-xs sm:text-sm font-black transition-all shadow-lg shrink-0">
          <span>{t("readCopyDynamic")}</span>
          <ExternalLink className="w-4 h-4" />
        </div>
      </a>
    </div>
  );
}

function formatAnswerWithLinks(text: string, t: (key: string) => string) {
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((paragraph, pIdx) => {
    const trimmed = paragraph.trim();

    // Horizontal divider
    if (trimmed === "---") {
      return (
        <hr
          key={`sep-${pIdx}`}
          className="border-void-border/70 my-3 border-dashed"
        />
      );
    }

    // Subtitle like *English translation:*
    if (trimmed.toLowerCase().includes("*english translation:*") || trimmed.toLowerCase() === "*english translation:*") {
      return (
        <div
          key={`en-title-${pIdx}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-void-deep/80 border border-plasma-cyan/30 text-plasma-cyan text-xs font-bold uppercase tracking-wider my-1"
        >
          <Sparkles className="w-3 h-3 text-plasma-cyan" />
          <span>{t("englishTranslation")}</span>
        </div>
      );
    }

    // Google Docs standalone button
    if (trimmed.startsWith("https://docs.google.com")) {
      return (
        <div key={`cta-${pIdx}`} className="pt-2 pb-1">
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-plasma-cyan/15 hover:bg-plasma-cyan text-plasma-cyan hover:text-void-deep border border-plasma-cyan/50 hover:border-plasma-cyan rounded-xl transition-all font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] group cursor-pointer"
          >
            <FileText className="w-4 h-4 text-plasma-cyan group-hover:text-void-deep transition-colors" />
            <span>{t("openUnmaskedGuide")}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      );
    }

    // Paragraph with potential inline URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = paragraph.split(urlRegex);

    return (
      <p key={`p-${pIdx}`} className="leading-relaxed text-gray-300">
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            if (part.includes("docs.google.com")) {
              return (
                <span key={index} className="block my-2">
                  <a
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-plasma-cyan/15 hover:bg-plasma-cyan text-plasma-cyan hover:text-void-deep border border-plasma-cyan/50 hover:border-plasma-cyan rounded-xl transition-all font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] group cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-plasma-cyan group-hover:text-void-deep transition-colors" />
                    <span>{t("openUnmaskedGuide")}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </a>
                </span>
              );
            }
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-plasma-cyan hover:underline underline-offset-4 font-semibold break-all inline-flex items-center gap-1 transition-colors hover:text-white"
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  });
}

export function ErasmusFaqSection() {
  const t = useTranslations("ErasmusFaq");
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>("surv-unmasked-workshop");

  const localizedFaqs = useMemo(() => getLocalizedFaq(locale), [locale]);

  const filteredFaqs = useMemo(() => {
    return localizedFaqs.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [localizedFaqs, searchQuery, selectedCategory]);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-hyper-violet/20 via-void-surface to-plasma-cyan/15 border border-void-border/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t("headerBadge")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t("headerTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
              {t("headerDesc")}
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder", { count: localizedFaqs.length })}
              className="w-full bg-void-deep/90 border border-void-border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-plasma-cyan transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: t("tabAll", { count: localizedFaqs.length }) },
          { key: "special", label: t("tabSpecial"), isSpecial: true },
          { key: "survival", label: t("tabSurvival") },
          { key: "types", label: t("tabTypes") },
          { key: "packing", label: t("tabPacking") },
          { key: "social", label: t("tabSocial") },
          { key: "funding", label: t("tabFunding") },
          { key: "visas", label: t("tabVisas") },
          { key: "euronova", label: t("tabEuronova") },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedCategory(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === tab.key
                ? tab.isSpecial
                  ? "bg-gradient-to-r from-plasma-cyan to-hyper-violet text-void-deep font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                  : "bg-plasma-cyan text-void-deep font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                : tab.isSpecial
                ? "bg-hyper-violet/15 text-plasma-cyan border border-plasma-cyan/40 hover:border-plasma-cyan shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                : "bg-void-surface text-gray-400 hover:text-white border border-void-border hover:border-void-border/80"
            }`}
          >
            {tab.isSpecial && <Star className="w-3.5 h-3.5 fill-plasma-cyan text-plasma-cyan animate-pulse" />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Accordion Count Bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>{t("showingAnswers", { count: filteredFaqs.length })}</span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-plasma-cyan hover:underline cursor-pointer"
          >
            {t("clearSearch")}
          </button>
        )}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="bg-void-surface/50 border border-void-border rounded-2xl p-10 text-center">
            <HelpCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-300">{t("noQuestionsFound")}</p>
            <p className="text-xs text-gray-500 mt-1">{t("noQuestionsHint")}</p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            const IconComponent = faq.icon;
            const isSpecialItem = faq.category === "special";

            return (
              <div
                key={faq.id}
                className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isSpecialItem
                    ? isExpanded
                      ? "bg-gradient-to-b from-hyper-violet/25 via-void-surface/95 to-void-surface border-plasma-cyan shadow-[0_0_35px_rgba(0,229,255,0.18)] ring-1 ring-plasma-cyan/40"
                      : "bg-gradient-to-r from-hyper-violet/15 via-void-surface/80 to-void-surface/60 border-hyper-violet/50 hover:border-plasma-cyan/60 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    : isExpanded
                    ? "bg-void-surface/90 border-plasma-cyan/40 shadow-[0_0_25px_rgba(0,229,255,0.08)]"
                    : "bg-void-surface/50 border-void-border/80 hover:border-void-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSpecialItem
                          ? "bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/50 shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                          : isExpanded
                          ? "bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30"
                          : "bg-void-deep text-gray-400 border border-void-border group-hover:text-plasma-cyan"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-white group-hover:text-plasma-cyan transition-colors">
                        {faq.question}
                      </span>
                      {isSpecialItem && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40 shrink-0">
                          <Star className="w-2.5 h-2.5 fill-plasma-cyan" />
                          <span>{t("creatorSpecial")}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-void-border text-gray-400 group-hover:text-white transition-transform duration-200 ${
                      isExpanded ? "rotate-180 bg-void-deep text-plasma-cyan" : "bg-void-surface"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-void-border/40 animate-in fade-in duration-200">
                    {isSpecialItem ? (
                      <UnmaskedWorkshopView rawAnswer={faq.answer} />
                    ) : (
                      <div className="pl-12 space-y-3">{formatAnswerWithLinks(faq.answer, t)}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
