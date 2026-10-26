import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ArchivedProject {
  id: string;
  title: string;
  end_date: string | null;
}

/**
 * Cron Job: Safe Auto-Archiver with 60-Day / 2-Month Buffer
 *
 * Security:
 * Requires Authorization: Bearer <CRON_SECRET> header or ?secret=<CRON_SECRET> query parameter.
 *
 * Logic:
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
 * Finds all projects with status = 'published' AND end_date < (CURRENT_DATE - 60 days).
 * Updates their status to 'archived'.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Strict Cryptographic Secret Verification (Fail-Closed)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    // 2. Verificación de Variables de Entorno Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Database configuration missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)" 
        },
        { status: 500 }
      );
    }

    // 3. Inicialización de Cliente Supabase con Service Role (bypass RLS)
    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 4. Cálculo del Margen de Seguridad Failsafe (60 días / 2 meses)
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const cutoffDate = sixtyDaysAgo.toISOString().split("T")[0]; // Formato YYYY-MM-DD

    // 5. Actualización atómica de proyectos expirados
    const { data: updatedData, error: updateError } = await adminDb
      .from("projects")
      .update({ status: "archived" })
      .eq("status", "published")
      .not("end_date", "is", null)
      .lt("end_date", cutoffDate)
      .select("id, title, end_date");

    if (updateError) {
      console.error("[Cron Archive] Error archiving projects in Supabase:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
          code: updateError.code,
        },
        { status: 500 }
      );
    }

    const archivedProjects = (updatedData as ArchivedProject[] | null) || [];
    const archivedIds = archivedProjects.map((p) => p.id);


    // 6. Registro y Respuesta Detallada
    return NextResponse.json({
      success: true,
      message: `Archival process complete. Archived ${archivedIds.length} projects older than 60 days past end date.`,
      cutoff_date: cutoffDate,
      archived_count: archivedIds.length,
      archived_ids: archivedIds,
      archived_projects: archivedProjects,
      timestamp: now.toISOString(),
    });
  } catch (fatalError: unknown) {
    console.error("[Cron Archive] Fatal route error:", fatalError);
    return NextResponse.json(
      {
        success: false,
        error: fatalError instanceof Error ? fatalError.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
