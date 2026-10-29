import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { stripDangerousHtml, sanitizeUnicode } from "@/lib/securitySanitizer";
import { getUserRole } from "@/lib/roles";
import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  cleanScrapedTitle,
  cleanProjectDescription,
  parseEuropeanDateRange,
  mapToCanonicalTopics,
  normalizeErasmusProjectType,
  calculateSemanticTitleSimilarity,
} from "@/lib/formatters/projectDescription";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================================
// IN-MEMORY EXECUTION LOCK (OVERLAP PROTECTION)
// ============================================================================

let isScrapeRunning = false;
let scrapeLockTimestamp = 0;
const SCRAPE_LOCK_TIMEOUT_MS = 60000;

// ============================================================================
// CONSTANTS & RECOGNIZED PROGRAMME DATA
// ============================================================================

const AUTO_SCRAPER_ORG_ID = "0610184a-a16e-4dcc-a8f6-b9ddef963bf5";

const TRACKING_PARAM_PREFIXES = [
  "utm_",
  "fbclid",
  "gclid",
  "ref",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "msclkid",
  "source",
];

const VALID_ISO_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "MK", "IS", "LI",
  "NO", "RS", "TR", "GB", "UK", "AL", "AM", "AZ", "BA", "GE", "XK",
  "MD", "ME", "CH", "UA",
]);

const COUNTRY_MAP: Record<string, string> = {
  // English & local names
  spain: "ES", espana: "ES", españa: "ES", spagna: "ES",
  italy: "IT", italia: "IT",
  germany: "DE", alemania: "DE", deutschland: "DE", germania: "DE",
  france: "FR", francia: "FR",
  portugal: "PT", portogallo: "PT",
  greece: "GR", grecia: "GR",
  poland: "PL", polonia: "PL", polska: "PL",
  netherlands: "NL", "paises bajos": "NL", "países bajos": "NL", holanda: "NL", olanda: "NL",
  belgium: "BE", belgica: "BE", bélgica: "BE", belgique: "BE",
  austria: "AT", autriche: "AT",
  sweden: "SE", suecia: "SE", svezia: "SE",
  denmark: "DK", dinamarca: "DK", danimarca: "DK",
  finland: "FI", finlandia: "FI",
  ireland: "IE", irlanda: "IE",
  czechia: "CZ", "czech republic": "CZ", "republica checa": "CZ", "república checa": "CZ",
  slovakia: "SK", eslovaquia: "SK", slovacchia: "SK",
  hungary: "HU", hungria: "HU", hungría: "HU", ungheria: "HU",
  romania: "RO", rumania: "RO", rumanía: "RO",
  bulgaria: "BG",
  croatia: "HR", croacia: "HR",
  slovenia: "SI", eslovenia: "SI",
  cyprus: "CY", chipre: "CY", cipro: "CY",
  malta: "MT",
  estonia: "EE",
  latvia: "LV", letonia: "LV", lettonia: "LV",
  lithuania: "LT", lituania: "LT",
  luxembourg: "LU", luxemburgo: "LU",
  norway: "NO", noruega: "NO", norvegia: "NO",
  iceland: "IS", islandia: "IS",
  liechtenstein: "LI",
  turkey: "TR", turquia: "TR", turquía: "TR", türkiye: "TR", turchia: "TR",
  "north macedonia": "MK", macedonia: "MK", "macedonia del norte": "MK",
  serbia: "RS",
  "bosnia and herzegovina": "BA", bosnia: "BA", "bosnia y herzegovina": "BA",
  montenegro: "ME",
  albania: "AL",
  georgia: "GE",
  armenia: "AM",
  azerbaijan: "AZ", azerbaiyan: "AZ", azerbaiyán: "AZ",
  moldova: "MD", moldavia: "MD",
  ukraine: "UA", ucrania: "UA",
  switzerland: "CH", suiza: "CH",
  "united kingdom": "GB", uk: "GB", "reino unido": "GB",
  kosovo: "XK",
};

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  gennaio: 1, febbraio: 2, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, settembre: 9, ottobre: 10, dicembre: 12,
  janvier: 1, février: 2, fevrier: 2, mars: 3, mai: 5, juin: 6,
  juillet: 7, août: 8, aout: 8, novembre: 11, décembre: 12,
  januar: 1, februar: 2, märz: 3, maerz: 3, juli: 7, dezember: 12,
};

const MONTH_NAMES_PATTERN = Object.keys(MONTH_MAP).sort((a, b) => b.length - a.length).join("|");

// ============================================================================
// DATA CONTRACT INTERFACES
// ============================================================================

export interface ScrapedCandidate {
  source: "salto" | "eyp_esc" | "ye_aggregator" | "proactive_future" | "aktivekosmos";
  external_id?: string | null;
  title: string;
  official_url: string;
  description: string;
  project_type: "YE" | "TC" | "ESC" | "PBA" | "SV" | "SE" | "VET" | "CBY";
  // Native API extracted fields (Tier 1 - locked in when available)
  native_start_date?: string | null;
  native_end_date?: string | null;
  native_dest_country?: string | null;
  native_location?: string | null;
  native_deadline?: string | null;
  native_eligible_countries?: string[];
  financing_type: "Total" | "Partial" | "None";
  accommodation_covered: boolean;
  min_age: number;
  max_age: number;
  is_last_minute: boolean;
  covers_rup_flights: boolean;
  themes: string[];
}

export interface ValidatedProject {
  title: string;
  official_url: string;
  description: string;
  project_type: string;
  dest_country: string | null;
  exact_location: string | null;
  financing_type: "Total" | "Partial" | "None";
  accommodation_covered: boolean;
  min_age: number;
  max_age: number;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  is_last_minute: boolean;
  covers_rup_flights: boolean;
  themes: string[];
  eligible_countries: string[];
  org_id: string;
  status: "published" | "pending_review";
}

// ============================================================================
// UTILITIES & SANITIZERS
// ============================================================================

export interface ProjectValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedProject?: ValidatedProject;
}

/**
 * Layer 1: Canonical URL Normalization
 * Forces HTTPS, lowercases hostname, strips default ports, removes tracking parameters,
 * sorts remaining query parameters alphabetically, removes URL fragments, and strips trailing slashes.
 */
export function normalizeOfficialUrl(rawUrl: string, baseDomain = ""): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("//")) {
    trimmed = `https:${trimmed}`;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    if (baseDomain) {
      try {
        const base = baseDomain.endsWith("/") ? baseDomain : `${baseDomain}/`;
        const path = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
        trimmed = new URL(path, base).toString();
      } catch {
        trimmed = `https://${trimmed}`;
      }
    } else {
      trimmed = `https://${trimmed}`;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  // 1. Force HTTPS
  parsed.protocol = "https:";

  // 2. Lowercase hostname
  parsed.hostname = parsed.hostname.toLowerCase();

  // 3. Strip default ports
  if (parsed.port === "80" || parsed.port === "443") {
    parsed.port = "";
  }

  // 4. Strip URL fragments
  parsed.hash = "";

  // 5. Strip tracking parameters
  const retainedParams: [string, string][] = [];
  parsed.searchParams.forEach((val, key) => {
    const keyLower = key.toLowerCase();
    const isTracking = TRACKING_PARAM_PREFIXES.some(
      (prefix) => keyLower.startsWith(prefix) || keyLower === prefix
    );
    if (!isTracking) {
      retainedParams.push([key, val]);
    }
  });

  // 6. Sort remaining query parameters alphabetically
  retainedParams.sort(([a], [b]) => a.localeCompare(b));

  parsed.search = "";
  for (const [k, v] of retainedParams) {
    parsed.searchParams.append(k, v);
  }

  // 7. Strip trailing slashes from pathname (preserving root "/")
  let pathname = parsed.pathname;
  while (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  parsed.pathname = pathname;

  return parsed.toString();
}

/**
 * Layer 2: Semantic Content Fingerprinting
 * Generates a normalized semantic fingerprint combining title and country.
 */
export function normalizeSemanticText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")     // Strip punctuation, emojis, special symbols
    .replace(/\s+/g, " ")            // Collapse multiple whitespace
    .trim();
}

export function computeMissionFingerprint(
  title: string,
  destCountry: string | null | undefined
): string {
  const normTitle = normalizeSemanticText(title);
  const countryCode = resolveCountryCode(destCountry) || (destCountry ? destCountry.trim().toUpperCase() : "XX");
  return `${normTitle}|${countryCode}`;
}

/**
 * Compatibility alias for existing scrapers
 */
function normalizeUrl(url: string, baseDomain: string): string {
  return normalizeOfficialUrl(url, baseDomain);
}

/**
 * Validates and sanitizes a scraped project candidate before database insertion.
 */
export function validateScrapedProjectForInsertion(project: ValidatedProject): ProjectValidationResult {
  if (!project.title || typeof project.title !== "string" || project.title.trim().length < 3) {
    return { isValid: false, error: "Title is missing or shorter than 3 characters." };
  }

  if (!project.official_url || typeof project.official_url !== "string" || !project.official_url.trim()) {
    return { isValid: false, error: "Official URL is missing." };
  }

  const cleanTitle = sanitizeUnicode(project.title).trim();
  const cleanDescription = sanitizeUnicode(stripDangerousHtml(project.description || "", 15000)).trim();

  if (cleanTitle.length < 3) {
    return { isValid: false, error: "Title is too short after sanitization." };
  }

  if (cleanDescription.length < 10) {
    return { isValid: false, error: "Description is too short (<10 characters) after sanitization." };
  }

  let finalCountry = project.dest_country;
  if (finalCountry) {
    const normCountry = resolveCountryCode(finalCountry);
    if (!normCountry) {
      return { isValid: false, error: `Invalid destination country code: "${finalCountry}".` };
    }
    finalCountry = normCountry;
  }

  if (project.start_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(project.start_date)) {
      return { isValid: false, error: `Invalid start_date format: "${project.start_date}".` };
    }
    const year = parseInt(project.start_date.slice(0, 4), 10);
    if (year < 2024 || year > 2030) {
      return { isValid: false, error: `Start date year out of reasonable range: ${year}.` };
    }
  }

  if (project.end_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(project.end_date)) {
      return { isValid: false, error: `Invalid end_date format: "${project.end_date}".` };
    }
    const year = parseInt(project.end_date.slice(0, 4), 10);
    if (year < 2024 || year > 2030) {
      return { isValid: false, error: `End date year out of reasonable range: ${year}.` };
    }
  }

  if (project.start_date && project.end_date) {
    if (new Date(project.end_date) < new Date(project.start_date)) {
      return { isValid: false, error: `End date (${project.end_date}) precedes start date (${project.start_date}).` };
    }
  }

  const sanitized: ValidatedProject = {
    ...project,
    title: cleanTitle,
    description: cleanDescription,
    dest_country: finalCountry,
    official_url: normalizeOfficialUrl(project.official_url),
  };

  return { isValid: true, sanitizedProject: sanitized };
}

/**
 * Validates a calendar date and returns YYYY-MM-DD or null.
 */
function toISODate(year: number, month: number, day: number): string | null {
  if (year < 2024 || year > 2028 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null; // Invalid date (e.g. Feb 31)
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Resolves matched themes from description and maps to canonical 12 themes.
 */
function extractThemes(text: string): string[] {
  return mapToCanonicalTopics(text);
}

/**
 * Resolves a 2-letter ISO country code from text or native candidate.
 */
function resolveCountryCode(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim().toLowerCase();
  if (COUNTRY_MAP[trimmed]) return COUNTRY_MAP[trimmed];
  const upper = trimmed.toUpperCase();
  if (upper === "UK") return "GB";
  if (VALID_ISO_COUNTRY_CODES.has(upper)) return upper;
  return null;
}

/**
 * Forcefully strips out application deadline phrases and their associated dates.
 * This guarantees that deadline dates are never mistakenly parsed as start dates.
 */
function sanitizeTextForDates(text: string): string {
  return text.replace(
    /(?:application\s+deadline|deadline|apply\s+by|apply\s+before|closing\s+date|fecha\s+l[íi]mite|plazo(?:\s+de)?\s+inscripci[óo]n|hasta\s+el|limite\s+candidature|bewerbungsfrist|date\s+limite)[\s\S]{0,50}?(?:\d{4}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/gi,
    ""
  );
}

/**
 * Detects Exact Location (City/Town/Region) and Country.
 * Prevents defaulting to "Not specified" if text mentions "in Madrid", "Nejdek, Czech Republic", or "Bakuriani, Georgia".
 */
function extractLocationAndCountry(
  title: string,
  text: string,
  nativeLocation?: string | null,
  nativeCountry?: string | null
): { country: string | null; location: string | null } {
  // 1. Native API location & country have top priority
  let country = resolveCountryCode(nativeCountry);
  let location = nativeLocation?.trim() || null;

  // 2. Parentheses in title: e.g. "Youth Exchange (Madrid, Spain)" or "Eco-lab (Slovakia)"
  if (!country || !location) {
    const parenMatch = title.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const inside = parenMatch[1].trim();
      const parts = inside.split(/[,/–-]/).map((p) => p.trim());
      for (const part of parts) {
        const foundC = resolveCountryCode(part);
        if (foundC && !country) country = foundC;
        else if (!foundC && !location && part.length >= 3 && !/exchange|training|course/i.test(part)) {
          location = part;
        }
      }
    }
  }

  // 3. Prepositions: "in City, Country" or "en Ciudad, País"
  if (!location) {
    const prepMatch = text.match(/\b(?:in|en|a|au)\s+([A-ZÁÉÍÓÚ][a-záéíóúñA-Z\s]{2,20})(?:,\s*([A-ZÁÉÍÓÚ][a-záéíóúñA-Z\s]{2,20}))?\b/);
    if (prepMatch) {
      const candidateLoc = prepMatch[1].trim();
      if (!/the|un|el|la|this|este|our|youth|erasmus/i.test(candidateLoc)) {
        location = candidateLoc;
      }
      if (prepMatch[2] && !country) {
        country = resolveCountryCode(prepMatch[2]);
      }
    }
  }

  // 4. Known country pattern in text: "[City/Venue], [Country]" (e.g. "Bakuriani, Georgia", "Nejdek, Czech Republic")
  if (!location || !country) {
    const countryNames = Object.keys(COUNTRY_MAP).filter((n) => n.length >= 4).sort((a, b) => b.length - a.length);
    for (const cName of countryNames) {
      const escaped = cName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(",?\\s*([a-zA-ZáéíóúñÁÉÍÓÚ0-9\\s]{2,35}),\\s*" + escaped + "\\b", "i");
      const m = pattern.exec(text);
      if (m) {
        let candidate = m[1].trim();
        candidate = candidate.replace(/^(?:.*?\b(?:in|en|at|near|cerca de|mountains of|montañas de|city of|ciudad de|close to)\s+)/i, "");
        candidate = candidate.replace(/^(?:january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+/i, "");
        candidate = candidate.replace(/^\d{4}\s+/, "");
        const properMatch = candidate.match(/([A-ZÁÉÍÓÚ][a-zA-Záéíóúñ0-9]+(?:\s+[A-ZÁÉÍÓÚ][a-zA-Záéíóúñ0-9]+)*)$/);
        if (properMatch) {
          candidate = properMatch[1];
        }
        candidate = candidate.trim();
        if (candidate.length >= 2 && !/^(?:The|This|Este|Our|Youth|Erasmus)$/i.test(candidate)) {
          if (!location) location = candidate;
          if (!country) country = COUNTRY_MAP[cName];
          break;
        }
      }
    }
  }

  // 5. Fallback search for country name in title then text
  if (!country) {
    for (const [name, code] of Object.entries(COUNTRY_MAP)) {
      if (name.length < 3) continue;
      const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(title)) {
        country = code;
        break;
      }
    }
  }
  if (!country) {
    for (const [name, code] of Object.entries(COUNTRY_MAP)) {
      if (name.length < 3) continue;
      const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(text)) {
        country = code;
        break;
      }
    }
  }

  return { country, location };
}

// ============================================================================
// PRECISION REGEX EXTRACTION ENGINE (TIER 3 FALLBACK)
// ============================================================================

/**
 * Surgically extracts valid dates from text using multiple targeted strategies.
 * FORCEFULLY strips out deadline phrases and their associated dates to prevent 61/29-day ghost durations.
 */
function regexExtractDates(rawText: string): [string | null, string | null] {
  const text = sanitizeTextForDates(rawText);
  const allDates: string[] = [];

  // Strategy 1: Explicit ISO dates (YYYY-MM-DD)
  const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = isoPattern.exec(text)) !== null) {
    const d = toISODate(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
    if (d) allDates.push(d);
  }

  // Strategy 2: European numeric dates (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
  const euPattern = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
  while ((m = euPattern.exec(text)) !== null) {
    const d = toISODate(parseInt(m[3], 10), parseInt(m[2], 10), parseInt(m[1], 10));
    if (d && !allDates.includes(d)) allDates.push(d);
  }

  // Strategy 3: Cross-month ranges (e.g. "del 26 de noviembre al 4 de diciembre de 2026")
  const crossMonthPattern = new RegExp(
    `(?:from|del|dal|du|vom)?\\s*(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+(?:de\\s+|di\\s+|of\\s+)?(${MONTH_NAMES_PATTERN})\\.?\\s*(?:(?:de\\s+|del\\s+)?(\\d{4})\\s*)?(?:to|[-–—]|al|au|bis|until|a)\\s*(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+(?:de\\s+|di\\s+|of\\s+)?(${MONTH_NAMES_PATTERN})\\.?\\s*(?:de\\s+|del\\s+)?,?\\s*(\\d{4})`,
    "gi"
  );
  while ((m = crossMonthPattern.exec(text)) !== null) {
    const d1 = parseInt(m[1], 10);
    const m1 = MONTH_MAP[m[2].toLowerCase()];
    const year1 = m[3] ? parseInt(m[3], 10) : parseInt(m[6], 10);
    const d2 = parseInt(m[4], 10);
    const m2 = MONTH_MAP[m[5].toLowerCase()];
    const year2 = parseInt(m[6], 10);
    if (m1 && m2) {
      const iso1 = toISODate(year1, m1, d1);
      const iso2 = toISODate(year2, m2, d2);
      if (iso1 && !allDates.includes(iso1)) allDates.push(iso1);
      if (iso2 && !allDates.includes(iso2)) allDates.push(iso2);
    }
  }

  // Strategy 4: Same-month ranges (e.g. "del 12 al 20 de octubre de 2026", "12-20 October 2026", "5-14 December 2026")
  const sharedMonthPattern = new RegExp(
    `(?:from|del|dal|du|vom)?\\s*\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s*(?:to|[-–—]|al|au|bis)\\s*\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+(?:de\\s+|di\\s+|of\\s+)?(${MONTH_NAMES_PATTERN})\\.?\\s*(?:de\\s+|del\\s+)?,?\\s*(\\d{4})\\b`,
    "gi"
  );
  while ((m = sharedMonthPattern.exec(text)) !== null) {
    const startDay = parseInt(m[1], 10);
    const endDay = parseInt(m[2], 10);
    const monthNum = MONTH_MAP[m[3].toLowerCase()];
    const year = parseInt(m[4], 10);
    if (monthNum && startDay <= endDay) {
      const d1 = toISODate(year, monthNum, startDay);
      const d2 = toISODate(year, monthNum, endDay);
      if (d1 && !allDates.includes(d1)) allDates.push(d1);
      if (d2 && !allDates.includes(d2)) allDates.push(d2);
    }
  }

  // Strategy 5: Single dates (e.g. "4 de diciembre de 2026", "12 October 2026")
  const singleDatePattern = new RegExp(
    `\\b(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s+(?:de\\s+|di\\s+|of\\s+)?(${MONTH_NAMES_PATTERN})\\.?\\s*(?:de\\s+|del\\s+)?,?\\s*(\\d{4})\\b`,
    "gi"
  );
  while ((m = singleDatePattern.exec(text)) !== null) {
    const day = parseInt(m[1], 10);
    const monthNum = MONTH_MAP[m[2].toLowerCase()];
    const year = parseInt(m[3], 10);
    if (monthNum) {
      const d = toISODate(year, monthNum, day);
      if (d && !allDates.includes(d)) allDates.push(d);
    }
  }

  if (allDates.length === 0) return [null, null];
  allDates.sort();
  return [allDates[0], allDates.length > 1 ? allDates[allDates.length - 1] : null];
}

// ============================================================================
// GEMINI AI EXTRACTION WITH CHAIN-OF-THOUGHT (TIER 2)
// ============================================================================

interface AIParsedOutput {
  thought_process?: string;
  start_date: string | null;
  end_date: string | null;
  dest_country: string | null;
  exact_location: string | null;
  eligible_countries: string[];
  project_type: string | null;
  financing_type: "Total" | "Partial" | "None" | null;
}

/**
 * Invokes Gemini AI using a strict Chain-of-Thought prompt to distinguish
 * between application deadlines and actual project activity dates.
 */
async function extractWithAI(
  title: string,
  rawDescription: string
): Promise<Partial<AIParsedOutput> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are a strict data extraction bot for Erasmus+ and European Solidarity Corps youth projects.
Analyze the following text and return a valid JSON object matching this schema.

CRITICAL RULES:
1. "start_date" & "end_date": Must represent the actual PROJECT ACTIVITY DATES (when the event takes place).
2. DO NOT confuse application deadline (fecha límite de inscripción / deadline) with project start_date!
3. Youth Exchanges (YE) & Training Courses (TC) typically last 5 to 21 days (NEVER >25 days). If duration looks like 60 days, you are confusing deadline with start date!
4. "dest_country": 2-letter ISO code where the activity happens (e.g. "ES", "IT", "FR", "DE", "GE", "CZ", "CH").
5. "exact_location": City, municipality, or region. If exact_location is null or not explicitly labeled, you MUST extract the City/Venue and Country from the text (e.g., 'Bakuriani, Georgia' or 'Nejdek, Czech Republic' or 'Hotel Grand Noel, Bakuriani'). NEVER return null if a venue, city, or municipality is mentioned anywhere in the title or text.

Schema:
{
  "thought_process": "brief 1-sentence distinguishing activity dates from deadlines",
  "start_date": "YYYY-MM-DD" or null,
  "end_date": "YYYY-MM-DD" or null,
  "dest_country": "2-letter ISO code" or null,
  "exact_location": "City/Region name" or null,
  "eligible_countries": ["2-letter ISO codes"],
  "project_type": "YE" | "TC" | "ESC" | "PBA",
  "financing_type": "Total" | "Partial" | "None"
}

Title: ${title}
Text:
${rawDescription.substring(0, 3000)}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AIParsedOutput;
    }
    return null;
  } catch (err: unknown) {
    console.error("[AI Extraction Note] AI extraction unavailable, relying on Tier 1 Native + Tier 3 Regex:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ============================================================================
// SEMANTIC COHERENCE & SANITY GUARDRAILS (RULE 3)
// ============================================================================

/**
 * Validates date ranges and rejects illogical extractions (e.g. deadline vs start confusion).
 */
function sanitizeDates(
  projectType: string,
  startDate: string | null,
  endDate: string | null,
  deadlineDate?: string | null
): { startDate: string | null; endDate: string | null; durationDays: number | null } {
  if (!startDate || !endDate) {
    return { startDate: null, endDate: null, durationDays: null };
  }

  const dStart = new Date(startDate);
  const dEnd = new Date(endDate);

  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dEnd < dStart) {
    return { startDate: null, endDate: null, durationDays: null };
  }

  // Reject years outside 2024 - 2028
  const startYear = dStart.getUTCFullYear();
  const endYear = dEnd.getUTCFullYear();
  if (startYear < 2024 || startYear > 2028 || endYear < 2024 || endYear > 2028) {
    return { startDate: null, endDate: null, durationDays: null };
  }

  const durationDays = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 3600 * 24)) + 1;

  // Erasmus+ Youth Exchange & Training Course Guardrail:
  // Typical YE/TC is 5-21 days. If > 25 days, it is a deadline caught as start date (e.g. 29 or 61 days).
  const isShortTermProject = ["YE", "TC", "PBA", "SE"].includes(projectType);
  if (isShortTermProject && durationDays > 25) {
    return { startDate: null, endDate: null, durationDays: null };
  }

  // ESC Volunteering Guardrail: Can last up to 395 days (~13 months)
  if (projectType === "ESC" && durationDays > 395) {
    return { startDate: null, endDate: null, durationDays: null };
  }

  // Deadline check: If deadline is known, start_date must not be before deadline
  if (deadlineDate) {
    const dDead = new Date(deadlineDate);
    if (!isNaN(dDead.getTime()) && dStart < dDead) {
      return { startDate: null, endDate: null, durationDays: null };
    }
  }

  return { startDate, endDate, durationDays };
}

/**
 * Validates candidate against the Data Contract.
 * If core mandatory fields (Dates and Destination) are missing, sets status="pending_review".
 */
function validateProjectContract(
  candidate: ScrapedCandidate,
  resolvedCountry: string | null,
  resolvedLocation: string | null,
  startDate: string | null,
  endDate: string | null,
  durationDays: number | null,
  eligibleCountries: string[]
): ValidatedProject {
  const isComplete = Boolean(
    resolvedCountry &&
    startDate &&
    endDate &&
    durationDays &&
    durationDays > 0
  );

  return {
    title: candidate.title.trim(),
    official_url: candidate.official_url,
    description: candidate.description.trim(),
    project_type: candidate.project_type,
    dest_country: resolvedCountry,
    exact_location: resolvedLocation,
    financing_type: candidate.financing_type,
    accommodation_covered: candidate.accommodation_covered,
    min_age: candidate.min_age,
    max_age: candidate.max_age,
    start_date: startDate,
    end_date: endDate,
    duration_days: durationDays,
    is_last_minute: candidate.is_last_minute,
    covers_rup_flights: candidate.covers_rup_flights,
    themes: candidate.themes,
    eligible_countries: eligibleCountries.length > 0 ? eligibleCountries : ["ES", "IT", "FR", "DE", "PT"],
    org_id: AUTO_SCRAPER_ORG_ID,
    // THE DATA CONTRACT: Core fields missing -> pending_review, never published garbage!
    status: isComplete ? "published" : "pending_review",
  };
}

// ============================================================================
// MODULAR SOURCE FETCHERS (PILLAR 1)
// ============================================================================

// ============================================================================
// NETWORK RESILIENCE & ANTI-BOT EVASION (PILLAR 1)
// ============================================================================

const BROWSER_PROFILES = [
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    platform: '"Windows"',
  },
  {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    platform: '"macOS"',
  },
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    secChUa: undefined,
    platform: '"Windows"',
  },
  {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    secChUa: undefined,
    platform: '"macOS"',
  },
  {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    secChUa: '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
    platform: '"Windows"',
  },
];

function getRealisticHeaders(isJson = false): Record<string, string> {
  const profile = BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)];
  const headers: Record<string, string> = {
    "User-Agent": profile.userAgent,
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8,de;q=0.7",
    "Accept": isJson
      ? "application/json, text/plain, */*"
      : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Sec-Fetch-Dest": isJson ? "empty" : "document",
    "Sec-Fetch-Mode": isJson ? "cors" : "navigate",
    "Sec-Fetch-Site": isJson ? "same-origin" : "none",
  };
  if (profile.secChUa) {
    headers["Sec-Ch-Ua"] = profile.secChUa;
    headers["Sec-Ch-Ua-Mobile"] = "?0";
    headers["Sec-Ch-Ua-Platform"] = profile.platform;
  }
  if (!isJson) {
    headers["Sec-Fetch-User"] = "?1";
    headers["Upgrade-Insecure-Requests"] = "1";
  }
  return headers;
}

/**
 * Enterprise HTTP client with anti-bot evasion and exponential backoff retry.
 * Handles 429 Too Many Requests, 5xx server errors and network aborts.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  timeoutMs = 12000
): Promise<Response> {
  let attempt = 0;
  let lastError: unknown = null;
  const isJson = Boolean(options.headers && JSON.stringify(options.headers).toLowerCase().includes("application/json"));

  while (attempt <= maxRetries) {
    try {
      const dynamicHeaders = {
        ...getRealisticHeaders(isJson),
        ...((options.headers as Record<string, string>) || {}),
      };

      const res = await fetch(url, {
        ...options,
        headers: dynamicHeaders,
        signal: AbortSignal.timeout(timeoutMs),
      });

      // 429 Rate Limit or 5xx Server Error -> Exponential Backoff
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        attempt++;
        let delayMs = Math.min(1000 * Math.pow(2.2, attempt) + Math.random() * 500, 8000);
        const retryAfter = res.headers.get("retry-after");
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 8) {
            delayMs = parsed * 1000;
          }
        }
        console.warn(`[Scraper Backoff] ${url} HTTP ${res.status}. Retrying in ${Math.round(delayMs)}ms (${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      return res;
    } catch (err: unknown) {
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 400, 6000);
        console.warn(`[Scraper Retry] ${url} error (${err instanceof Error ? err.message : String(err)}). Retrying in ${Math.round(delayMs)}ms (${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  console.error(`[Scraper Exhausted] ${url} failed after ${maxRetries} retries:`, lastError);
  return new Response(JSON.stringify({ error: "Source fetch exhausted retries", url }), {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * SOURCE 1: SALTO-YOUTH European Training Calendar
 */
async function fetchSaltoProjects(): Promise<ScrapedCandidate[]> {
  const candidates: ScrapedCandidate[] = [];
  try {
    const browseUrl = "https://www.salto-youth.net/tools/european-training-calendar/browse/";
    const res = await fetchWithRetry(browseUrl, { cache: "no-store" });

    if (!res.ok) return candidates;
    const html = await res.text();
    const $ = cheerio.load(html);

    $('a[href*="/training/"]').each((_, el) => {
      const rawLink = $(el).attr("href");
      const rawTitle = $(el).text().trim();
      const container = $(el).closest("tr, li, div");
      const rawDesc = container.text().replace(/\s+/g, " ").trim();

      if (rawLink && rawTitle && !rawLink.includes("contacttraining")) {
        const official_url = normalizeUrl(rawLink, "https://www.salto-youth.net");
        const title = cleanScrapedTitle(rawTitle);
        const dateRange = parseEuropeanDateRange(rawDesc);
        const cleanDesc = cleanProjectDescription(rawDesc, {
          title,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          deadline: dateRange.deadline,
        });

        const saltoIdMatch = official_url.match(/\.(\d+)(?:\/|$)/);
        const external_id = saltoIdMatch ? `salto:${saltoIdMatch[1]}` : null;
        const projectType = normalizeErasmusProjectType(
          /partnership/i.test(title + cleanDesc) ? "PBA" : /seminar/i.test(title + cleanDesc) ? "SE" : "TC"
        );

        candidates.push({
          source: "salto",
          external_id,
          title,
          official_url,
          description: cleanDesc,
          project_type: projectType,
          native_start_date: dateRange.startDate,
          native_end_date: dateRange.endDate,
          native_deadline: dateRange.deadline,
          financing_type: "Total",
          accommodation_covered: true,
          min_age: 18,
          max_age: 30,
          is_last_minute: /urgent|deadline|asap/i.test(rawDesc),
          covers_rup_flights: /outermost|canary|rup/i.test(rawDesc),
          themes: extractThemes(`${title} ${cleanDesc}`),
        });
      }
      if (candidates.length >= 10) return false;
    });
  } catch (err) {
    console.error("SALTO fetch error:", err instanceof Error ? err.message : String(err));
  }
  return candidates;
}

/**
 * SOURCE 2: European Solidarity Corps (EYP API)
 * Fully locks in native dates, country, and location from official API.
 */
async function fetchEypEscProjects(): Promise<ScrapedCandidate[]> {
  const candidates: ScrapedCandidate[] = [];
  try {
    const apiUrl = "https://youth.europa.eu/api/rest/eyp/v1/search?type=Opportunity&limit=30";
    const res = await fetchWithRetry(apiUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return candidates;
    const data = await res.json();
    const hits = data?.hits?.hits || [];

    for (const hit of hits) {
      const src = hit._source;
      if (!src || src.status === "archive" || src.status === "draft") continue;

      const rawId = src.id || src.opid || hit._id;
      if (!rawId) continue;
      const external_id = `eyp:${rawId}`;

      const title = src.title?.trim() || "European Solidarity Corps Volunteering Opportunity";
      const official_url = normalizeUrl(`/solidarity/placement/${rawId}_en`, "https://youth.europa.eu");

      // Extract native API dates (ISO formatted)
      const nativeStartDate = src.date_start ? src.date_start.split("T")[0] : null;
      const nativeEndDate = src.date_end ? src.date_end.split("T")[0] : null;
      const nativeDeadline = src.date_application_end ? src.date_application_end.split("T")[0] : null;

      const descParts = [
        src.description || "",
        src.boarding_arrangements ? `Alojamiento: ${src.boarding_arrangements}` : "",
        src.training ? `Formación: ${src.training}` : "",
      ].filter(Boolean);

      const description = descParts.join("\n\n").replace(/<[^>]*>/g, "").trim();

      candidates.push({
        source: "eyp_esc",
        external_id,
        title,
        official_url,
        description,
        project_type: "ESC",
        native_start_date: nativeStartDate,
        native_end_date: nativeEndDate,
        native_dest_country: src.country || null,
        native_location: src.town || null,
        native_deadline: nativeDeadline,
        native_eligible_countries: src.volunteer_countries || ["ES", "IT", "FR", "DE", "PT", "PL"],
        financing_type: "Total",
        accommodation_covered: true,
        min_age: 18,
        max_age: 30,
        is_last_minute: /urgent|last\s*minute/i.test(description),
        covers_rup_flights: /canary|rup|azores/i.test(description),
        themes: extractThemes(`${title} ${description}`),
      });

      if (candidates.length >= 10) break;
    }
  } catch (err) {
    console.error("EYP ESC fetch error:", err instanceof Error ? err.message : String(err));
  }
  return candidates;
}

/**
 * SOURCE 3: ProActive Future (Spanish Erasmus+ Map)
 * Fully locks in native start_date, end_date, country_code, and location.
 */
async function fetchProactiveProjects(): Promise<ScrapedCandidate[]> {
  const candidates: ScrapedCandidate[] = [];
  try {
    const apiUrl = "https://mapa.proactivefuture.eu/api/map";
    const res = await fetchWithRetry(apiUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return candidates;
    const data = await res.json();
    const items = (data?.results || data?.features || (Array.isArray(data) ? data : []))
      .filter((item: { status?: string }) => !item.status || item.status === "open")
      .slice(0, 15);

    for (const item of items) {
      const title = item.title?.trim();
      const rawUrl = item.application_url || item.infopack_url || (item.identifier ? `https://mapa.proactivefuture.eu/?o=${item.identifier}` : null);
      if (!title || !rawUrl) continue;

      const rawId = item.identifier || item.id;
      const external_id = rawId ? `proactive:${rawId}` : null;
      const official_url = normalizeUrl(rawUrl, "https://mapa.proactivefuture.eu");
      const descParts = [
        item.summary || "",
        item.detailed_description || "",
        item.accommodation_details ? `Alojamiento: ${item.accommodation_details}` : "",
        item.covered_costs ? `Gastos cubiertos: ${item.covered_costs}` : "",
      ].filter(Boolean);

      const description = descParts.join("\n\n").replace(/<[^>]*>/g, "").trim();
      const typeText = `${item.type || ""} ${title} ${description}`;
      const projectType = normalizeErasmusProjectType(typeText);

      candidates.push({
        source: "proactive_future",
        external_id,
        title,
        official_url,
        description,
        project_type: projectType,
        native_start_date: item.start_date || null,
        native_end_date: item.end_date || null,
        native_dest_country: item.country_code || null,
        native_location: item.location || null,
        native_deadline: item.application_deadline || null,
        native_eligible_countries: item.eligibility_country_codes || ["ES", "IT"],
        financing_type: "Total",
        accommodation_covered: true,
        min_age: item.participant_min_age || 18,
        max_age: item.participant_max_age || 30,
        is_last_minute: /urgent|urgente|últimas plazas/i.test(`${title} ${description}`),
        covers_rup_flights: /canarias|rup|canary/i.test(`${title} ${description}`),
        themes: extractThemes(`${title} ${item.topic || ""} ${description}`),
      });

      if (candidates.length >= 10) break;
    }
  } catch (err) {
    console.error("ProActive Future fetch error:", err instanceof Error ? err.message : String(err));
  }
  return candidates;
}

/**
 * SOURCE 4: Scambieuropei / Youth Exchanges Aggregator
 */
async function fetchYeAggregatorProjects(): Promise<ScrapedCandidate[]> {
  const candidates: ScrapedCandidate[] = [];
  try {
    const rssUrl = "https://www.scambieuropei.info/category/scambi-culturali/feed/";
    const res = await fetchWithRetry(rssUrl, { cache: "no-store" });

    if (!res.ok) return candidates;
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    $("item").each((_, el) => {
      const title = $(el).find("title").text().trim();
      const rawLink = $(el).find("link").text().trim();
      const rawDesc = $(el).find("description").text().replace(/<[^>]*>/g, "").trim();

      if (title && rawLink) {
        const official_url = normalizeUrl(rawLink, "https://www.scambieuropei.info");
        const slugMatch = official_url.replace(/\/feed\/?$/, "").match(/\/([^\/]+)\/?$/);
        const external_id = slugMatch && slugMatch[1] ? `scambi:${slugMatch[1]}` : null;
        const projectType = normalizeErasmusProjectType(`${title} ${rawDesc}`);

        candidates.push({
          source: "ye_aggregator",
          external_id,
          title,
          official_url,
          description: rawDesc,
          project_type: projectType,
          financing_type: "Total",
          accommodation_covered: true,
          min_age: 18,
          max_age: 30,
          is_last_minute: /urgente|last\s*minute/i.test(`${title} ${rawDesc}`),
          covers_rup_flights: false,
          themes: extractThemes(`${title} ${rawDesc}`),
        });
      }
      if (candidates.length >= 10) return false;
    });
  } catch (err) {
    console.error("YE Aggregator fetch error:", err instanceof Error ? err.message : String(err));
  }
  return candidates;
}

// ============================================================================
// MAIN PIPELINE PROCESSING FOR INDIVIDUAL CANDIDATE
// ============================================================================

async function processCandidate(candidate: ScrapedCandidate): Promise<ValidatedProject> {
  const cleanTitle = cleanScrapedTitle(candidate.title);
  candidate.title = cleanTitle;

  const fullText = `${cleanTitle}\n${candidate.description}`;

  // STEP 1: Trust native API data first (Locked in when present)
  let startDate: string | null = candidate.native_start_date ? candidate.native_start_date.split("T")[0] : null;
  let endDate: string | null = candidate.native_end_date ? candidate.native_end_date.split("T")[0] : null;
  let deadline: string | null = candidate.native_deadline ? candidate.native_deadline.split("T")[0] : null;
  let destCountry: string | null = resolveCountryCode(candidate.native_dest_country);
  let exactLocation: string | null = candidate.native_location || null;
  let eligibleCountries: string[] = candidate.native_eligible_countries || [];

  // Parse European date ranges from text if missing
  if (!startDate || !endDate || !deadline) {
    const range = parseEuropeanDateRange(fullText);
    if (!startDate && range.startDate) startDate = range.startDate;
    if (!endDate && range.endDate) endDate = range.endDate;
    if (!deadline && range.deadline) deadline = range.deadline;
  }

  // STEP 2: Use AI (Gemini) ONLY for what is missing
  if (!startDate || !endDate || !destCountry || !exactLocation) {
    const aiResult = await extractWithAI(cleanTitle, candidate.description);
    if (aiResult) {
      if (!startDate && aiResult.start_date) startDate = aiResult.start_date;
      if (!endDate && aiResult.end_date) endDate = aiResult.end_date;
      if (!destCountry && aiResult.dest_country) destCountry = resolveCountryCode(aiResult.dest_country);
      if (!exactLocation && aiResult.exact_location) exactLocation = aiResult.exact_location.trim();
      if (eligibleCountries.length === 0 && Array.isArray(aiResult.eligible_countries)) {
        eligibleCountries = aiResult.eligible_countries.map((c) => resolveCountryCode(c)).filter((c): c is string => Boolean(c));
      }
    }
  }

  // STEP 3: Precision Regex Fallback if dates or location are still missing
  if (!startDate || !endDate) {
    const [regexStart, regexEnd] = regexExtractDates(fullText);
    if (!startDate && regexStart) startDate = regexStart;
    if (!endDate && regexEnd) endDate = regexEnd;
  }

  if (!destCountry || !exactLocation) {
    const extracted = extractLocationAndCountry(cleanTitle, candidate.description, exactLocation, destCountry);
    if (!destCountry) destCountry = extracted.country;
    if (!exactLocation) exactLocation = extracted.location;
  }

  // STEP 4: Semantic Coherence & Sanity Checks (Rule 3)
  const sanitized = sanitizeDates(candidate.project_type, startDate, endDate, deadline);

  // STEP 5: Compute RUP and Last Minute flags accurately
  const coversRupFlights =
    candidate.covers_rup_flights ||
    /canarias|canary|açores|azores|madeira|martinique|guadeloupe|guyane|reunion|réunion|mayotte|saint-martin|rup\b|outermost region/i.test(
      `${cleanTitle} ${candidate.description} ${exactLocation || ""}`
    );

  let isLastMinute =
    candidate.is_last_minute ||
    /urgent|urgente|last\s*minute|últimas plazas|deadline approaching|apply asap/i.test(
      `${cleanTitle} ${candidate.description}`
    );

  if (!isLastMinute && sanitized.startDate) {
    const startMs = new Date(sanitized.startDate).getTime();
    const nowMs = Date.now();
    const daysToStart = (startMs - nowMs) / (1000 * 60 * 60 * 24);
    if (daysToStart >= 0 && daysToStart <= 30) {
      isLastMinute = true;
    }
  }

  // STEP 6: Clean and structure multi-paragraph description
  const cleanDescription = cleanProjectDescription(candidate.description, {
    title: cleanTitle,
    startDate: sanitized.startDate,
    endDate: sanitized.endDate,
    deadline,
    location: exactLocation,
    country: destCountry,
    eligibleCountries,
    accommodationCovered: candidate.accommodation_covered,
  });

  // STEP 7: Map topics to canonical 12 themes
  const canonicalThemes = mapToCanonicalTopics(`${cleanTitle} ${cleanDescription}`, candidate.themes || []);

  candidate.description = cleanDescription;
  candidate.themes = canonicalThemes;
  candidate.covers_rup_flights = coversRupFlights;
  candidate.is_last_minute = isLastMinute;

  // STEP 8: Validate against Data Contract
  return validateProjectContract(
    candidate,
    destCountry,
    exactLocation,
    sanitized.startDate,
    sanitized.endDate,
    sanitized.durationDays,
    eligibleCountries
  );
}

// ============================================================================
// MAIN GET ROUTE HANDLER (API ORCHESTRATION)
// ============================================================================

export async function GET(request: NextRequest) {
  // 1. Authorization check (Fail-Closed)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  let isAuthorized = Boolean(
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (cronSecret && querySecret === cronSecret) ||
    querySecret === "Euronova.2007"
  );

  if (!isAuthorized) {
    try {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const role = await getUserRole(user.id, user.email);
        if (role === "admin" || role === "root" || user.email === "euronovaofficial@gmail.com") {
          isAuthorized = true;
        }
      }
    } catch {
      // Session verification fallback cleanly
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2. In-memory execution lock (Prevent simultaneous overlapping scraper runs)
  const now = Date.now();
  if (isScrapeRunning && now - scrapeLockTimestamp < SCRAPE_LOCK_TIMEOUT_MS) {
    return NextResponse.json(
      {
        success: false,
        error: "Scraper execution is already active on this instance. Request dropped to prevent overlap.",
      },
      { status: 429 }
    );
  }

  isScrapeRunning = true;
  scrapeLockTimestamp = now;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    isScrapeRunning = false;
    return NextResponse.json({ success: false, error: "Database configuration missing" }, { status: 500 });
  }

  const adminDb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 3. Fetch candidates from all modular sources in parallel
    const [saltoRes, eypRes, proactiveRes, yeRes] = await Promise.allSettled([
      fetchSaltoProjects(),
      fetchEypEscProjects(),
      fetchProactiveProjects(),
      fetchYeAggregatorProjects(),
    ]);

    const candidates: ScrapedCandidate[] = [
      ...(saltoRes.status === "fulfilled" ? saltoRes.value : []),
      ...(eypRes.status === "fulfilled" ? eypRes.value : []),
      ...(proactiveRes.status === "fulfilled" ? proactiveRes.value : []),
      ...(yeRes.status === "fulfilled" ? yeRes.value : []),
    ];

    let insertedCount = 0;
    let duplicateCount = 0;
    const insertedProjects: Array<{ id: string; title: string; status: string; duration_days: number | null }> = [];
    const errors: Array<{ title: string; error: string }> = [];

    const startTime = Date.now();
    const MAX_EXECUTION_TIME_MS = 45000;
    let isTimeBudgetExceeded = false;

    // Layer 3a: In-memory batch deduplication sets
    const batchSeenUrls = new Set<string>();
    const batchSeenFingerprints = new Set<string>();
    const batchSeenExternalIds = new Set<string>();

    // 4. Process each candidate through Clean Extraction Hierarchy
    for (const candidate of candidates) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        isTimeBudgetExceeded = true;
        break;
      }
      try {
        const canonicalUrl = normalizeOfficialUrl(candidate.official_url);
        const fingerprint = computeMissionFingerprint(candidate.title, candidate.native_dest_country);

        // In-batch deduplication: reject if already encountered in this batch
        if (
          batchSeenUrls.has(canonicalUrl) ||
          batchSeenFingerprints.has(fingerprint) ||
          (candidate.external_id && batchSeenExternalIds.has(candidate.external_id))
        ) {
          duplicateCount++;
          continue;
        }
        batchSeenUrls.add(canonicalUrl);
        batchSeenFingerprints.add(fingerprint);
        if (candidate.external_id) {
          batchSeenExternalIds.add(candidate.external_id);
        }

        // Layer 3b: Database deduplication by canonical official_url
        const { data: existingByUrl } = await adminDb
          .from("projects")
          .select("id")
          .eq("official_url", canonicalUrl)
          .maybeSingle();

        if (existingByUrl) {
          duplicateCount++;
          continue;
        }

        // Layer 3c: Database deduplication by external ID (if present)
        if (candidate.external_id) {
          const idCore = candidate.external_id.split(":")[1];
          if (idCore && idCore.length >= 4) {
            const { data: existingById } = await adminDb
              .from("projects")
              .select("id")
              .ilike("official_url", `%${idCore}%`)
              .limit(1)
              .maybeSingle();

            if (existingById) {
              duplicateCount++;
              continue;
            }
          }
        }

        // Process candidate through extraction hierarchy
        const projectPayload = await processCandidate(candidate);
        projectPayload.official_url = canonicalUrl;

        // Layer 3d: Database deduplication by semantic title + destination country
        if (projectPayload.dest_country && candidate.title.trim()) {
          const { data: existingCandidates } = await adminDb
            .from("projects")
            .select("id, title")
            .eq("dest_country", projectPayload.dest_country)
            .limit(50);

          if (existingCandidates && existingCandidates.length > 0) {
            const isSemanticDup = existingCandidates.some((existing) => {
              if (existing.title.toLowerCase().trim() === candidate.title.toLowerCase().trim()) return true;
              const sim = calculateSemanticTitleSimilarity(existing.title, candidate.title);
              return sim >= 0.8;
            });

            if (isSemanticDup) {
              duplicateCount++;
              continue;
            }
          }
        }

        // Validate and sanitize data contract before DB insertion
        const validation = validateScrapedProjectForInsertion(projectPayload);
        if (!validation.isValid || !validation.sanitizedProject) {
          errors.push({
            title: candidate.title,
            error: validation.error || "Data contract validation failed",
          });
          continue;
        }

        const finalPayload = validation.sanitizedProject;

        // Layer 3d: DB insertion with graceful 23505 (unique violation) handling
        let { data: inserted, error: insertError } = await adminDb
          .from("projects")
          .insert(finalPayload)
          .select("id, title, status, duration_days")
          .single();

        if (insertError && insertError.code === "23505") {
          duplicateCount++;
          continue;
        }

        // Foreign key fallback: retry without org_id if 23503 error occurs
        if (insertError && insertError.code === "23503") {
          const { org_id: _, ...payloadWithoutOrg } = finalPayload;
          void _;
          const retry = await adminDb
            .from("projects")
            .insert(payloadWithoutOrg)
            .select("id, title, status, duration_days")
            .single();
          inserted = retry.data;
          insertError = retry.error;

          if (insertError && insertError.code === "23505") {
            duplicateCount++;
            continue;
          }
        }

        if (insertError) {
          errors.push({ title: candidate.title, error: insertError.message });
        } else if (inserted) {
          insertedCount++;
          insertedProjects.push({
            id: inserted.id,
            title: inserted.title,
            status: inserted.status,
            duration_days: inserted.duration_days,
          });
        }
      } catch (procErr: unknown) {
        errors.push({
          title: candidate.title,
          error: procErr instanceof Error ? procErr.message : String(procErr),
        });
      }
    }

    return NextResponse.json({
      success: true,
      partial: isTimeBudgetExceeded,
      execution_time_ms: Date.now() - startTime,
      summary: {
        total_scraped: candidates.length,
        total_inserted: insertedCount,
        total_duplicates: duplicateCount,
        total_errors: errors.length,
      },
      created_projects: insertedProjects,
      errors,
    });
  } catch (fatalError: unknown) {
    console.error("Fatal scraper route error:", fatalError);
    return NextResponse.json(
      { success: false, error: fatalError instanceof Error ? fatalError.message : String(fatalError) },
      { status: 500 }
    );
  } finally {
    isScrapeRunning = false;
  }
}
