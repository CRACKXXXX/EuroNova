"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AuthCredentialsSchema } from "@/lib/schemas";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rateLimiter";
import { stripDangerousHtml } from "@/lib/securitySanitizer";

export async function login(prevState: unknown, formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  // 1. Zod double-layer schema validation
  const parsed = AuthCredentialsSchema.safeParse({ email, password });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid login credentials.";
    return { error: issue };
  }

  // 2. Anti-brute-force Rate Limiter (10 attempts per minute per IP)
  const clientIp = await getClientIp();
  const rateCheck = await checkRateLimit(`login_${clientIp}`, RATE_LIMITS.AUTH);
  if (!rateCheck.success) {
    return {
      error: rateCheck.error || "Too many login attempts. Please wait 60 seconds before trying again.",
    };
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
    return { error: err instanceof Error ? err.message : "Error inesperado en inicio de sesión." };
  }
}

export async function signup(prevState: unknown, formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string)?.trim();
  const rawFullName = (formData.get("fullName") as string)?.trim();
  const fullName = stripDangerousHtml(rawFullName, 100);
  const birthDate = (formData.get("birth_date") as string)?.trim();
  const orgAgeDeclaration = formData.get("org_age_declaration") === "on";
  const acceptedTos = formData.get("accepted_tos") === "on";

  // 1. Zod double-layer schema validation
  const parsed = AuthCredentialsSchema.safeParse({ email, password });
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
    return {
      error: rateCheck.error || "Too many registration attempts. Please wait before trying again.",
    };
  }

  // Auditable Consent Traceability (Art. 7 GDPR)
  if (!acceptedTos) {
    return { error: "You must accept the Terms of Service and Privacy Policy to create an account." };
  }

  // Strict Age Verification Gate (Art. 8 GDPR & Erasmus+ Rules)
  if (role === "youth") {
    if (!birthDate) {
      return { error: "Please enter your date of birth." };
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
      return { error: "Date of birth cannot be in the future." };
    }

    let age = now.getUTCFullYear() - birthDateObj.getUTCFullYear();
    const m = now.getUTCMonth() - birthDateObj.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < birthDateObj.getUTCDate())) {
      age--;
    }

    if (age < 13) {
      return {
        error: "You must be at least 13 years old to register on EuroNova (GDPR Art. 8 & Erasmus+ compliance).",
      };
    }
  } else if (role === "org") {
    if (!orgAgeDeclaration) {
      return {
        error: "You must confirm that you are an authorized representative of legal age (18+).",
      };
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
      return { error: error.message };
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
          console.error("Error creating youth profile:", profileError);
        }
      } else if (role === "org") {
        const { error: profileError } = await supabase.from("users_org").upsert({
          id: data.user.id,
          org_name: fullName || null,
        });
        if (profileError) {
          console.error("Error creating org profile:", profileError);
        }
      }
    }

    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error inesperado en registro." };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al cerrar sesión." };
  }
}

export async function signInWithGoogle() {
  const [supabase, headersList] = await Promise.all([
    createClient(),
    headers(),
  ]);
  const origin = headersList.get("origin") || "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}
