"use server";

import { PROJECT_THEME_IDS, type ProjectThemeId } from "@/lib/constants/themes";

export interface AiSearchFilters {
  q?: string;
  dest?: string[];
  types?: string[];
  themes?: string[];
  rup?: boolean;
  lastMinute?: boolean;
}

export interface AiSearchResult {
  success: boolean;
  filters?: AiSearchFilters;
  summary?: string;
  source?: "gemini" | "deterministic";
  error?: string;
}

/**
 * Multilingual country lookup table for all 7 platform languages:
 * en, es, de, fr, it, ru, pt
 */
const MULTILINGUAL_COUNTRIES: Record<string, string> = {
  // Italy
  "italy": "IT", "italia": "IT", "italien": "IT", "italie": "IT", "италия": "IT", "италии": "IT", "itália": "IT",
  // Spain
  "spain": "ES", "españa": "ES", "spanien": "ES", "espagne": "ES", "испания": "ES", "испании": "ES", "espanha": "ES", "spagna": "ES",
  // Germany
  "germany": "DE", "alemania": "DE", "deutschland": "DE", "allemagne": "DE", "германия": "DE", "германии": "DE", "alemanha": "DE", "germania": "DE",
  // France
  "france": "FR", "francia": "FR", "frankreich": "FR", "франция": "FR", "франции": "FR", "frança": "FR",
  // Portugal
  "portugal": "PT", "portogallo": "PT", "португалия": "PT", "португалии": "PT",
  // Greece
  "greece": "GR", "grecia": "GR", "griechenland": "GR", "grèce": "GR", "греция": "GR", "греции": "GR", "grécia": "GR",
  // Poland
  "poland": "PL", "polonia": "PL", "polen": "PL", "pologne": "PL", "польша": "PL", "польше": "PL", "polónia": "PL",
  // Ireland
  "ireland": "IE", "irlanda": "IE", "irland": "IE", "irlande": "IE", "ирландия": "IE", "ирландии": "IE",
  // Netherlands
  "netherlands": "NL", "holanda": "NL", "países bajos": "NL", "países baixos": "NL", "paesi bassi": "NL", "olanda": "NL", "niederlande": "NL", "pays-bas": "NL", "нидерланды": "NL", "нидерландах": "NL", "hollande": "NL",
  // Belgium
  "belgium": "BE", "bélgica": "BE", "belgien": "BE", "belgique": "BE", "бельгия": "BE", "бельгии": "BE", "belgio": "BE",
  // Austria
  "austria": "AT", "österreich": "AT", "autriche": "AT", "австрия": "AT", "австрии": "AT", "áustria": "AT",
  // Sweden
  "sweden": "SE", "suecia": "SE", "schweden": "SE", "suède": "SE", "швеция": "SE", "швеции": "SE", "suécia": "SE", "svezia": "SE",
  // Norway
  "norway": "NO", "noruega": "NO", "norwegen": "NO", "norvège": "NO", "норвегия": "NO", "норвегии": "NO", "norvegia": "NO",
  // Finland
  "finland": "FI", "finlandia": "FI", "finnland": "FI", "finlande": "FI", "финляндия": "FI", "финляндии": "FI", "finlândia": "FI",
  // Denmark
  "denmark": "DK", "dinamarca": "DK", "dänemark": "DK", "danemark": "DK", "дания": "DK", "дании": "DK", "danimarca": "DK",
  // Czech Republic
  "czechia": "CZ", "chequia": "CZ", "tschechien": "CZ", "чехия": "CZ", "чехии": "CZ", "chéquia": "CZ", "cechia": "CZ", "tchéquie": "CZ", "repubblica ceca": "CZ",
  // Hungary
  "hungary": "HU", "hungria": "HU", "ungarn": "HU", "hongrie": "HU", "венгрия": "HU", "венгрии": "HU", "ungheria": "HU",
  // Romania
  "romania": "RO", "rumania": "RO", "rumänien": "RO", "roumanie": "RO", "румыния": "RO", "румынии": "RO", "roménia": "RO",
  // Bulgaria
  "bulgaria": "BG", "bulgarien": "BG", "болгария": "BG", "болгарии": "BG", "bulgária": "BG",
  // Croatia
  "croatia": "HR", "croacia": "HR", "kroatien": "HR", "croatie": "HR", "хорватия": "HR", "хорватии": "HR", "croácia": "HR", "croazia": "HR",
  // Cyprus
  "cyprus": "CY", "chipre": "CY", "zypern": "CY", "chypre": "CY", "кипр": "CY", "кипре": "CY", "cipro": "CY",
  // Malta
  "malta": "MT", "мальта": "MT", "мальте": "MT",
  // Iceland
  "iceland": "IS", "islandia": "IS", "island": "IS", "islande": "IS", "исландия": "IS", "исландии": "IS", "islândia": "IS", "islanda": "IS",
  // Estonia, Latvia, Lithuania
  "estonia": "EE", "estland": "EE", "estonie": "EE", "эстония": "EE", "эстонии": "EE", "estónia": "EE",
  "latvia": "LV", "letonia": "LV", "lettland": "LV", "lettonie": "LV", "латвия": "LV", "латвии": "LV", "lettonia": "LV", "letónia": "LV",
  "lithuania": "LT", "lituania": "LT", "litauen": "LT", "lituanie": "LT", "литва": "LT", "литве": "LT", "lituânia": "LT",
  // Slovenia, Slovakia
  "slovenia": "SI", "eslovenia": "SI", "slowenien": "SI", "словения": "SI", "словении": "SI", "slovénie": "SI", "eslovénia": "SI",
  "slovakia": "SK", "eslovaquia": "SK", "slowakei": "SK", "словакия": "SK", "словакии": "SK", "slovaquie": "SK", "slovacchia": "SK", "eslováquia": "SK",
  // Turkey
  "turkey": "TR", "turquía": "TR", "türkei": "TR", "turquie": "TR", "турция": "TR", "турции": "TR", "turquia": "TR", "turchia": "TR",
};

/**
 * Multilingual keywords for project types
 */
const MULTILINGUAL_PROJECT_TYPES: Record<string, string> = {
  // Youth Exchange (YE)
  "intercambio": "YE", "youth exchange": "YE", "jugendbegegnung": "YE",
  "échange de jeunes": "YE", "echange de jeunes": "YE", "молодежный обмен": "YE",
  "scambio giovanile": "YE", "scambio": "YE", "intercâmbio": "YE", "intercambio juvenil": "YE",

  // Training Course (TC)
  "formación": "TC", "formacion": "TC", "training": "TC", "trainingskurs": "TC",
  "formation": "TC", "тренинг": "TC", "corso di formazione": "TC",
  "formação": "TC", "capacitación": "TC", "workshop": "TC", "tirocinio": "TC",

  // ESC / European Solidarity Corps
  "voluntariado": "ESC", "volontariato": "ESC", "volunteering": "ESC", "esc": "ESC", "ces": "ESC",
  "freiwilligendienst": "ESC", "corps européen de solidarité": "ESC",
  "corpo europeo di solidarietà": "ESC", "волонтерство": "ESC", "voluntário": "ESC",
  "solidarité": "ESC", "solidarity": "ESC", "solidarietà": "ESC",
};

/**
 * Multilingual keywords for the 12 taxonomy themes
 */
const MULTILINGUAL_THEMES: Record<string, ProjectThemeId> = {
  // Environment
  "environment": "environment", "medioambiente": "environment", "medio ambiente": "environment", "ambiente": "environment",
  "clima": "environment", "climate": "environment", "nature": "environment", "naturaleza": "environment",
  "umwelt": "environment", "environnement": "environment", "écologie": "environment", "ecologia": "environment",
  "sostenibilidad": "environment", "sustainability": "environment", "nachhaltigkeit": "environment", "sostenibilità": "environment",
  "окружающая среда": "environment", "экология": "environment", "meio ambiente": "environment",
  "animaux": "environment", "animals": "environment", "animales": "environment", "tiere": "environment",
  "животные": "environment", "animais": "environment", "marine": "environment", "marino": "environment",
  "ocean": "environment", "océano": "environment",

  // Digital
  "digital": "digital", "tech": "digital", "tecnología": "digital", "tecnologia": "digital",
  "ai": "digital", "ia": "digital", "coding": "digital", "software": "digital",
  "technologie": "digital", "it": "digital", "цифровые навыки": "digital", "технологии": "digital",
  "artificial intelligence": "digital", "inteligencia artificial": "digital",

  // Inclusion
  "inclusión": "inclusion", "inclusion": "inclusion", "inklusion": "inclusion", "inclusione": "inclusion",
  "equality": "inclusion", "igualdad": "inclusion", "égalité": "inclusion", "uguaglianza": "inclusion",
  "disability": "inclusion", "discapacidad": "inclusion", "behinderung": "inclusion", "disabilità": "inclusion",
  "handicap": "inclusion", "инклюзия": "inclusion", "равенство": "inclusion", "inclusão": "inclusion",
  "minorities": "inclusion", "minorías": "inclusion", "refugees": "inclusion", "refugiados": "inclusion",

  // Mental Health
  "salud mental": "mental_health", "mental health": "mental_health", "wellbeing": "mental_health", "salute mentale": "mental_health",
  "bienestar": "mental_health", "psychische gesundheit": "mental_health", "santé mentale": "mental_health", "benessere": "mental_health",
  "bien-être": "mental_health", "психическое здоровье": "mental_health", "благополучие": "mental_health",
  "saúde mental": "mental_health", "psychology": "mental_health", "psicología": "mental_health",

  // Arts & Culture
  "arte": "arts_culture", "cultura": "arts_culture", "art": "arts_culture", "arts": "arts_culture",
  "culture": "arts_culture", "kultur": "arts_culture", "kunst": "arts_culture",
  "theatre": "arts_culture", "teatro": "arts_culture", "music": "arts_culture", "música": "arts_culture", "musica": "arts_culture",
  "искусство": "arts_culture", "культура": "arts_culture", "danza": "arts_culture", "dance": "arts_culture",
  "creativity": "arts_culture", "creatividad": "arts_culture", "creatività": "arts_culture",

  // Sports
  "deporte": "sports", "sport": "sports", "sports": "sports", "fitness": "sports",
  "healthy": "sports", "saludable": "sports", "спорт": "sports", "esporte": "sports", "desporto": "sports",

  // Human Rights
  "derechos humanos": "human_rights", "human rights": "human_rights", "menschenrechte": "human_rights", "diritti umani": "human_rights",
  "droits de l'homme": "human_rights", "peace": "human_rights", "paz": "human_rights",
  "frieden": "human_rights", "paix": "human_rights", "права человека": "human_rights", "мир": "human_rights",
  "direitos humanos": "human_rights", "justice": "human_rights", "justicia": "human_rights", "pace": "human_rights",

  // Entrepreneurship
  "emprendimiento": "entrepreneurship", "entrepreneurship": "entrepreneurship", "startup": "entrepreneurship",
  "business": "entrepreneurship", "empleo": "entrepreneurship", "employment": "entrepreneurship",
  "entreprenariat": "entrepreneurship", "emploi": "entrepreneurship", "предпринимательство": "entrepreneurship",
  "empreendedorismo": "entrepreneurship", "negocios": "entrepreneurship", "imprenditorialità": "entrepreneurship",

  // Civic Participation
  "democracia": "civic_participation", "democracy": "civic_participation", "ciudadanía": "civic_participation", "cittadinanza": "civic_participation",
  "citizenship": "civic_participation", "demokratie": "civic_participation", "démocratie": "civic_participation", "democrazia": "civic_participation",
  "citoyenneté": "civic_participation", "демократия": "civic_participation", "гражданство": "civic_participation",
  "cidadania": "civic_participation", "participation": "civic_participation", "participación": "civic_participation",

  // Media Literacy
  "medios": "media_literacy", "media": "media_literacy", "periodismo": "media_literacy", "giornalismo": "media_literacy",
  "journalism": "media_literacy", "fake news": "media_literacy", "comunicación": "media_literacy",
  "communication": "media_literacy", "presse": "media_literacy", "медиа": "media_literacy",
  "информация": "media_literacy", "comunicação": "media_literacy", "comunicazione": "media_literacy",

  // Rural Development
  "rural": "rural_development", "campo": "rural_development", "agricultura": "rural_development",
  "agriculture": "rural_development", "dorf": "rural_development", "campagne": "rural_development", "campagna": "rural_development",
  "сельское": "rural_development", "деревня": "rural_development", "natureza": "rural_development",
  "farming": "rural_development", "organic": "rural_development", "ecológico": "rural_development",

  // Heritage
  "patrimonio": "heritage", "heritage": "heritage", "intercultural": "heritage",
  "erbe": "heritage", "patrimoine": "heritage", "interkulturell": "heritage", "interculturale": "heritage",
  "наследие": "heritage", "межкультурный": "heritage", "património": "heritage",
};

/**
 * Unicode-aware word boundary matcher for multilingual strings.
 * Solves the JS regex \b limitation with accented characters (é, à, ó, ü, etc.) and Cyrillic.
 */
function matchesWord(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, "iu");
  return regex.test(text);
}

/**
 * Deterministic multi-language NLP parser fallback.
 * Guarantees 100% availability even when Gemini API is offline or rate-limited.
 */
function parseLocalMultilingualQuery(rawQuery: string): AiSearchFilters {
  const query = rawQuery.toLowerCase().trim();
  const destSet = new Set<string>();
  const typesSet = new Set<string>();
  const themesSet = new Set<string>();
  let rup = false;
  let lastMinute = false;

  // 1. Detect Country
  for (const [countryName, code] of Object.entries(MULTILINGUAL_COUNTRIES)) {
    if (matchesWord(query, countryName)) {
      destSet.add(code);
    }
  }

  // 2. Detect Project Types
  for (const [keyword, typeCode] of Object.entries(MULTILINGUAL_PROJECT_TYPES)) {
    if (matchesWord(query, keyword)) {
      typesSet.add(typeCode);
    }
  }

  // 3. Detect Themes
  for (const [themeKeyword, themeId] of Object.entries(MULTILINGUAL_THEMES)) {
    if (matchesWord(query, themeKeyword)) {
      themesSet.add(themeId);
    }
  }

  // 4. Detect RUP flights
  if (
    query.includes("rup") ||
    query.includes("canarias") ||
    query.includes("canary") ||
    query.includes("azores") ||
    query.includes("açores") ||
    query.includes("madeira") ||
    query.includes("guadeloupe") ||
    query.includes("martinique") ||
    query.includes("reunion") ||
    query.includes("outermost") ||
    query.includes("outre-mer") ||
    query.includes("vuelos rup")
  ) {
    rup = true;
  }

  // 5. Detect Last Minute
  if (
    query.includes("last minute") ||
    query.includes("última hora") ||
    query.includes("ultima hora") ||
    query.includes("urgente") ||
    query.includes("urgent") ||
    query.includes("dringend") ||
    query.includes("горящие") ||
    query.includes("dernière minute")
  ) {
    lastMinute = true;
  }

  // 6. Clean residual keywords
  let cleanKeywords = query;
  const termsToRemove = [
    ...Object.keys(MULTILINGUAL_COUNTRIES),
    ...Object.keys(MULTILINGUAL_PROJECT_TYPES),
    ...Object.keys(MULTILINGUAL_THEMES),
    "en", "in", "de", "del", "dans", "in der", "in den", "auf", "on", "a", "em", "im", "für", "para", "for", "pour",
    "di", "da", "con", "e", "y", "und", "et", "и", "в", "во", "на", "с", "для",
    "project", "proyecto", "mission", "misión", "quiero", "i want", "ich möchte", "je veux", "interessiert",
    "rup", "last minute", "urgente", "urgent", "summer", "verano", "sommer", "été"
  ];

  for (const t of termsToRemove) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reg = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, "giu");
    cleanKeywords = cleanKeywords.replace(reg, " ");
  }

  const trimmedKeywords = cleanKeywords.replace(/\s+/g, " ").trim();

  return {
    q: trimmedKeywords || undefined,
    dest: destSet.size > 0 ? Array.from(destSet) : undefined,
    types: typesSet.size > 0 ? Array.from(typesSet) : undefined,
    themes: themesSet.size > 0 ? Array.from(themesSet) : undefined,
    rup: rup ? true : undefined,
    lastMinute: lastMinute ? true : undefined,
  };
}

/**
 * Main Server Action for AI Magic Search.
 * Tries Gemini AI with strict structured extraction, falling back to local multi-language NLP.
 */
export async function parseAiSearchAction(naturalQuery: string): Promise<AiSearchResult> {
  const trimmed = (naturalQuery || "").trim();
  if (!trimmed) {
    return { success: true, filters: {} };
  }

  // Defensive sanitization: escape quotes, backslashes, and control characters to prevent prompt injection / JSON delimiter break
  const sanitizedQuery = trimmed
    .replace(/["\\]/g, "\\$&")
    .replace(/[\u0000-\u001F]+/g, " ");

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const prompt = `You are a strict JSON extraction engine for European mobility projects (Erasmus+ and European Solidarity Corps).
Extract search filters from the user query: "${sanitizedQuery}".
Allowed countries: ISO 2-letter country codes in Europe (IT, ES, DE, FR, PT, GR, PL, NL, BE, AT, SE, NO, FI, DK, CZ, HU, RO, BG, HR, CY, MT, IS, EE, LV, LT, SI, SK, TR, etc.).
Allowed project types: ["YE", "TC", "ESC"].
Allowed themes: ["environment", "digital", "inclusion", "mental_health", "arts_culture", "sports", "human_rights", "entrepreneurship", "civic_participation", "media_literacy", "rural_development", "heritage"].
Allowed rup: boolean (true if mentions Canary Islands, Azores, Madeira, French outermost territories, or RUP flight coverage).
Allowed lastMinute: boolean (true if mentions urgent, immediate, or last minute).
Allowed keywords: string with specific remaining nouns/topics (or empty string).

Respond ONLY with valid JSON matching this schema:
{
  "dest": ["IT"],
  "types": ["YE"],
  "themes": ["environment"],
  "rup": false,
  "lastMinute": false,
  "keywords": "animals"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const filters: AiSearchFilters = {};

          if (Array.isArray(parsed.dest) && parsed.dest.length > 0) {
            filters.dest = parsed.dest.filter((c: unknown) => typeof c === "string" && c.length === 2);
          }
          if (Array.isArray(parsed.types) && parsed.types.length > 0) {
            filters.types = parsed.types.filter((t: unknown) => ["YE", "TC", "ESC"].includes(String(t)));
          }
          if (Array.isArray(parsed.themes) && parsed.themes.length > 0) {
            filters.themes = parsed.themes.filter((th: unknown) => PROJECT_THEME_IDS.includes(th as ProjectThemeId));
          }
          if (parsed.rup === true) filters.rup = true;
          if (parsed.lastMinute === true) filters.lastMinute = true;
          if (typeof parsed.keywords === "string" && parsed.keywords.trim()) {
            filters.q = parsed.keywords.trim();
          }

          return {
            success: true,
            filters,
            source: "gemini",
          };
        }
      }
    } catch {
      // Fall through to deterministic multi-language parser
    }
  }

  // Deterministic local NLP parser fallback (100% resilient)
  const localFilters = parseLocalMultilingualQuery(trimmed);
  return {
    success: true,
    filters: localFilters,
    source: "deterministic",
  };
}
