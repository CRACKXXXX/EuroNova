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

  return `${fullYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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
 * Normalizes and formats the project description:
 * - Strips concatenated title/date/venue headers from the beginning.
 * - Formats multi-paragraph structure.
 * - Appends structured details if missing.
 */
export function cleanProjectDescription(
  rawText: string,
  meta?: ProjectMetadata
): string {
  if (!rawText) return "Explore this verified European youth opportunity.";

  let text = decodeHtmlEntities(rawText);

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

  // Strip concatenated title from start if present
  if (meta?.title) {
    const cleanTitleTrimmed = meta.title.trim();
    if (text.toLowerCase().startsWith(cleanTitleTrimmed.toLowerCase())) {
      text = text.slice(cleanTitleTrimmed.length).trim();
    } else {
      const normTitle = cleanTitleTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ");
      const textSample = text.slice(0, cleanTitleTrimmed.length + 30).toLowerCase().replace(/[^a-z0-9]+/g, " ");
      if (textSample.startsWith(normTitle)) {
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
      }
    }
  }

  // Strip concatenated date headers like "26 October - 30 November 2026" or "10/05/2026 to 20/05/2026"
  text = text.replace(
    /^\s*(?:Dates?|Fechas?|Periodo|When)?[:\s]*\d{1,2}(?:st|nd|rd|th)?\s+[a-záéíóúñA-Z]+\s*(?:[-–—]|\s+(?:to|al|au|bis|a|until)\s+)?\s*(?:\d{1,2}(?:st|nd|rd|th)?\s+[a-záéíóúñA-Z]+)?\s+\d{4}[,.\s-]*/i,
    ""
  ).trim();
  text = text.replace(
    /^\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*(?:[-–—]|\s+(?:to|al|au|bis|a|until)\s+)\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}[,.\s-]*/i,
    ""
  ).trim();

  // Strip venue prefixes matching location/country
  if (meta?.location) {
    const locEscaped = meta.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const locReg = new RegExp(
      `^\\s*(?:Venue|Location|Lugar|Where)?[:\\s]*${locEscaped}(?:\\s*,\\s*[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)?)?[,.\\s-]*`,
      "i"
    );
    text = text.replace(locReg, "").trim();
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

  return text.trim();
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
  if (/inclusion|inclusi|equality|igualdad|disab|discapacidad|marginal|refugee|migra|vulnerab/i.test(lower)) {
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
  if (/entrepreneur|emprend|startup|business|negocio|career|empleo|employment|job/i.test(lower)) {
    matched.add("entrepreneurship");
  }
  if (/civic|citizenship|ciudadanía|democra|voting|participa|eu policy|parliament/i.test(lower)) {
    matched.add("civic_participation");
  }
  if (/media|journalism|periodismo|fake news|disinformation|communication|podcast|press/i.test(lower)) {
    matched.add("media_literacy");
  }
  if (/rural|campo|village|agricultur|nature|farming|pueblo|remote area/i.test(lower)) {
    matched.add("rural_development");
  }
  if (/heritage|patrimonio|history|historia|intercultural|tradition|archaeol/i.test(lower)) {
    matched.add("heritage");
  }

  // Fallback: at least 1 topic
  if (matched.size === 0) {
    matched.add("inclusion");
  }

  return Array.from(matched);
}
