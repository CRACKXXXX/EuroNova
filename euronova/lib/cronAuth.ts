import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/roles";

/**
 * Constant-time comparison between two strings to prevent timing side-channel attacks.
 * Hashing both values with SHA-256 guarantees equal buffer lengths (32 bytes)
 * before calling crypto.timingSafeEqual, avoiding length leaks and RangeErrors.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export interface VerifyCronOptions {
  allowAdmin?: boolean;
}

export interface CronAuthResult {
  isAuthorized: boolean;
  authorizedBy: "cron_secret" | "root_admin" | "admin" | null;
  error?: string;
}

/**
 * Validates request authorization for background cron endpoints and scraper tasks.
 * 1. Checks `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>` in constant time.
 * 2. If missing or invalid, checks if the session belongs to a root administrator (or admin if allowed).
 * 3. Never logs secret values or leaks timing information.
 */
export async function verifyCronAuthorization(
  request: Request | NextRequest,
  options: VerifyCronOptions = {}
): Promise<CronAuthResult> {
  const cronSecret = process.env.CRON_SECRET;

  // 1. Check Bearer Authorization header in constant time
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (cronSecret && authHeader && authHeader.startsWith("Bearer ")) {
    const providedToken = authHeader.slice(7).trim();
    if (timingSafeEqualString(providedToken, cronSecret)) {
      return { isAuthorized: true, authorizedBy: "cron_secret" };
    }
  }

  // 1b. Support query param secret if provided, evaluated strictly in constant time
  try {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    if (cronSecret && querySecret && timingSafeEqualString(querySecret, cronSecret)) {
      return { isAuthorized: true, authorizedBy: "cron_secret" };
    }
  } catch {
    // Malformed URL fallback
  }

  // 2. Fallback: Authenticated session check for root admin (or admin if permitted)
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!userError && user) {
      if (user.email === "euronovaofficial@gmail.com") {
        return { isAuthorized: true, authorizedBy: "root_admin" };
      }

      const role = await getUserRole(user.id, user.email);
      if (role === "root") {
        return { isAuthorized: true, authorizedBy: "root_admin" };
      }

      if (options.allowAdmin && role === "admin") {
        return { isAuthorized: true, authorizedBy: "admin" };
      }
    }
  } catch {
    // Silent fail in headless serverless context without cookies
  }

  return {
    isAuthorized: false,
    authorizedBy: null,
    error: "Unauthorized: Invalid or missing authorization credentials.",
  };
}

/**
 * Generates a standard 401 Unauthorized NextResponse.
 */
export function unauthorizedCronResponse(customMessage?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: customMessage || "Unauthorized: Invalid or missing cron secret.",
    },
    { status: 401 }
  );
}

