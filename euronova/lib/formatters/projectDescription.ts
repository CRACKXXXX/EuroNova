/**
 * EuroNova — Scraped Project Data Normalizer & Description Cleaner
 *
 * Cleans scraped titles, decodes HTML entities, strips duplicated title/date/venue
 * headers mashed into descriptions, structures clean paragraphs, parses
 * European date formats, and maps tags to the 12 canonical themes.
 */

import { PROJECT_THEME_IDS, type ProjectThemeId } from "@/lib/constants/themes";

export interface ProjectMetadata {
  title?: string;
  startDate?: string | null;
  endDate?: string | null;
  deadline?: string | null;
  location?: string | null;
  country?: string | null;
  eligibleCountries?: string[] | null;
  accommodationCovered?: boolean;
}

const MONTH_NAMES_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  gennaio: 1, febbraio: 2, marzo_it: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto_it: 8, settembre_it: 9, ottobre_it: 10, novembre_it: 11, dicembre_it: 12,
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre_fr: 9, octobre_fr: 10, novembre_fr: 11, decembre: 12, décembre: 12,
  januar: 1, februar: 2, marz: 3, märz: 3, juni: 6, juli: 7, oktober: 10, dezember: 12,
};

/**
 * Decodes all HTML entities (named and numeric).
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&euro;/gi, "€")
    .replace(/&pound;/gi, "£")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&bull;/gi, "•")
    .replace(/&hellip;/gi, "...")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return "";
      }
    });
}

/**
 * Cleans title by removing redundant prefixes and date/type junk.
 */
export function cleanScrapedTitle(rawTitle: string): string {
  if (!rawTitle) return "Erasmus+ Youth Opportunity";

  let title = decodeHtmlEntities(rawTitle).trim();

  // Strip leading tags like [ES], [IT], (ONLINE), etc.
  title = title.replace(/^\[(?:ES|EN|FR|DE|IT|RU|PT|ONLINE|CORPS|ESC|YE|TC)\]\s*[:-]?\s*/i, "");

  // Strip common structural prefixes
  title = title.replace(
    /^(?:Training Course|Youth Exchange|European Solidarity Corps|Volunteering|Call for Participants|Infopack|Curso de Formación|Intercambio Juvenil|Corso di Formazione|Scambio Giovanile)\s*[:\-\u2013\u2014]\s*/i,
    ""
  );

  // Strip leading date stamps: "26/10/2026 - Title" or "2026-10-26 Title"
  title = title.replace(/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*[:\-\u2013\u2014]?\s*/, "");
  title = title.replace(/^\d{4}-\d{2}-\d{2}\s*[:\-\u2013\u2014]?\s*/, "");

  title = title.replace(/\s+/g, " ").trim();
  return title || "Erasmus+ Youth Opportunity";
}

/**
 * Parses European dates from various formats to standard YYYY-MM-DD.
 */
function parseDateParts(d: number, m: number, y: number): string | null {
  const currentYear = new Date().getFullYear();
  let fullYear = y;
  if (y < 100) {
    fullYear = y < 50 ? 2000 + y : 1900 + y;
  }
  if (fullYear < currentYear - 2 || fullYear > currentYear + 10) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  // Validate exact days in month (prevents Feb 30/31, April 31, etc.)
  const daysInMonth = new Date(fullYear, m, 0).getDate();
  if (d > daysInMonth) return null;

  return `${fullYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Normalizes all strange Erasmus acronyms and program codes into the canonical 8 types.
 */
export type CanonicalProjectType = "YE" | "TC" | "ESC" | "PBA" | "SV" | "SE" | "VET" | "CBY";

export function normalizeErasmusProjectType(rawTypeOrText: string): CanonicalProjectType {
  if (!rawTypeOrText) return "YE";
  const text = rawTypeOrText.toUpperCase();

  // 1. ESC / Solidarity Corps (ESC, ESC-50, ESC-51, ESC-11, ESC-HUM, etc.)
  if (/\bESC(?:[-_\s]?\d+|[-_\s]?HUM)?\b|SOLIDARITY|VOLUNTEER|VOLUNTARI/i.test(text)) {
    return "ESC";
  }

  // 2. Training Course / TCA (TC, TCA, KA153, Training, Formación, Corso)
  if (/\b(?:TCA|TC|KA153)\b|TRAINING|FORMACI[OÓ]N|CORSO DI FORMAZIONE/i.test(text)) {
    return "TC";
  }

  // 3. Partnership Building Activity (PBA, KA2, KA210, KA220, Partnership)
  if (/\b(?:PBA|KA2|KA210|KA220)\b|PARTNERSHIP|PARTNER BUILDING/i.test(text)) {
    return "PBA";
  }

  // 4. Vocational Education and Training (VET, FP)
  if (/\b(?:VET|FP)\b|VOCATIONAL|FORMACI[OÓ]N PROFESIONAL/i.test(text)) {
    return "VET";
  }

  // 5. Study Visit (SV)
  if (/\bSV\b|STUDY VISIT|VISITA DE ESTUDIO/i.test(text)) {
    return "SV";
  }

  // 6. Seminar (SE)
  if (/\bSE\b|SEMINAR|SEMINARIO/i.test(text)) {
    return "SE";
  }

  // 7. Capacity Building in Youth (CBY)
  if (/\bCBY\b|CAPACITY BUILDING|DESARROLLO DE CAPACIDADES/i.test(text)) {
    return "CBY";
  }

  // 8. Youth Exchange (YE, KA152, Youth Exchange, Intercambio)
  if (/\b(?:YE|KA152)\b|YOUTH EXCHANGE|INTERCAMBIO JUVENIL|SCAMBIO GIOVANILE/i.test(text)) {
    return "YE";
  }

  return "YE";
}

/**
 * Parses European date ranges and deadlines from unstructured text.
 */
export function parseEuropeanDateRange(text: string): {
  startDate: string | null;
  endDate: string | null;
  deadline: string | null;
} {
  const clean = decodeHtmlEntities(text);
  let startDate: string | null = null;
  let endDate: string | null = null;
  let deadline: string | null = null;

  // 1. Extract deadline if explicitly marked
  const deadlineMatch = clean.match(
    /(?:deadline|limite|fecha límite|date limite|bewerbungsfrist|scadenza|apply before|solicitudes hasta)[:\s]+(\d{1,2})[\s./-]+([a-záéíóúñA-Z]+|\d{1,2})[\s./-]+(\d{2,4})/i
  );
  if (deadlineMatch) {
    const day = parseInt(deadlineMatch[1], 10);
    const monthStr = deadlineMatch[2].toLowerCase();
    const year = parseInt(deadlineMatch[3], 10);
    const month = MONTH_NAMES_MAP[monthStr] || parseInt(monthStr, 10);
    if (!isNaN(month)) {
      deadline = parseDateParts(day, month, year);
    }
  }

  // 2. Pattern: "DD Month - DD Month YYYY" or "DD Month YYYY - DD Month YYYY"
  const rangePattern1 = /(\d{1,2})(?:st|nd|rd|th)?\s+([a-záéíóúñA-Z]+)(?:\s+(\d{4}))?(?:\s*[-–—]\s*|\s+(?:to|al|au|bis|a|until)\s+)(\d{1,2})(?:st|nd|rd|th)?\s+([a-záéíóúñA-Z]+)\s+(\d{4})/i;
  const match1 = clean.match(rangePattern1);
  if (match1) {
    const startDay = parseInt(match1[1], 10);
    const startMonth = MONTH_NAMES_MAP[match1[2].toLowerCase()];
    const endYear = parseInt(match1[6], 10);
    const startYear = match1[3] ? parseInt(match1[3], 10) : endYear;
    const endDay = parseInt(match1[4], 10);
    const endMonth = MONTH_NAMES_MAP[match1[5].toLowerCase()];

    if (startMonth && endMonth) {
      startDate = parseDateParts(startDay, startMonth, startYear);
      endDate = parseDateParts(endDay, endMonth, endYear);
    }
  }

  // 3. Pattern: "DD - DD Month YYYY" (same month)
  if (!startDate || !endDate) {
    const rangePattern2 = /(\d{1,2})(?:\s*[-–—]\s*|\s+(?:to|al|au|bis|a|until)\s+)(\d{1,2})(?:st|nd|rd|th)?\s+([a-záéíóúñA-Z]+)\s+(\d{4})/i;
    const match2 = clean.match(rangePattern2);
    if (match2) {
      const startDay = parseInt(match2[1], 10);
      const endDay = parseInt(match2[2], 10);
      const month = MONTH_NAMES_MAP[match2[3].toLowerCase()];
      const year = parseInt(match2[4], 10);

      if (month) {
        startDate = parseDateParts(startDay, month, year);
        endDate = parseDateParts(endDay, month, year);
      }
    }
  }

  // 4. Numeric pattern: "DD/MM/YYYY - DD/MM/YYYY" or "DD.MM.YYYY to DD.MM.YYYY"
  if (!startDate || !endDate) {
    const rangePattern3 = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s*[-–—]\s*|\s+(?:to|al|au|bis|a|until)\s+)(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/i;
    const match3 = clean.match(rangePattern3);
    if (match3) {
      startDate = parseDateParts(parseInt(match3[1], 10), parseInt(match3[2], 10), parseInt(match3[3], 10));
      endDate = parseDateParts(parseInt(match3[4], 10), parseInt(match3[5], 10), parseInt(match3[6], 10));
    }
  }

  // 5. ISO pattern: "YYYY-MM-DD - YYYY-MM-DD"
  if (!startDate || !endDate) {
    const rangePattern4 = /(\d{4}-\d{2}-\d{2})(?:\s*[-–—]\s*|\s+(?:to|al|au|bis|a|until)\s+)(\d{4}-\d{2}-\d{2})/;
    const match4 = clean.match(rangePattern4);
    if (match4) {
      startDate = match4[1];
      endDate = match4[2];
    }
  }

  return { startDate, endDate, deadline };
}

/**
 * Escapes all regular expression metacharacters to safely construct RegExp instances.
 */
export function escapeRegExp(str: string): string {
  if (!str) return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes and formats the project description:
 * - Strips concatenated title/date/venue headers from the beginning.
 * - Formats multi-paragraph structure.
 * - Appends structured details if missing.
 */
export function cleanProjectDescription(
  rawText: string,
  meta?: ProjectMetadata,
  fallbackText: string = ""
): string {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return fallbackText;
  }

  let text = decodeHtmlEntities(rawText);

  // Normalize Unicode invisible characters & non-breaking spaces
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  text = text.replace(/[\u00A0\u202F\u2007]/g, " ");

  // Convert HTML linebreaks to real newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n\n");
  text = text.replace(/<[^>]+>/g, " ");

  // Normalize multiple spaces into single space per line
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");

  // Collapse 3+ newlines into 2
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Multi-pass greedy header stripping (up to 3 passes to clean stacked banners)
  for (let pass = 0; pass < 3; pass++) {
    // 1. Strip leading decorative banners and symbols: ***, ###, ///, ===, ---, ~~~, |||
    text = text.replace(/^\s*(?:[*#=~_|\/\-]{2,}\s*)+/g, "").trim();

    // 2. Strip concatenated title from start if present
    if (meta?.title) {
      const cleanTitleTrimmed = meta.title.trim();
      if (text.toLowerCase().startsWith(cleanTitleTrimmed.toLowerCase())) {
        text = text.slice(cleanTitleTrimmed.length).trim();
      } else {
        const normTitle = cleanTitleTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        const textSample = text.slice(0, cleanTitleTrimmed.length + 40).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (normTitle && textSample.startsWith(normTitle)) {
          let charCount = 0;
          let cutIdx = 0;
          const targetAlnum = cleanTitleTrimmed.replace(/[^a-zA-Z0-9]/g, "").length;
          for (let i = 0; i < text.length && charCount < targetAlnum; i++) {
            if (/[a-zA-Z0-9]/.test(text[i])) {
              charCount++;
            }
            cutIdx = i + 1;
          }
          text = text.slice(cutIdx).trim();
        } else {
          // Check for unspaced title concatenation (e.g. "TitleThe project...")
          const rawAlnumTitle = cleanTitleTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
          const rawAlnumText = text.slice(0, cleanTitleTrimmed.length + 10).toLowerCase().replace(/[^a-z0-9]/g, "");
          if (rawAlnumTitle && rawAlnumText.startsWith(rawAlnumTitle)) {
            let count = 0;
            let cutPos = 0;
            for (let i = 0; i < text.length && count < rawAlnumTitle.length; i++) {
              if (/[a-zA-Z0-9]/.test(text[i])) count++;
              cutPos = i + 1;
            }
            text = text.slice(cutPos).trim();
          }
        }
      }

      // Safe regex title prefix stripping with full metacharacter escaping
      const escapedTitle = escapeRegExp(cleanTitleTrimmed);
      if (escapedTitle) {
        try {
          const titleRegex = new RegExp(`^\\s*${escapedTitle}[:\\-\\s]*`, "i");
          text = text.replace(titleRegex, "").trim();
        } catch {
          // Safe non-blocking fallback
        }
      }
    }

    // 3. Strip concatenated date headers like "26 October - 30 November 2026" or "10/05/2026 to 20/05/2026"
    text = text.replace(
      /^\s*(?:Dates?|Fechas?|Periodo|When)?[:\s]*\d{1,2}(?:st|nd|rd|th)?\s+[a-záéíóúñA-Z]+\s*(?:[-–—]|\s+(?:to|al|au|bis|a|until)\s+)?\s*(?:\d{1,2}(?:st|nd|rd|th)?\s+[a-záéíóúñA-Z]+)?\s+\d{4}[,.\s-]*/i,
      ""
    ).trim();
    text = text.replace(
      /^\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*(?:[-–—]|\s+(?:to|al|au|bis|a|until)\s+)\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}[,.\s-]*/i,
      ""
    ).trim();

    // 4. Strip venue prefixes matching location/country safely
    if (meta?.location) {
      const locEscaped = escapeRegExp(meta.location.trim());
      if (locEscaped) {
        try {
          const locReg = new RegExp(
            `^\\s*(?:Venue|Location|Lugar|Where)?[:\\s]*${locEscaped}(?:\\s*,\\s*[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)?)?[,.\\s-]*`,
            "i"
          );
          text = text.replace(locReg, "").trim();
        } catch {
          // Safe fallback
        }
      }
    }

    if (meta?.country) {
      const countryEscaped = escapeRegExp(meta.country.trim());
      if (countryEscaped) {
        try {
          const countryReg = new RegExp(
            `^\\s*(?:Country|País|Destination)?[:\\s]*${countryEscaped}[,.\\s-]*`,
            "i"
          );
          text = text.replace(countryReg, "").trim();
        } catch {
          // Safe fallback
        }
      }
    }

    // 5. Strip residual leading separator noise
    text = text.replace(/^[:\-\u2013\u2014|*#=~/\\]+\s*/, "").trim();
  }

  // Ensure paragraphs have proper structure
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Clean and bold common headings if they exist in text
  text = text
    .replace(/(?:^|\n)(Alojamiento y manutenci[oó]n|Alojamiento|Accommodation & Food|Accommodation|Boarding arrangements)[:\s]*/gi, "\n\n**Accommodation & Food:** ")
    .replace(/(?:^|\n)(Perfil de los participantes|Target group|Participant profile|Who can apply|Eligibility)[:\s]*/gi, "\n\n**Eligibility & Participant Profile:** ")
    .replace(/(?:^|\n)(Objetivos|Objectives|Project goals)[:\s]*/gi, "\n\n**Project Objectives:** ")
    .replace(/(?:^|\n)(Condiciones financieras|Financial conditions|Travel reimbursement)[:\s]*/gi, "\n\n**Financial Conditions & Travel Reimbursement:** ")
    .replace(/(?:^|\n)(Fecha l[ií]mite|Application deadline|Deadline)[:\s]*/gi, "\n\n**Application Deadline:** ");

  // Append structured metadata if not already mentioned in text
  const additions: string[] = [];

  if (meta?.eligibleCountries && meta.eligibleCountries.length > 0 && !text.includes("**Eligibility")) {
    additions.push(`**Eligible Countries:** ${meta.eligibleCountries.join(", ")}`);
  }

  if (meta?.accommodationCovered && !text.includes("**Accommodation")) {
    additions.push(`**Accommodation & Food:** 100% covered by the Erasmus+ / European Solidarity Corps funding.`);
  }

  if (meta?.deadline && !text.includes("**Application Deadline")) {
    additions.push(`**Application Deadline:** ${meta.deadline}`);
  }

  if (additions.length > 0) {
    text = `${text}\n\n${additions.join("\n\n")}`;
  }

  return text.trim() || fallbackText;
}

/**
 * Intelligent mapping from unstructured tags/text into the 12 canonical theme IDs.
 */
export function mapToCanonicalTopics(text: string, existingTopics: string[] = []): string[] {
  const matched = new Set<ProjectThemeId>();
  const lower = `${text} ${existingTopics.join(" ")}`.toLowerCase();

  // Check existing canonical matches
  for (const tid of PROJECT_THEME_IDS) {
    if (existingTopics.includes(tid)) {
      matched.add(tid);
    }
  }

  // Semantic keyword mapping
  if (/environment|clima|climate|sostenib|sustainab|ecol|green|verde|nature|naturaleza|zerowaste/i.test(lower)) {
    matched.add("environment");
  }
  if (/digital|tech|coding|comput|ai\b|ia\b|software|cyber|internet|stem/i.test(lower)) {
    matched.add("digital");
  }
  if (/inclusion|inclusi|equality|igualdad|disab|discapacidad|marginal|refugee|migra|vulnerab|\b(?:esc|solidarity)\b/i.test(lower)) {
    matched.add("inclusion");
  }
  if (/mental health|salud mental|wellbeing|bienestar|psychol|mindful|stress|ansiedad/i.test(lower)) {
    matched.add("mental_health");
  }
  if (/art\b|arte|theatre|teatro|music|música|dance|danza|culture|cultura|cinema|painting/i.test(lower)) {
    matched.add("arts_culture");
  }
  if (/sport|deporte|fitness|outdoor|hiking|cycling|health|salud/i.test(lower)) {
    matched.add("sports");
  }
  if (/human rights|derechos humanos|peace|paz|justice|justicia|equality|law|conflict/i.test(lower)) {
    matched.add("human_rights");
  }
  if (/entrepreneur|emprend|startup|business|negocio|career|empleo|employment|job|\b(?:vet|fp)\b/i.test(lower)) {
    matched.add("entrepreneurship");
  }
  if (/civic|citizenship|ciudadanía|democra|voting|participa|eu policy|parliament|\b(?:pba|tca|ka2|cby|se)\b/i.test(lower)) {
    matched.add("civic_participation");
  }
  if (/media|journalism|periodismo|fake news|disinformation|communication|podcast|press/i.test(lower)) {
    matched.add("media_literacy");
  }
  if (/rural|campo|village|agricultur|nature|farming|pueblo|remote area/i.test(lower)) {
    matched.add("rural_development");
  }
  if (/heritage|patrimonio|history|historia|intercultural|tradition|archaeol|\b(?:sv)\b/i.test(lower)) {
    matched.add("heritage");
  }

  // Fallback: at least 1 topic
  if (matched.size === 0) {
    matched.add("inclusion");
  }

  return Array.from(matched);
}

// ============================================================================
// DEDUPLICATION & SEMANTIC SIMILARITY HELPERS
// ============================================================================

export const COMMON_STOP_WORDS = new Set([
  "youth", "exchange", "training", "course", "erasmus", "solidarity", "corps",
  "esc", "tc", "ye", "pba", "tca", "vet", "cby", "sv", "se", "project", "mobility",
  "intercambio", "juvenil", "formacion", "formación", "curso", "formazione", "scambio",
  "voluntariado", "volunteering", "the", "and", "for", "in", "on", "at", "to",
  "de", "del", "en", "para", "por", "con", "di", "per", "und", "von",
  "der", "die", "das", "pour", "dans", "des", "les", "une", "call", "participants",
  "infopack", "spain", "italy", "france", "germany", "online", "application",
  "europe", "european", "europa", "europeo", "europea", "europei", "européen",
  "européenne", "europäische", "europäischer", "international", "internacional",
]);

/**
 * Extracts canonical external ID from official European portal URLs.
 */
export function extractPortalExternalId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);

    // 1. SALTO-YOUTH European Training Calendar: .../training/slug.12345/
    if (parsed.hostname.includes("salto-youth.net")) {
      const saltoMatch = parsed.pathname.match(/\/training\/[^\/]*?\.(\d+)(?:\/|$)/i);
      if (saltoMatch) return `salto:${saltoMatch[1]}`;
    }

    // 2. European Youth Portal (EYP ESC): /solidarity/placement/12345_en
    if (parsed.hostname.includes("youth.europa.eu")) {
      const eypMatch = parsed.pathname.match(/\/solidarity\/placement\/([a-zA-Z0-9_\-]+?)(?:_[a-z]{2})?(?:\/|$)/i);
      if (eypMatch) return `eyp:${eypMatch[1]}`;
    }

    // 3. ProActive Future: ?o=12345 or /api/map
    if (parsed.hostname.includes("proactivefuture.eu")) {
      const idParam = parsed.searchParams.get("o") || parsed.searchParams.get("id");
      if (idParam) return `proactive:${idParam.trim()}`;
    }

    // 4. Scambieuropei / Aggregators: canonical trailing slug
    if (parsed.hostname.includes("scambieuropei.info")) {
      const slugMatch = parsed.pathname.replace(/\/feed\/?$/, "").match(/\/([^\/]+)\/?$/);
      if (slugMatch && slugMatch[1] && slugMatch[1] !== "category") {
        return `scambi:${slugMatch[1]}`;
      }
    }
  } catch {
    // Malformed URL handled gracefully
  }
  return null;
}

/**
 * Normalizes title into distinctive semantic tokens (removing stop words).
 */
export function extractDistinctiveTokens(title: string): string[] {
  if (!title) return [];
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

  const words = normalized.split(/\s+/).filter(Boolean);
  const distinctive = words.filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w));
  return Array.from(new Set(distinctive)).sort();
}

/**
 * Calculates Jaccard token similarity (0.0 to 1.0) between two titles.
 */
export function calculateSemanticTitleSimilarity(titleA: string, titleB: string): number {
  const tokensA = new Set(extractDistinctiveTokens(titleA));
  const tokensB = new Set(extractDistinctiveTokens(titleB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersectionCount++;
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}
