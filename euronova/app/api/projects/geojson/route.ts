import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rateLimiter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Rate-limit Nominatim (1 req/sec policy)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  project_type: string;
  dest_country: string | null;
  exact_location: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  is_last_minute: boolean;
  covers_rup_flights: boolean;
  themes: string[] | null;
  lat: number | null;
  lng: number | null;
  org_id: string | null;
  financing_type: string | null;
  status: string;
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;
    title: string;
    description: string;
    project_type: string;
    dest_country: string | null;
    exact_location: string | null;
    start_date: string | null;
    end_date: string | null;
    duration_days: number | null;
    is_last_minute: boolean;
    covers_rup_flights: boolean;
    themes: string[] | null;
    financing_type: string | null;
  };
}

// Country-code to capital city fallback for geocoding
const COUNTRY_CAPITALS: Record<string, string> = {
  AT: "Vienna", BE: "Brussels", BG: "Sofia", HR: "Zagreb", CY: "Nicosia",
  CZ: "Prague", DK: "Copenhagen", EE: "Tallinn", FI: "Helsinki", FR: "Paris",
  DE: "Berlin", GR: "Athens", HU: "Budapest", IE: "Dublin", IT: "Rome",
  LV: "Riga", LT: "Vilnius", LU: "Luxembourg", MT: "Valletta", NL: "Amsterdam",
  PL: "Warsaw", PT: "Lisbon", RO: "Bucharest", SK: "Bratislava", SI: "Ljubljana",
  ES: "Madrid", SE: "Stockholm", MK: "Skopje", IS: "Reykjavik", LI: "Vaduz",
  NO: "Oslo", RS: "Belgrade", TR: "Ankara", GB: "London", UK: "London",
  CH: "Bern", GE: "Tbilisi", AM: "Yerevan", AZ: "Baku", MD: "Chisinau",
  UA: "Kyiv", AL: "Tirana", BA: "Sarajevo", ME: "Podgorica", XK: "Pristina",
};

// Memory cache for geocoding to prevent redundant network calls
const geocodeCache = new Map<string, { lat: number; lng: number }>();

async function queryNominatim(queryStr: string): Promise<{ lat: number; lng: number } | null> {
  const normalized = queryStr.trim().toLowerCase();
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EuroNova-Map/1.0 (euronovaofficial@gmail.com)",
      },
    });

    if (!res.ok) return null;

    const data: NominatimResult[] = await res.json();
    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        const coords = { lat, lng: lon };
        geocodeCache.set(normalized, coords);
        return coords;
      }
    }
  } catch (err) {
    console.error(`Geocoding error for "${queryStr}":`, err);
  }

  return null;
}

async function geocode(location: string | null, country: string | null): Promise<{ lat: number; lng: number } | null> {
  // 1. Try specific location + country if available
  if (location && country) {
    const primary = await queryNominatim(`${location}, ${country}`);
    if (primary) return primary;
  }

  // 2. Try location alone
  if (location) {
    const locOnly = await queryNominatim(location);
    if (locOnly) return locOnly;
  }

  // 3. Fallback to capital of destination country with jitter
  if (country) {
    const capital = COUNTRY_CAPITALS[country.toUpperCase()] || country;
    const fallback = await queryNominatim(`${capital}, ${country}`);
    if (fallback) {
      // Add slight jitter (~1-2km) so multiple projects in the same country don't overlap completely
      const jitterLat = (Math.random() - 0.5) * 0.04;
      const jitterLng = (Math.random() - 0.5) * 0.04;
      return {
        lat: Number((fallback.lat + jitterLat).toFixed(6)),
        lng: Number((fallback.lng + jitterLng).toFixed(6)),
      };
    }
  }

  return null;
}

export async function GET(): Promise<NextResponse> {
  // 1. Sliding window Rate Limiter for public endpoint (30 requests/minute per IP)
  const clientIp = await getClientIp();
  const rateCheck = await checkRateLimit(`geojson_${clientIp}`, RATE_LIMITS.PUBLIC_API);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: rateCheck.error || "Rate limit exceeded. Please wait before fetching GeoJSON data again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter || 60) },
      }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Database configuration missing" },
      { status: 500 }
    );
  }

  const adminDb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Fetch ALL published projects
    const { data: projects, error } = await adminDb
      .from("projects")
      .select(
        "id, title, description, project_type, dest_country, exact_location, start_date, end_date, duration_days, is_last_minute, covers_rup_flights, themes, lat, lng, org_id, financing_type, status"
      )
      .eq("status", "published");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        type: "FeatureCollection",
        features: [],
      });
    }

    const features: GeoJSONFeature[] = [];
    let geocodedCount = 0;
    const MAX_GEOCODE_PER_REQUEST = 25; // Avoid hitting Nominatim too hard

    for (const project of projects as ProjectRow[]) {
      let lat = project.lat;
      let lng = project.lng;

      // If coordinates are missing, try to geocode
      if ((lat === null || lng === null) && geocodedCount < MAX_GEOCODE_PER_REQUEST) {
        const coords = await geocode(project.exact_location, project.dest_country);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;

          // Cache the geocoded coordinates back to Supabase
          await adminDb
            .from("projects")
            .update({ lat, lng })
            .eq("id", project.id);

          geocodedCount++;

          // Respect Nominatim rate limit (1 req/sec)
          await delay(1100);
        }
      }

      // Only include projects with valid coordinates
      if (lat !== null && lng !== null) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON uses [longitude, latitude]
          },
          properties: {
            id: project.id,
            title: project.title,
            description: project.description,
            project_type: project.project_type,
            dest_country: project.dest_country,
            exact_location: project.exact_location,
            start_date: project.start_date,
            end_date: project.end_date,
            duration_days: project.duration_days,
            is_last_minute: project.is_last_minute,
            covers_rup_flights: project.covers_rup_flights,
            themes: project.themes,
            financing_type: project.financing_type,
          },
        });
      }
    }

    const geojson = {
      type: "FeatureCollection" as const,
      features,
    };

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("GeoJSON API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
