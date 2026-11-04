"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { AuthCredentialsSchema, SignupCredentialsSchema } from "@/lib/schemas";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rateLimiter";
import { stripDangerousHtml } from "@/lib/securitySanitizer";

export async function login(prevState: unknown, formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  const parsed = AuthCredentialsSchema.safeParse({ email, password });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid email or password.";
    return { error: issue };
  }

  // Anti-brute force Rate Limiter (5 attempts per minute per IP)
  const clientIp = await getClientIp();
  const rateCheck = await checkRateLimit(`login_${clientIp}`, RATE_LIMITS.AUTH);
  if (!rateCheck.success) {
    return { error: "RATE_LIMIT_EXCEEDED" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Unexpected error during login." };
  }
}

export async function signup(prevState: unknown, formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string)?.trim();
  const rawFullName = (formData.get("fullName") as string)?.trim();
  const fullName = stripDangerousHtml(rawFullName, 100);
  const birthDate = (formData.get("birth_date") as string)?.trim();
  const orgAgeDeclarationRaw = formData.get("org_age_declaration");
  const orgAgeDeclaration = orgAgeDeclarationRaw === "on" || orgAgeDeclarationRaw === "true" || orgAgeDeclarationRaw === "1";
  const acceptedTosRaw = formData.get("accepted_tos") || formData.get("terms");
  const acceptedTos = acceptedTosRaw === "on" || acceptedTosRaw === "true" || acceptedTosRaw === "1";

  // 1. Zod double-layer schema validation with terms requirement
  const parsed = SignupCredentialsSchema.safeParse({
    email,
    password,
    accepted_tos: acceptedTos,
    role,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid registration credentials.";
    return { error: issue };
  }

  if (!role || (role !== "youth" && role !== "org")) {
    return { error: "Missing or invalid registration role." };
  }

  // 2. Anti-spam Registration Rate Limiter (5 registrations per minute per IP)
  const clientIp = await getClientIp();
  const rateCheck = await checkRateLimit(`signup_${clientIp}`, RATE_LIMITS.AUTH);
  if (!rateCheck.success) {
    return { error: "RATE_LIMIT_EXCEEDED" };
  }

  // 3. Mandatory Server-Side Validation: Auditable Consent Traceability (Art. 7 GDPR)
  if (!acceptedTos) {
    return { error: "ERR_TOS_REQUIRED" };
  }

  // 4. Strict Age Verification Gate (Art. 8 GDPR & Erasmus+ Rules)
  if (role === "youth") {
    if (!birthDate) {
      return { error: "ERR_AGE_REQUIRED" };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return { error: "Invalid date of birth format. Please use YYYY-MM-DD." };
    }

    const [yearStr, monthStr, dayStr] = birthDate.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const birthDateObj = new Date(Date.UTC(year, month, day));
    const now = new Date();

    if (isNaN(birthDateObj.getTime()) || birthDateObj > now) {
      return { error: "ERR_FUTURE_DATE" };
    }

    let age = now.getUTCFullYear() - birthDateObj.getUTCFullYear();
    const m = now.getUTCMonth() - birthDateObj.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < birthDateObj.getUTCDate())) {
      age--;
    }

    if (age < 13) {
      return { error: "ERR_UNDERAGE" };
    }
  } else if (role === "org") {
    if (!orgAgeDeclaration) {
      return { error: "ERR_ORG_AGE_DECLARATION" };
    }
  }

  const acceptedTosAt = new Date().toISOString();

  try {
    const supabase = await createClient();

    // Step 1: Base Authentication and Consent Audit Metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName || null,
          birth_date: role === "youth" ? birthDate : null,
          accepted_tos_at: acceptedTosAt,
          consent_version: "2026-v1",
        },
      },
    });

    if (error) {
      console.error("[Auth Signup Error]:", error);
      if (
        error.status === 422 ||
        error.message?.toLowerCase().includes("already registered") ||
        error.message?.toLowerCase().includes("already in use")
      ) {
        return { error: "User already registered or invalid input." };
      }
      return { error: "Error creating account" };
    }

    // Step 2: Relational profile creation with defensive attributes
    if (data.user) {
      if (role === "youth") {
        const { error: profileError } = await supabase.from("users_youth").upsert({
          id: data.user.id,
          full_name: fullName || null,
          birth_date: birthDate,
        });
        if (profileError) {
          console.error("[Profile Creation Error - Youth]:", profileError);
          return { error: "Error creating account" };
        }
      } else if (role === "org") {
        const { error: profileError } = await supabase.from("users_org").upsert({
          id: data.user.id,
          org_name: fullName || null,
        });
        if (profileError) {
          console.error("[Profile Creation Error - Org]:", profileError);
          return { error: "Error creating account" };
        }
      }
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("[Unexpected Registration Exception]:", err);
    return { error: "Error creating account" };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to sign out. Please try again." };
  }
}

export async function signInWithGoogle(nextUrl = "/dashboard") {
  const [supabase, headersList] = await Promise.all([
    createClient(),
    headers(),
  ]);
  const host = headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = headersList.get("origin") || `${proto}://${host}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function requestPasswordReset(prevState: unknown, formData: FormData) {
  const rawEmail = (formData.get("email") as string)?.trim().toLowerCase();
  const email = stripDangerousHtml(rawEmail, 150);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "INVALID_EMAIL" };
  }

  const clientIp = await getClientIp();
  const rateCheck = await checkRateLimit(`reset_pwd_${clientIp}`, RATE_LIMITS.AUTH);
  if (!rateCheck.success) {
    return { error: "RATE_LIMIT_EXCEEDED" };
  }

  try {
    const [supabase, headersList] = await Promise.all([
      createClient(),
      headers(),
    ]);
    const host = headersList.get("host") || "localhost:3000";
    const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = headersList.get("origin") || `${proto}://${host}`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Unexpected error during password reset request." };
  }
}
