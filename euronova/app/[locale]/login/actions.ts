"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Por favor, introduce email y contraseña." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!email || !password || !role) {
    return { error: "Faltan campos obligatorios para el registro." };
  }

  try {
    const supabase = await createClient();

    // Paso 1: Autenticación base
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
        }
      }
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      if (role === "youth") {
        const { error: profileError } = await supabase.from("users_youth").upsert({ id: data.user.id });
        if (profileError) {
          console.error("Error creating youth profile:", profileError);
        }
      } else if (role === "org") {
        const { error: profileError } = await supabase.from("users_org").upsert({ id: data.user.id });
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
  const supabase = await createClient();
  const headersList = await headers();
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
