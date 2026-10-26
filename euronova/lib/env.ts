import { z } from "zod";

/**
 * Client-accessible environment variables schema.
 * All variables MUST start with NEXT_PUBLIC_ to be exposed to the browser.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY cannot be empty"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid URL")
    .optional()
    .or(z.literal("")),
});

/**
 * Server-only environment variables schema.
 * NEVER expose these to the client browser bundle.
 */
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY cannot be empty"),
  CRON_SECRET: z
    .string()
    .min(1, "CRON_SECRET cannot be empty"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  ALERT_ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_API_HASH: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type FullEnv = ClientEnv & ServerEnv;

const serverKeys = new Set(Object.keys(serverEnvSchema.shape));

/**
 * Helper to safely extract raw client-accessible variables from process.env
 */
function getRawClientEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };
}

/**
 * Helper to safely extract raw server variables from process.env
 */
function getRawServerEnv(): Record<string, string | undefined> {
  return {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    ALERT_ADMIN_EMAIL: process.env.ALERT_ADMIN_EMAIL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH,
  };
}

/**
 * Validates environment variables according to execution context (Client vs Server).
 */
export function validateEnv(): FullEnv {
  const isClient = typeof window !== "undefined";

  // 1. Client Environment Validation
  const rawClient = getRawClientEnv();
  const clientResult = clientEnvSchema.safeParse(rawClient);

  if (!clientResult.success) {
    console.error(
      "❌ Invalid client environment variables:",
      clientResult.error.flatten().fieldErrors
    );
    throw new Error(
      `Invalid client environment configuration: ${JSON.stringify(
        clientResult.error.flatten().fieldErrors
      )}`
    );
  }

  // 2. If running on client, return client variables behind a security guard Proxy
  if (isClient) {
    return new Proxy(clientResult.data as FullEnv, {
      get(target, prop: string | symbol) {
        if (typeof prop === "string" && serverKeys.has(prop)) {
          throw new Error(
            `🚨 FATAL SECURITY VIOLATION: Server secret "${prop}" cannot be accessed on the client bundle!`
          );
        }
        return (target as Record<string, unknown>)[prop as string];
      },
    });
  }

  // 3. Server Environment Validation
  const rawServer = getRawServerEnv();
  const serverResult = serverEnvSchema.safeParse(rawServer);

  if (!serverResult.success) {
    // Only throw in production runtime, warn during build/local if optional
    const missingKeys = Object.keys(serverResult.error.flatten().fieldErrors);
    console.error("❌ Missing or invalid server environment variables:", missingKeys);
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
      throw new Error(
        `Critical server environment configuration missing: ${missingKeys.join(", ")}`
      );
    }
  }

  const mergedData = {
    ...clientResult.data,
    ...(serverResult.success ? serverResult.data : rawServer),
  } as FullEnv;

  return mergedData;
}

/**
 * Exported unified environment accessor with runtime isolation guard.
 */
export const env: FullEnv = new Proxy({} as FullEnv, {
  get(_target, prop: string | symbol) {
    if (typeof prop === "string") {
      const isClient = typeof window !== "undefined";
      if (isClient && serverKeys.has(prop)) {
        throw new Error(
          `🚨 FATAL SECURITY VIOLATION: Attempted to access server secret "${prop}" from the client browser bundle!`
        );
      }
    }
    const resolved = validateEnv();
    return (resolved as unknown as Record<string | symbol, unknown>)[prop];
  },
});
