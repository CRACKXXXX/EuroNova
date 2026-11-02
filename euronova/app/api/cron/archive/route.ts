import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuthorization, unauthorizedCronResponse } from "@/lib/cronAuth";

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
 * Protected by timingSafeEqual constant-time token verification (lib/cronAuth.ts).
 * Allows Bearer Authorization or root administrator session.
 *
 * Logic:
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
 * Finds all projects with status = 'published' AND end_date < (CURRENT_DATE - 60 days).
 * Updates their status to 'archived'.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Strict Cryptographic Constant-Time Authorization
    const auth = await verifyCronAuthorization(request);
    if (!auth.isAuthorized) {
      return unauthorizedCronResponse(auth.error);
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

    // 5. Bounded chunk selection to prevent PostgreSQL table locks (Limit 100 per run)
    const { data: candidatesToArchive, error: selectError } = await adminDb
      .from("projects")
      .select("id")
      .eq("status", "published")
      .not("end_date", "is", null)
      .lt("end_date", cutoffDate)
      .limit(100);

    if (selectError) {
      console.error("[Cron Archive] Error selecting expired projects:", selectError);
      return NextResponse.json(
        {
          success: false,
          error: selectError.message,
          code: selectError.code,
        },
        { status: 500 }
      );
    }

    let archivedProjects: ArchivedProject[] = [];
    if (candidatesToArchive && candidatesToArchive.length > 0) {
      const idsToArchive = candidatesToArchive.map((p) => p.id);
      const { data: updatedData, error: updateError } = await adminDb
        .from("projects")
        .update({ status: "archived" })
        .in("id", idsToArchive)
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
      archivedProjects = (updatedData as ArchivedProject[] | null) || [];
    }

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
