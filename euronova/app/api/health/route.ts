import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthResponse {
  status: "healthy" | "degraded";
  db_connected: boolean;
  schema_ready: boolean;
  latency_ms: number;
  timestamp: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  let dbConnected = false;
  let schemaReady = false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const latencyMs = Number((performance.now() - startTime).toFixed(2));
    return NextResponse.json(
      {
        status: "degraded",
        db_connected: false,
        schema_ready: false,
        latency_ms: latencyMs,
        timestamp,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Run parallel lightweight checks on critical tables and specific columns
    const [projectsRes, surveysRes] = await Promise.all([
      supabase.from("projects").select("id, status").limit(1),
      supabase.from("org_surveys").select("id, is_archived").limit(1),
    ]);

    // Check if database queries succeeded
    const projectsOk = !projectsRes.error;
    const surveysOk = !surveysRes.error;

    if (projectsOk && surveysOk) {
      dbConnected = true;
      schemaReady = true;
    } else if (projectsOk || surveysOk) {
      // Partial connection: connection succeeded to at least one table, but schema disparity
      dbConnected = true;
      schemaReady = false;
    } else {
      // Both queries returned errors
      dbConnected = false;
      schemaReady = false;
    }
  } catch {
    dbConnected = false;
    schemaReady = false;
  }

  const endTime = performance.now();
  const latencyMs = Number((endTime - startTime).toFixed(2));
  const isHealthy = dbConnected && schemaReady;

  const payload: HealthResponse = {
    status: isHealthy ? "healthy" : "degraded",
    db_connected: dbConnected,
    schema_ready: schemaReady,
    latency_ms: latencyMs,
    timestamp,
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

