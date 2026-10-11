import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHANNELS = ["ErasmusProjects", "youth_exchanges", "erasmusplusprojects"];
const AUTO_SCRAPER_ORG_ID = "0610184a-a16e-4dcc-a8f6-b9ddef963bf5";

const VALID_PROJECT_TYPES: readonly string[] = [
  "YE",
  "TC",
  "ESC",
  "PBA",
  "SV",
  "SE",
  "VET",
  "CBY",
];

interface GeminiProjectData {
  is_project: boolean;
  title?: string;
  project_type?: string;
  dest_country?: string;
  duration_days?: number | null;
  eligible_countries?: string[];
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
 * Parses raw text from a Telegram message using Gemini 1.5 Flash.
 */
async function parseWithGemini(
  rawText: string,
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>
): Promise<GeminiProjectData | null> {
  try {
    const prompt = `Raw Telegram Message:\n"""\n${rawText}\n"""`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      return null;
    }

    const cleanedText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed: GeminiProjectData = JSON.parse(cleanedText);
    return parsed;
  } catch (err: unknown) {
    console.error("Gemini parse failed for message snippet:", rawText.slice(0, 80), err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization check
    const cronSecret = process.env.CRON_SECRET;
    const secret = request.nextUrl.searchParams.get("secret");
    const authHeader = request.headers.get("authorization");

    const isAuthorized =
      Boolean(cronSecret) &&
      (secret === cronSecret || authHeader === `Bearer ${cronSecret}`);

    const isDevFallback =
      !cronSecret &&
      (secret === "euronova_secret" || process.env.NODE_ENV === "development");

    if (!isAuthorized && !isDevFallback) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Ensure Gemini API key is configured
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not configured" },
        { status: 500 }
      );
    }

    // 3. Initialize services
    const adminDb = getAdminDb();
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `Extract Erasmus+ project data from this raw Telegram message. 
Return a strict JSON object with these exact keys:
- is_project (boolean): true ONLY if it's an actual mobility/Erasmus project offer.
- title (string): Extract or generate a short descriptive title.
- project_type (string): Extract and map to exactly one of ['YE', 'TC', 'ESC', 'PBA', 'SV', 'SE', 'VET', 'CBY']. Default to 'YE' if unsure but it is a youth project.
- dest_country (string): Extract the destination country ISO code (e.g., 'ES', 'IT'). Leave empty string if unknown.
- duration_days (number | null): Extract duration in days if mentioned.
- eligible_countries (string[]): Extract eligible country ISO codes.
If it's not a project, return { "is_project": false }.`,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let totalScraped = 0;
    let duplicatesSkipped = 0;
    let nonProjectsCount = 0;
    const insertedProjects: Array<{
      id: string;
      title: string;
      project_type: string;
      dest_country: string;
    }> = [];

    // 4. Iterate over public channels
    for (const channel of CHANNELS) {
      try {
        const response = await fetch(`https://t.me/s/${channel}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          console.warn(`Failed to fetch channel ${channel}: status ${response.status}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract last 15 messages to prevent execution timeouts
        const messageElements = $(".tgme_widget_message_text").toArray().slice(-15);

        for (const el of messageElements) {
          totalScraped++;
          const $el = $(el);
          $el.find("br").replaceWith("\n");
          const rawText = $el.text().trim();

          // Skip empty or trivial messages
          if (!rawText || rawText.length < 30) {
            continue;
          }

          // Anti-duplicate check
          try {
            const { data: existing, error: dupError } = await adminDb
              .from("projects")
              .select("id")
              .eq("description", rawText)
              .maybeSingle();

            if (dupError) {
              console.warn("Duplicate query error (proceeding safely):", dupError.message);
            } else if (existing) {
              duplicatesSkipped++;
              continue;
            }
          } catch (dupCheckError) {
            console.error("Duplicate check exception:", dupCheckError);
          }

          // Gemini parsing
          const parsed = await parseWithGemini(rawText, model);
          if (!parsed || !parsed.is_project) {
            nonProjectsCount++;
            continue;
          }

          // Data normalization
          const projectType =
            parsed.project_type && VALID_PROJECT_TYPES.includes(parsed.project_type)
              ? parsed.project_type
              : "YE";

          const destCountry =
            typeof parsed.dest_country === "string"
              ? parsed.dest_country.toUpperCase().slice(0, 2)
              : "";

          const durationDays =
            typeof parsed.duration_days === "number" && !isNaN(parsed.duration_days)
              ? parsed.duration_days
              : null;

          const eligibleCountries = Array.isArray(parsed.eligible_countries)
            ? parsed.eligible_countries
                .filter((c): c is string => typeof c === "string")
                .map((c) => c.toUpperCase().slice(0, 2))
            : [];

          const isLastMinute = /urgent|last\s*minute/i.test(rawText);
          const coversRupFlights = /rup|canar/i.test(rawText);

          // Insert into database with fallback for org_id
          const insertPayload: Record<string, unknown> = {
            title: parsed.title || "Erasmus+ Mobility Project",
            description: rawText,
            project_type: projectType,
            dest_country: destCountry,
            duration_days: durationDays,
            eligible_countries: eligibleCountries,
            min_age: 18,
            max_age: 30,
            status: "published",
            is_last_minute: isLastMinute,
            covers_rup_flights: coversRupFlights,
            org_id: AUTO_SCRAPER_ORG_ID,
          };

          try {
            let { data: inserted, error: insertError } = await adminDb
              .from("projects")
              .insert(insertPayload)
              .select("id, title, project_type, dest_country")
              .single();

            // Fallback: If foreign key on org_id fails, retry without org_id
            if (insertError && insertError.code === "23503") {
              const { org_id: _removedOrg, ...payloadWithoutOrg } = insertPayload;
              const retryResult = await adminDb
                .from("projects")
                .insert(payloadWithoutOrg)
                .select("id, title, project_type, dest_country")
                .single();
              inserted = retryResult.data;
              insertError = retryResult.error;
            }

            if (insertError) {
              console.error("Project insertion error:", insertError.message);
            } else if (inserted) {
              insertedProjects.push(inserted);
            }
          } catch (insertException) {
            console.error("Project insertion exception:", insertException);
          }
        }
      } catch (channelError) {
        console.error(`Error processing channel ${channel}:`, channelError);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        channels_checked: CHANNELS.length,
        messages_scraped: totalScraped,
        duplicates_skipped: duplicatesSkipped,
        non_projects_skipped: nonProjectsCount,
        projects_created: insertedProjects.length,
      },
      created_projects: insertedProjects,
    });
  } catch (error: unknown) {
    console.error("Telegram scraper fatal error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
