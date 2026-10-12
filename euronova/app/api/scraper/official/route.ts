import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ERASMUS_THEMES } from "@/lib/constants/themes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
];

const COUNTRY_MAP: Record<string, string> = {
  // English & local names
  spain: "ES",
  espana: "ES",
  españa: "ES",
  italy: "IT",
  italia: "IT",
  germany: "DE",
  alemania: "DE",
  deutschland: "DE",
  france: "FR",
  francia: "FR",
  portugal: "PT",
  portogallo: "PT",
  greece: "GR",
  grecia: "GR",
  poland: "PL",
  polonia: "PL",
  polska: "PL",
  netherlands: "NL",
  "paises bajos": "NL",
  "países bajos": "NL",
  holanda: "NL",
  olanda: "NL",
  belgium: "BE",
  belgica: "BE",
  bélgica: "BE",
  belgio: "BE",
  austria: "AT",
  bulgaria: "BG",
  croatia: "HR",
  croacia: "HR",
  croazia: "HR",
  cyprus: "CY",
  chipre: "CY",
  cipro: "CY",
  czechia: "CZ",
  "czech republic": "CZ",
  chequia: "CZ",
  "republica checa": "CZ",
  "república checa": "CZ",
  denmark: "DK",
  dinamarca: "DK",
  danimarca: "DK",
  estonia: "EE",
  finland: "FI",
  finlandia: "FI",
  hungary: "HU",
  hungria: "HU",
  hungría: "HU",
  ungheria: "HU",
  ireland: "IE",
  irlanda: "IE",
  latvia: "LV",
  letonia: "LV",
  lettonia: "LV",
  lithuania: "LT",
  lituania: "LT",
  luxembourg: "LU",
  luxemburgo: "LU",
  malta: "MT",
  romania: "RO",
  rumania: "RO",
  rumanía: "RO",
  slovakia: "SK",
  eslovaquia: "SK",
  slovacchia: "SK",
  slovenia: "SI",
  eslovenia: "SI",
  sweden: "SE",
  suecia: "SE",
  svezia: "SE",
  norway: "NO",
  noruega: "NO",
  norvegia: "NO",
  serbia: "RS",
  turkey: "TR",
  turquia: "TR",
  turquía: "TR",
  türkiye: "TR",
  turchia: "TR",
  calabria: "IT",
  spagna: "ES",
  germania: "DE",
  iceland: "IS",
  islandia: "IS",
  liechtenstein: "LI",
  "north macedonia": "MK",
  macedonia: "MK",
  "macedonia del norte": "MK",
  uk: "GB",
  "united kingdom": "GB",
  "reino unido": "GB",
  albania: "AL",
  armenia: "AM",
  azerbaiyan: "AZ",
  azerbaiyán: "AZ",
  bosnia: "BA",
  "bosnia y herzegovina": "BA",
  georgia: "GE",
  kosovo: "XK",
  moldavia: "MD",
  montenegro: "ME",
  suiza: "CH",
  ucrania: "UA",
};

interface InsertionErrorRecord {
  title?: string;
  error: string;
  details?: unknown;
}

interface ScrapedProjectCandidate {
  source: "salto" | "eyp_esc" | "ye_aggregator" | "proactive_future" | "aktivekosmos";
  title: string;
  official_url: string;
  description: string;
  project_type: string;
  dest_country: string | null;
  financing_type: string;
  accommodation_covered: boolean;
  min_age: number;
  max_age: number;
  is_last_minute: boolean;
  covers_rup_flights: boolean;
  themes: string[];
  eligible_countries: string[];
}

interface AIParsedResult {
  english_title: string;
  english_description: string;
  duration_days: number | null;
  travel_budget_max: number | null;
  participation_fee: number | null;
}

/**
 * Universal translation and metrics extraction using Gemini Flash model.
 */
async function parseWithAI(
  title: string,
  rawDescription: string
): Promise<AIParsedResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      english_title: title,
      english_description: rawDescription,
      duration_days: null,
      travel_budget_max: null,
      participation_fee: null,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are a parser. Analyze the following Erasmus+ project. 
1. Translate the 'title' to English (if not already).
2. Translate the 'description' to professional English, summarizing the main points clearly.
3. Extract integer values for: 'duration_days' (duration of the project in days), 'travel_budget_max' (maximum travel reimbursement in EUR), 'participation_fee' (any fee required in EUR). If not found, return null for the numbers.
Return ONLY a valid JSON object matching this schema: { "english_title": string, "english_description": string, "duration_days": number | null, "travel_budget_max": number | null, "participation_fee": number | null }

Project Title: ${title}
Project Description:
${rawDescription}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as Partial<AIParsedResult>;

    return {
      english_title: parsed.english_title?.trim() || title,
      english_description: parsed.english_description?.trim() || rawDescription,
      duration_days:
        typeof parsed.duration_days === "number" && !isNaN(parsed.duration_days)
          ? Math.round(parsed.duration_days)
          : null,
      travel_budget_max:
        typeof parsed.travel_budget_max === "number" && !isNaN(parsed.travel_budget_max)
          ? Math.round(parsed.travel_budget_max)
          : null,
      participation_fee:
        typeof parsed.participation_fee === "number" && !isNaN(parsed.participation_fee)
          ? Math.round(parsed.participation_fee)
          : null,
    };
  } catch (aiErr: unknown) {
    console.warn("AI parsing fallback triggered for project:", title, aiErr);
    return {
      english_title: title,
      english_description: rawDescription,
      duration_days: null,
      travel_budget_max: null,
      participation_fee: null,
    };
  }
}

/**
 * Ensures any relative path from DOM scraping is converted into an absolute URL,
 * and strips marketing/tracking query parameters (e.g. ?utm_*, ?fbclid=...)
 * to ensure bulletproof duplicate detection.
 */
function normalizeUrl(url: string, baseDomain: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  let parsed: URL;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      parsed = new URL(trimmed);
    } else {
      parsed = new URL(trimmed, baseDomain);
    }
  } catch {
    const fallback = `${baseDomain.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
    try {
      parsed = new URL(fallback);
    } catch {
      return trimmed;
    }
  }

  // Remove tracking parameters
  const keysToDelete: string[] = [];
  parsed.searchParams.forEach((_, key) => {
    const keyLower = key.toLowerCase();
    if (
      TRACKING_PARAM_PREFIXES.some(
        (prefix) => keyLower.startsWith(prefix) || keyLower === prefix
      )
    ) {
      keysToDelete.push(key);
    }
  });

  for (const k of keysToDelete) {
    parsed.searchParams.delete(k);
  }

  parsed.hash = "";
  return parsed.toString();
}

/**
 * Executes a fetch request guarded by an AbortController timeout (12 seconds)
 * to prevent Vercel/serverless runtime hanging if a remote source is unresponsive.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Creates a Supabase admin client using the service role key to bypass RLS.
 */
function getAdminDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Extracts matched Erasmus themes from a description text.
 */
function extractThemes(description: string): string[] {
  const matchedThemes: string[] = [];
  const descLower = description.toLowerCase();

  for (const theme of ERASMUS_THEMES) {
    if (descLower.includes(theme.toLowerCase())) {
      matchedThemes.push(theme);
    }
  }

  if (descLower.includes("climate") && !matchedThemes.includes("Climate Change")) {
    matchedThemes.push("Climate Change");
  }
  if (descLower.includes("inclusion") && !matchedThemes.includes("Social Inclusion")) {
    matchedThemes.push("Social Inclusion");
  }
  if (descLower.includes("digital") && !matchedThemes.includes("Digital Skills")) {
    matchedThemes.push("Digital Skills");
  }
  if (descLower.includes("youth work") && !matchedThemes.includes("Youth Work")) {
    matchedThemes.push("Youth Work");
  }
  if (descLower.includes("mental health") && !matchedThemes.includes("Mental Health")) {
    matchedThemes.push("Mental Health");
  }
  if (descLower.includes("sustainability") && !matchedThemes.includes("Eco-living & Sustainability")) {
    matchedThemes.push("Eco-living & Sustainability");
  }
  if (descLower.includes("arte") || descLower.includes("cultur") || descLower.includes("creativ")) {
    if (!matchedThemes.includes("Cultural Heritage")) {
      matchedThemes.push("Cultural Heritage");
    }
  }

  return matchedThemes;
}

/**
 * Extracts destination country code from title and description.
 */
function extractCountry(title: string, description: string): string | null {
  const parenMatch = title.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const rawParen = parenMatch[1].toLowerCase().trim();
    for (const [countryName, isoCode] of Object.entries(COUNTRY_MAP)) {
      if (rawParen.includes(countryName)) {
        return isoCode;
      }
    }
  }

  for (const [countryName, isoCode] of Object.entries(COUNTRY_MAP)) {
    const regex = new RegExp(`\\b${countryName}\\b`, "i");
    if (regex.test(title) || regex.test(description)) {
      return isoCode;
    }
  }

  return null;
}

/**
 * Extracts eligible country codes from description.
 */
function extractEligibleCountries(description: string): string[] {
  const eligibleCountries: string[] = [];
  for (const [countryName, isoCode] of Object.entries(COUNTRY_MAP)) {
    const regex = new RegExp(`\\b${countryName}\\b`, "i");
    if (regex.test(description)) {
      if (!eligibleCountries.includes(isoCode)) {
        eligibleCountries.push(isoCode);
      }
    }
  }
  return eligibleCountries;
}

export async function GET(request: NextRequest) {
  const insertion_errors: InsertionErrorRecord[] = [];
  const allProjectsToInsert: ScrapedProjectCandidate[] = [];

  const sourceStats = {
    salto: { scraped: 0, inserted: 0 },
    eyp_esc: { scraped: 0, inserted: 0 },
    ye_aggregator: { scraped: 0, inserted: 0 },
    proactive_future: { scraped: 0, inserted: 0 },
    aktivekosmos: { scraped: 0, inserted: 0 },
  };

  try {
    // 1. Authorization check
    const cronSecret = process.env.CRON_SECRET || "Euronova.2007";
    const secret = request.nextUrl.searchParams.get("secret");
    const authHeader = request.headers.get("authorization");

    const isAuthorized =
      secret === cronSecret || authHeader === `Bearer ${cronSecret}`;

    if (!isAuthorized) {
      return new Response("Unauthorized", { status: 401 });
    }

    // ==========================================
    // SOURCE 1: SALTO-YOUTH (TCs & PBAs)
    // ==========================================
    try {
      const feedUrl = "https://www.salto-youth.net/tools/european-training-calendar/rss/";
      let xmlText = "";

      try {
        const response = await fetchWithTimeout(feedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }, 12000);

        if (response.ok) {
          xmlText = await response.text();
        }
      } catch (fetchErr: unknown) {
        console.warn("Direct SALTO RSS fetch error or timeout:", fetchErr);
      }

      // Fallback: European Training Calendar live browse page
      if (!xmlText || !xmlText.includes("<item>")) {
        const browseUrl = "https://www.salto-youth.net/tools/european-training-calendar/browse/";
        const browseRes = await fetchWithTimeout(browseUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }, 12000);

        if (browseRes.ok) {
          const browseHtml = await browseRes.text();
          const $html = cheerio.load(browseHtml);
          const generatedItems: string[] = [];

          $html('a[href*="/training/"]').each((_, el) => {
            const rawLink = $html(el).attr("href");
            const title = $html(el).text().trim();
            const container = $html(el).closest("tr, li, div");
            const rawDesc = container.text().replace(/\s+/g, " ").trim();

            if (rawLink && title && !rawLink.includes("contacttraining")) {
              const absLink = normalizeUrl(rawLink, "https://www.salto-youth.net");
              generatedItems.push(`
                <item>
                  <title><![CDATA[${title}]]></title>
                  <link>${absLink}</link>
                  <description><![CDATA[${rawDesc}]]></description>
                </item>
              `);
            }
          });

          xmlText = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>${generatedItems.join("\n")}</channel></rss>`;
        }
      }

      if (xmlText && xmlText.includes("<item>")) {
        const $salto = cheerio.load(xmlText, { xmlMode: true });
        $salto("item").each((_, el) => {
          const title = $salto(el).find("title").text().trim();
          const rawLink = $salto(el).find("link").text().trim();
          const official_url = normalizeUrl(rawLink, "https://www.salto-youth.net");
          const rawDescription = $salto(el).find("description").text();
          const description = rawDescription.replace(/<[^>]*>/g, "").trim();

          if (!title || !official_url) return;

          sourceStats.salto.scraped++;

          const textForType = `${title} ${description}`;
          let projectType = "TC";
          if (/partnership/i.test(textForType)) {
            projectType = "PBA";
          } else if (/seminar/i.test(textForType)) {
            projectType = "SE";
          } else if (/solidarity/i.test(textForType)) {
            projectType = "ESC";
          }

          const destCountry = extractCountry(title, description);

          let minAge = 18;
          let maxAge = 30;
          const ageMatch = description.match(/(\d{2})\s*-\s*(\d{2})/);
          if (ageMatch) {
            const pMin = parseInt(ageMatch[1], 10);
            const pMax = parseInt(ageMatch[2], 10);
            if (!isNaN(pMin) && !isNaN(pMax) && pMin <= pMax && pMin >= 10 && pMax <= 99) {
              minAge = pMin;
              maxAge = pMax;
            }
          }

          const isLastMinute = /urgent|last\s*minute|apply\s*asap|extended/i.test(description);
          const coversRupFlights = /outermost|canary islands|rup|overseas/i.test(description);
          const themes = extractThemes(description);
          const eligibleCountries = extractEligibleCountries(description);

          allProjectsToInsert.push({
            source: "salto",
            title,
            official_url,
            description,
            project_type: projectType,
            dest_country: destCountry,
            financing_type: "Total",
            accommodation_covered: true,
            min_age: minAge,
            max_age: maxAge,
            is_last_minute: isLastMinute,
            covers_rup_flights: coversRupFlights,
            themes,
            eligible_countries: eligibleCountries,
          });
        });
      }
    } catch (saltoError: unknown) {
      console.error("SALTO scraper block error:", saltoError);
      insertion_errors.push({
        title: "SALTO Scraper Source",
        error: saltoError instanceof Error ? saltoError.message : String(saltoError),
      });
    }

    // ==========================================
    // SOURCE 2: EUROPEAN SOLIDARITY CORPS (ESC)
    // ==========================================
    try {
      let escFoundCount = 0;

      // 2A. Primary: Live REST search endpoint from European Youth Portal
      try {
        const escApiUrl = "https://youth.europa.eu/api/rest/eyp/v1/search?type=Opportunity&limit=30";
        const escRes = await fetchWithTimeout(escApiUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }, 12000);

        if (escRes.ok) {
          const escData = await escRes.json();
          interface EypSearchHit {
            _id?: string;
            _source?: {
              id?: number;
              opid?: number;
              title?: string;
              description?: string;
              boarding_arrangements?: string;
              training?: string;
              country?: string;
              status?: string;
              date_application_end?: string;
              esc_topics?: string[];
              topics?: string[];
              volunteer_countries?: string[];
              funding_programme?: {
                residence_countries?: string[];
              };
            };
          }

          const hits: EypSearchHit[] = escData?.hits?.hits || [];

          for (const hit of hits) {
            const src = hit._source;
            if (!src) continue;

            // Skip drafts or archived entries that return 404
            if (src.status === "archive" || src.status === "draft") {
              continue;
            }

            const rawId = src.id || src.opid || hit._id;
            if (!rawId) continue;

            const title = src.title?.trim() || "European Solidarity Corps Volunteering Opportunity";
            // Prepend domain to relative placement link, converting to normalized absolute URL
            const relativePath = `/solidarity/placement/${rawId}_en`;
            const official_url = normalizeUrl(relativePath, "https://youth.europa.eu");

            const descParts = [
              src.description || "",
              src.boarding_arrangements ? `Accommodations: ${src.boarding_arrangements}` : "",
              src.training ? `Training: ${src.training}` : "",
            ].filter(Boolean);

            const description =
              descParts
                .join("\n\n")
                .replace(/<[^>]*>/g, "")
                .trim() || `European Solidarity Corps volunteering opportunity: ${title}`;

            const destCountry = src.country || extractCountry(title, description);

            let isLastMinute = /urgent|last\s*minute|asap/i.test(description);
            if (src.date_application_end) {
              const deadline = new Date(src.date_application_end);
              const now = new Date();
              const diffDays = (deadline.getTime() - now.getTime()) / (1000 * 3600 * 24);
              if (diffDays > 0 && diffDays <= 21) {
                isLastMinute = true;
              }
            }

            const coversRupFlights = /outermost|canary islands|rup|azores|madeira|overseas/i.test(
              `${title} ${description}`
            );

            const allTopicsText = `${description} ${(src.esc_topics || []).join(" ")} ${(src.topics || []).join(" ")}`;
            const themes = extractThemes(allTopicsText);

            const eligibleCountries =
              src.volunteer_countries && src.volunteer_countries.length > 0
                ? src.volunteer_countries.slice(0, 15)
                : src.funding_programme?.residence_countries &&
                  src.funding_programme.residence_countries.length > 0
                ? src.funding_programme.residence_countries.slice(0, 15)
                : ["ES", "IT", "FR", "DE", "PT", "GR", "PL", "RO", "BG"];

            sourceStats.eyp_esc.scraped++;
            escFoundCount++;

            allProjectsToInsert.push({
              source: "eyp_esc",
              title,
              official_url,
              description,
              project_type: "ESC",
              dest_country: destCountry,
              financing_type: "Total",
              accommodation_covered: true,
              min_age: 18,
              max_age: 30,
              is_last_minute: isLastMinute,
              covers_rup_flights: coversRupFlights,
              themes,
              eligible_countries: eligibleCountries,
            });

            if (escFoundCount >= 10) break;
          }
        }
      } catch (escApiErr: unknown) {
        console.warn("EYP ESC API search error or timeout, attempting HTML list fallback:", escApiErr);
      }

      // 2B. Fallback: Accredited organisations live HTML list with Cheerio
      if (escFoundCount === 0) {
        const orgsUrl = "https://youth.europa.eu/volunteering/organisations_en";
        const orgsRes = await fetchWithTimeout(orgsUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }, 12000);

        if (orgsRes.ok) {
          const orgsHtml = await orgsRes.text();
          const $orgs = cheerio.load(orgsHtml);

          $orgs('a[href*="/volunteering/organisation/"]').each((_, el) => {
            const rawHref = $orgs(el).attr("href");
            const title = $orgs(el).text().trim();
            if (!rawHref || !title || title.toLowerCase() === "read more") return;

            const official_url = normalizeUrl(rawHref, "https://youth.europa.eu");
            const container = $orgs(el).closest(".views-row, tr, div.card, div.node, div");
            const rawDesc = container.text().replace(/\s+/g, " ").trim();
            const description =
              rawDesc || `Accredited European Solidarity Corps organisation: ${title}`;

            const destCountry = extractCountry(title, description);
            const themes = extractThemes(description);

            sourceStats.eyp_esc.scraped++;
            escFoundCount++;

            allProjectsToInsert.push({
              source: "eyp_esc",
              title: `ESC Volunteering: ${title}`,
              official_url,
              description,
              project_type: "ESC",
              dest_country: destCountry,
              financing_type: "Total",
              accommodation_covered: true,
              min_age: 18,
              max_age: 30,
              is_last_minute: false,
              covers_rup_flights: /outermost|canary|rup/i.test(description),
              themes,
              eligible_countries: ["ES", "IT", "FR", "DE", "PT", "GR", "PL", "RO", "BG"],
            });
          });
        }
      }
    } catch (eypError: unknown) {
      console.error("EYP ESC scraper block error:", eypError);
      insertion_errors.push({
        title: "EYP ESC Source",
        error: eypError instanceof Error ? eypError.message : String(eypError),
      });
    }

    // ==========================================
    // SOURCE 3: YOUTH EXCHANGES AGGREGATOR (YE)
    // ==========================================
    try {
      let yeFoundCount = 0;

      // 3A. Primary: Live aggregator RSS feed for Youth Exchanges
      try {
        const yeFeedUrl = "https://www.scambieuropei.info/category/scambi-culturali/feed/";
        const yeRes = await fetchWithTimeout(yeFeedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }, 12000);

        if (yeRes.ok) {
          const xml = await yeRes.text();
          const $ye = cheerio.load(xml, { xmlMode: true });

          $ye("item").each((_, el) => {
            const rawTitle = $ye(el).find("title").text().trim();
            const rawLink = $ye(el).find("link").text().trim();
            const rawDesc = $ye(el).find("description").text();
            const description = rawDesc.replace(/<[^>]*>/g, "").trim();

            if (!rawTitle || !rawLink) return;

            const official_url = normalizeUrl(rawLink, "https://www.scambieuropei.info");
            const title = rawTitle;
            const destCountry = extractCountry(title, description);

            let minAge = 18;
            let maxAge = 30;
            const ageMatch = description.match(/(\d{2})\s*-\s*(\d{2})/);
            if (ageMatch) {
              const pMin = parseInt(ageMatch[1], 10);
              const pMax = parseInt(ageMatch[2], 10);
              if (!isNaN(pMin) && !isNaN(pMax) && pMin <= pMax && pMin >= 13 && pMax <= 99) {
                minAge = pMin;
                maxAge = pMax;
              }
            }

            const isLastMinute = /urgent|last\s*minute|asap|scadenza/i.test(description);
            const coversRupFlights =
              /outermost|canary islands|rup|isole canarie|regioni ultraperiferiche/i.test(
                `${title} ${description}`
              );
            const themes = extractThemes(`${title} ${description}`);
            let eligibleCountries = extractEligibleCountries(description);
            if (eligibleCountries.length === 0) {
              eligibleCountries = ["ES", "IT", "FR", "DE", "PL", "HR", "BG", "CY", "GR"];
            }

            sourceStats.ye_aggregator.scraped++;
            yeFoundCount++;

            allProjectsToInsert.push({
              source: "ye_aggregator",
              title,
              official_url,
              description,
              project_type: "YE",
              dest_country: destCountry,
              financing_type: "Total",
              accommodation_covered: true,
              min_age: minAge,
              max_age: maxAge,
              is_last_minute: isLastMinute,
              covers_rup_flights: coversRupFlights,
              themes,
              eligible_countries: eligibleCountries,
            });

            if (yeFoundCount >= 10) return false;
          });
        }
      } catch (yeFeedErr: unknown) {
        console.warn("YE aggregator RSS feed error or timeout, attempting fallback:", yeFeedErr);
      }

      // 3B. Fallback: Otlas Partner Finding projects for Youth Exchanges
      if (yeFoundCount === 0) {
        const otlasUrl = "https://www.salto-youth.net/tools/otlas-partner-finding/projects/";
        const otlasRes = await fetchWithTimeout(otlasUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }, 12000);

        if (otlasRes.ok) {
          const otlasHtml = await otlasRes.text();
          const $otlas = cheerio.load(otlasHtml);

          $otlas("h2.project-title").each((_, h2) => {
            const linkEl = $otlas(h2).find("a");
            const rawLink = linkEl.attr("href");
            const title = linkEl.text().trim();
            if (!rawLink || !title) return;

            const official_url = normalizeUrl(rawLink, "https://www.salto-youth.net");
            const rawDesc = $otlas(h2).nextAll("p, div").text().replace(/\s+/g, " ").trim();
            const description = rawDesc || `Youth Exchange project: ${title}`;

            const destCountry = extractCountry(title, description);
            const themes = extractThemes(`${title} ${description}`);

            sourceStats.ye_aggregator.scraped++;
            yeFoundCount++;

            allProjectsToInsert.push({
              source: "ye_aggregator",
              title,
              official_url,
              description,
              project_type: "YE",
              dest_country: destCountry,
              financing_type: "Total",
              accommodation_covered: true,
              min_age: 18,
              max_age: 30,
              is_last_minute: /urgent|deadline/i.test(description),
              covers_rup_flights: /outermost|canary|rup/i.test(description),
              themes,
              eligible_countries: ["ES", "IT", "FR", "DE", "PL", "HR", "BG", "CY", "GR"],
            });

            if (yeFoundCount >= 10) return false;
          });
        }
      }
    } catch (yeError: unknown) {
      console.error("Youth Exchanges aggregator block error:", yeError);
      insertion_errors.push({
        title: "Youth Exchanges Source",
        error: yeError instanceof Error ? yeError.message : String(yeError),
      });
    }

    // ==========================================
    // SOURCE 4: PROACTIVE FUTURE (SPANISH MAP)
    // ==========================================
    try {
      let proactiveFoundCount = 0;
      const proactiveApiUrl = "https://mapa.proactivefuture.eu/api/map";
      const proactiveRes = await fetchWithTimeout(
        proactiveApiUrl,
        {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        },
        12000
      );

      if (proactiveRes.ok) {
        interface ProactiveItem {
          identifier?: string;
          title?: string;
          type?: string;
          topic?: string;
          summary?: string;
          country_code?: string;
          location?: string;
          latitude?: number;
          longitude?: number;
          start_date?: string;
          end_date?: string;
          application_deadline?: string;
          infopack_url?: string | null;
          application_url?: string | null;
          detailed_description?: string;
          participant_min_age?: number | null;
          participant_max_age?: number | null;
          covered_costs?: string;
          accommodation_details?: string;
          eligibility_country_codes?: string[];
          status?: string;
          channel_url?: string | null;
          created?: string;
        }

        const proactiveData = await proactiveRes.json();
        const rawItems: ProactiveItem[] =
          proactiveData?.results ||
          proactiveData?.features ||
          (Array.isArray(proactiveData) ? proactiveData : []);

        // Sort by creation date descending to ingest the freshest opportunities
        const sortedItems = rawItems
          .filter((item) => !item.status || item.status === "open")
          .sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));

        for (const item of sortedItems) {
          const title = item.title?.trim();
          const rawUrl =
            item.application_url ||
            item.infopack_url ||
            (item.identifier
              ? `https://mapa.proactivefuture.eu/?o=${item.identifier}`
              : item.channel_url);

          if (!title || !rawUrl) continue;

          const official_url = normalizeUrl(rawUrl, "https://mapa.proactivefuture.eu");
          if (!official_url) continue;

          sourceStats.proactive_future.scraped++;
          proactiveFoundCount++;

          const descParts = [
            item.summary || "",
            item.detailed_description || "",
            item.accommodation_details ? `Alojamiento: ${item.accommodation_details}` : "",
            item.covered_costs ? `Gastos cubiertos: ${item.covered_costs}` : "",
          ].filter(Boolean);

          const description =
            descParts.join("\n\n").replace(/<[^>]*>/g, "").trim() ||
            `Oportunidad Erasmus+ de Proactive Future: ${title}`;

          const textForType = `${item.type || ""} ${title} ${description}`.toLowerCase();
          let projectType = "YE";
          if (textForType.includes("intercambio") || item.type === "YOUTH_EXCHANGE") {
            projectType = "YE";
          } else if (
            textForType.includes("formaci") ||
            textForType.includes("training") ||
            item.type === "TRAINING_COURSE"
          ) {
            projectType = "TC";
          } else if (
            textForType.includes("voluntaria") ||
            item.type === "VOLUNTEERING" ||
            item.type === "ESC"
          ) {
            projectType = "ESC";
          }

          const destCountry =
            item.country_code || extractCountry(title, description);

          let minAge = item.participant_min_age ?? 18;
          let maxAge = item.participant_max_age ?? 30;
          if (minAge < 10 || minAge > 99) minAge = 18;
          if (maxAge < 10 || maxAge > 99) maxAge = 30;
          if (minAge > maxAge) {
            minAge = 18;
            maxAge = 30;
          }

          let isLastMinute = /urgent|urgente|last\s*minute|asap|últimas plazas|ultimas plazas/i.test(
            `${title} ${description}`
          );
          if (item.application_deadline) {
            const deadline = new Date(item.application_deadline);
            const now = new Date();
            const diffDays = (deadline.getTime() - now.getTime()) / (1000 * 3600 * 24);
            if (diffDays >= 0 && diffDays <= 14) {
              isLastMinute = true;
            }
          }

          const coversRupFlights =
            /outermost|canary|canarias|rup|azores|madeira|islas canarias/i.test(
              `${title} ${description}`
            );

          const themes = extractThemes(`${title} ${item.topic || ""} ${description}`);

          let eligibleCountries =
            Array.isArray(item.eligibility_country_codes) &&
            item.eligibility_country_codes.length > 0
              ? item.eligibility_country_codes
              : extractEligibleCountries(description);

          if (eligibleCountries.length === 0) {
            eligibleCountries = ["ES"];
          }

          allProjectsToInsert.push({
            source: "proactive_future",
            title,
            official_url,
            description,
            project_type: projectType,
            dest_country: destCountry,
            financing_type: "Total",
            accommodation_covered: true,
            min_age: minAge,
            max_age: maxAge,
            is_last_minute: isLastMinute,
            covers_rup_flights: coversRupFlights,
            themes,
            eligible_countries: eligibleCountries,
          });

          // Limit batch insertion count to prevent runtime timeouts
          if (proactiveFoundCount >= 15) break;
        }
      }
    } catch (proactiveError: unknown) {
      console.error("Proactive Future scraper block error:", proactiveError);
      insertion_errors.push({
        title: "Proactive Future Source",
        error:
          proactiveError instanceof Error
            ? proactiveError.message
            : String(proactiveError),
      });
    }

    // ==========================================
    // SOURCE 5: AKTIVE KOSMOS (LINKTREE)
    // ==========================================
    try {
      let aktiveFoundCount = 0;
      const aktiveUrl = "https://linktr.ee/aktivekosmos";
      const aktiveRes = await fetchWithTimeout(
        aktiveUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        },
        12000
      );

      if (aktiveRes.ok) {
        const html = await aktiveRes.text();
        interface RawLinkItem {
          title?: string;
          url?: string;
        }

        const candidateLinks: RawLinkItem[] = [];

        // 5A. Check Next.js __NEXT_DATA__
        const nextDataMatch = html.match(
          /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
        );
        if (nextDataMatch) {
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            const links =
              nextData.props?.pageProps?.account?.links ||
              nextData.props?.pageProps?.links ||
              [];
            if (Array.isArray(links)) {
              for (const l of links) {
                if (l && l.url) {
                  candidateLinks.push({
                    title: l.title || "",
                    url: l.url,
                  });
                }
              }
            }
          } catch (jsonErr: unknown) {
            console.warn("Aktive Kosmos Linktree __NEXT_DATA__ parse warning:", jsonErr);
          }
        }

        // 5B. Fallback: Cheerio HTML DOM parsing
        if (candidateLinks.length === 0) {
          const $aktive = cheerio.load(html);
          $aktive("a[href]").each((_, el) => {
            const href = $aktive(el).attr("href");
            const text = $aktive(el).text().trim();
            if (href && text) {
              candidateLinks.push({
                title: text,
                url: href,
              });
            }
          });
        }

        const blockedDomains = [
          "facebook.com",
          "instagram.com",
          "youtube.com",
          "linkedin.com",
          "twitter.com",
          "x.com",
          "tiktok.com",
          "linktr.ee",
        ];

        for (const item of candidateLinks) {
          if (!item.url || !item.title) continue;
          const trimmedUrl = item.url.trim();
          if (
            trimmedUrl.startsWith("mailto:") ||
            trimmedUrl.startsWith("tel:") ||
            trimmedUrl.startsWith("#")
          ) {
            continue;
          }

          let isBlockedDomain = false;
          try {
            const parsedUrl = new URL(trimmedUrl);
            isBlockedDomain = blockedDomains.some((d) =>
              parsedUrl.hostname.toLowerCase().includes(d)
            );
          } catch {
            isBlockedDomain = true;
          }

          if (isBlockedDomain) continue;

          const title = item.title.trim();
          if (title.length < 3) continue;

          const official_url = normalizeUrl(trimmedUrl, "https://linktr.ee/aktivekosmos");
          if (!official_url) continue;

          sourceStats.aktivekosmos.scraped++;
          aktiveFoundCount++;

          const description = `Proyecto Erasmus+ de Aktive Kosmos: ${title}. Consulta los detalles e inscripción en el enlace oficial.`;

          const textForType = title.toLowerCase();
          let projectType = "YE";
          if (textForType.includes("intercambio")) {
            projectType = "YE";
          } else if (textForType.includes("formaci") || textForType.includes("training")) {
            projectType = "TC";
          } else if (textForType.includes("voluntaria")) {
            projectType = "ESC";
          }

          const destCountry = extractCountry(title, description);
          const isLastMinute = /urgent|urgente|last\s*minute|asap/i.test(title);
          const coversRupFlights = /outermost|canary|canarias|rup/i.test(title);
          const themes = extractThemes(title);

          allProjectsToInsert.push({
            source: "aktivekosmos",
            title,
            official_url,
            description,
            project_type: projectType,
            dest_country: destCountry,
            financing_type: "Total",
            accommodation_covered: true,
            min_age: 18,
            max_age: 30,
            is_last_minute: isLastMinute,
            covers_rup_flights: coversRupFlights,
            themes,
            eligible_countries: ["ES"],
          });

          if (aktiveFoundCount >= 10) break;
        }
      }
    } catch (aktiveError: unknown) {
      console.error("Aktive Kosmos scraper block error:", aktiveError);
      insertion_errors.push({
        title: "Aktive Kosmos Source",
        error:
          aktiveError instanceof Error
            ? aktiveError.message
            : String(aktiveError),
      });
    }

    // ==========================================
    // BATCH INSERTION & ANTI-DUPLICATE SHIELD
    // ==========================================
    const adminDb = getAdminDb();
    let duplicatesCount = 0;
    const insertedProjects: Array<{
      id: string;
      title: string;
      project_type: string;
      dest_country: string | null;
      official_url: string;
      source: string;
    }> = [];

    for (const proj of allProjectsToInsert) {
      try {
        // Anti-duplicate check by official_url
        const { data: existing, error: dupError } = await adminDb
          .from("projects")
          .select("id")
          .eq("official_url", proj.official_url)
          .maybeSingle();

        if (dupError) {
          console.warn("Duplicate query check warning:", dupError.message);
        } else if (existing) {
          duplicatesCount++;
          continue;
        }

        // Sequential AI parsing to translate and extract numerical metrics
        const aiParsed = await parseWithAI(proj.title, proj.description);

        const insertPayload: Record<string, unknown> = {
          title: aiParsed.english_title || proj.title,
          official_url: proj.official_url,
          description: aiParsed.english_description || proj.description,
          project_type: proj.project_type,
          dest_country: proj.dest_country,
          financing_type: proj.financing_type,
          accommodation_covered: proj.accommodation_covered,
          min_age: proj.min_age,
          max_age: proj.max_age,
          duration_days: aiParsed.duration_days,
          travel_budget_max: aiParsed.travel_budget_max,
          participation_fee: aiParsed.participation_fee,
          is_last_minute: proj.is_last_minute,
          covers_rup_flights: proj.covers_rup_flights,
          themes: proj.themes,
          eligible_countries: proj.eligible_countries,
          org_id: AUTO_SCRAPER_ORG_ID,
          status: "published",
        };

        let { data: inserted, error: insertError } = await adminDb
          .from("projects")
          .insert(insertPayload)
          .select("id, title, project_type, dest_country, official_url")
          .single();

        // Fallback: If foreign key on org_id fails, retry without org_id
        if (insertError && insertError.code === "23503") {
          const { org_id: _removed, ...payloadWithoutOrg } = insertPayload;
          const retry = await adminDb
            .from("projects")
            .insert(payloadWithoutOrg)
            .select("id, title, project_type, dest_country, official_url")
            .single();
          inserted = retry.data;
          insertError = retry.error;
        }

        if (insertError) {
          console.error("Hybrid scraper insert error:", insertError.message);
          insertion_errors.push({
            title: proj.title,
            error: insertError.message,
            details: insertError.details,
          });
        } else if (inserted) {
          sourceStats[proj.source].inserted++;
          insertedProjects.push({
            id: inserted.id,
            title: inserted.title,
            project_type: inserted.project_type,
            dest_country: inserted.dest_country,
            official_url: inserted.official_url,
            source: proj.source,
          });
        }
      } catch (insertException: unknown) {
        console.error("Hybrid scraper exception for project:", proj.title, insertException);
        insertion_errors.push({
          title: proj.title,
          error:
            insertException instanceof Error
              ? insertException.message
              : String(insertException),
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_scraped: allProjectsToInsert.length,
        total_inserted: insertedProjects.length,
        total_duplicates: duplicatesCount,
        total_errors: insertion_errors.length,
        sources: {
          salto: sourceStats.salto,
          eyp_esc: sourceStats.eyp_esc,
          ye_aggregator: sourceStats.ye_aggregator,
          proactive_future: sourceStats.proactive_future,
          aktivekosmos: sourceStats.aktivekosmos,
        },
      },
      created_projects: insertedProjects,
      insertion_errors,
    });
  } catch (fatalError: unknown) {
    console.error("Fatal error in hybrid scraper:", fatalError);
    const message = fatalError instanceof Error ? fatalError.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message, insertion_errors },
      { status: 500 }
    );
  }
}
