import { NextRequest, NextResponse } from "next/server";
import { GET as scraperGet } from "@/app/api/scraper/official/route";
import { verifyCronAuthorization, unauthorizedCronResponse } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron Job: Automated Scraper Orchestrator
 *
 * Security:
 * Protected by timingSafeEqual constant-time token verification (lib/cronAuth.ts).
 * Allows Bearer Authorization or root administrator session.
 *
 * Execution:
 * Securely delegates in-process to the official scraper engine (@/app/api/scraper/official/route)
 * without modifying or mutating any core scraping logic, maintaining full separation of concerns.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCronAuthorization(request);
    if (!auth.isAuthorized) {
      return unauthorizedCronResponse(auth.error);
    }

    const cronSecret = process.env.CRON_SECRET || "";
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const scraperUrl = new URL("/api/scraper/official", `${protocol}://${host}`);

    const internalRequest = new NextRequest(scraperUrl, {
      headers: new Headers({
        authorization: `Bearer ${cronSecret}`,
      }),
    });

    const response = await scraperGet(internalRequest);
    const responseData = await response.json();

    return NextResponse.json({
      success: response.ok,
      cron_triggered_at: new Date().toISOString(),
      ...responseData,
    });
  } catch (fatalError: unknown) {
    console.error("[Cron Scrape] Execution failed:", fatalError);
    return NextResponse.json(
      {
        success: false,
        error: fatalError instanceof Error ? fatalError.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
