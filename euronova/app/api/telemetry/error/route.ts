import { NextResponse } from "next/server";
import { getClientIp, checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { scrubPII, type CrashTelemetryPayload } from "@/lib/telemetry";
import { sendCrashAlert } from "@/lib/externalAlerts";

export const dynamic = "force-dynamic";

/**
 * Lightweight, rate-limited telemetry ingestion endpoint.
 * Ingests client crash reports, scrubs PII, records structured JSON logs
 * for Vercel / Sentry ingestion, and optionally dispatches Discord alerts.
 */
export async function POST(request: Request) {
  try {
    const clientIp = await getClientIp();

    // 1. Sliding-Window Rate Limiting per IP
    const rateLimit = await checkRateLimit(`telemetry:${clientIp}`, RATE_LIMITS.TELEMETRY);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many telemetry transmissions. Throttled." },
        { status: 429 }
      );
    }

    // 2. Safe Payload Extraction
    const body = (await request.json().catch(() => null)) as Partial<CrashTelemetryPayload> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid telemetry payload" }, { status: 400 });
    }

    // 3. Defense-in-Depth PII Scrubbing on Server
    const scrubbedName = scrubPII(body.name || "Error").slice(0, 100);
    const scrubbedMessage = scrubPII(body.message || "Unknown client exception").slice(0, 1000);
    const scrubbedStack = body.stack ? scrubPII(body.stack).slice(0, 4000) : undefined;
    const scrubbedCompStack = body.componentStack ? scrubPII(body.componentStack).slice(0, 2000) : undefined;
    const scrubbedRoute = body.route ? scrubPII(body.route).slice(0, 255) : undefined;
    const scrubbedDigest = body.digest ? scrubPII(body.digest).slice(0, 100) : undefined;

    // 4. Structured JSON Telemetry Output (Vercel Logs & Sentry Ingestion Ready)
    const structuredTelemetry = {
      event: "CRASH_TELEMETRY",
      severity: "ERROR",
      timestamp: body.timestamp || new Date().toISOString(),
      route: scrubbedRoute || "client",
      digest: scrubbedDigest || null,
      name: scrubbedName,
      message: scrubbedMessage,
      stack: scrubbedStack || null,
      componentStack: scrubbedCompStack || null,
      environment: process.env.NODE_ENV || "production",
      clientIp: clientIp === "127.0.0.1" ? "127.0.0.1" : clientIp.replace(/\.\d+$/, ".***"),
    };

    console.error(JSON.stringify(structuredTelemetry));

    // 5. Optional External Alert Notification (Discord / Admin Alert)
    if (process.env.DISCORD_WEBHOOK_URL) {
      void sendCrashAlert({
        message: scrubbedMessage,
        route: scrubbedRoute,
        digest: scrubbedDigest,
        stack: scrubbedStack,
        timestamp: structuredTelemetry.timestamp,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Telemetry ingestion exception:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
