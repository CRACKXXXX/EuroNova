import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handlePurge(request);
}

export async function POST(request: Request) {
  return handlePurge(request);
}

async function handlePurge(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase service credentials" },
        { status: 500 }
      );
    }

    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 48 hours retention threshold
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // 1. Purge resolved reports older than 48 hours (chunk limit: 100)
    const { data: targetReports, error: selRepErr } = await adminDb
      .from("project_reports")
      .select("id")
      .eq("status", "resolved")
      .lt("updated_at", cutoffDate)
      .limit(100);

    let purgedReportsCount = 0;
    let repErr: string | null = selRepErr?.message || null;
    if (targetReports && targetReports.length > 0) {
      const ids = targetReports.map((r) => r.id);
      const { data: delData, error: delErr } = await adminDb
        .from("project_reports")
        .delete()
        .in("id", ids)
        .select("id");
      if (delErr) repErr = delErr.message;
      purgedReportsCount = delData?.length || 0;
    }

    // 2. Purge resolved support tickets older than 48 hours (chunk limit: 100)
    const { data: targetTickets, error: selTickErr } = await adminDb
      .from("support_tickets")
      .select("id")
      .eq("status", "resolved")
      .lt("updated_at", cutoffDate)
      .limit(100);

    let purgedTicketsCount = 0;
    let tickErr: string | null = selTickErr?.message || null;
    if (targetTickets && targetTickets.length > 0) {
      const ids = targetTickets.map((t) => t.id);
      const { data: delData, error: delErr } = await adminDb
        .from("support_tickets")
        .delete()
        .in("id", ids)
        .select("id");
      if (delErr) tickErr = delErr.message;
      purgedTicketsCount = delData?.length || 0;
    }

    // 3. Purge approved or rejected escalations older than 48 hours (chunk limit: 100)
    const { data: targetEscalations, error: selEscErr } = await adminDb
      .from("admin_escalations")
      .select("id")
      .in("status", ["approved", "rejected"])
      .lt("updated_at", cutoffDate)
      .limit(100);

    let purgedEscalationsCount = 0;
    let escErr: string | null = selEscErr?.message || null;
    if (targetEscalations && targetEscalations.length > 0) {
      const ids = targetEscalations.map((e) => e.id);
      const { data: delData, error: delErr } = await adminDb
        .from("admin_escalations")
        .delete()
        .in("id", ids)
        .select("id");
      if (delErr) escErr = delErr.message;
      purgedEscalationsCount = delData?.length || 0;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cutoffDate,
      purged: {
        reportsCount: purgedReportsCount,
        ticketsCount: purgedTicketsCount,
        escalationsCount: purgedEscalationsCount,
      },
      errors: {
        reports: repErr,
        tickets: tickErr,
        escalations: escErr,
      },
    });
  } catch (error: unknown) {
    console.error("Cron purge-logs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
