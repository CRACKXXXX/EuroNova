import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { routing } from "@/i18n/routing";

// Performance Critical: Cache sitemap computation for 1 hour to protect Supabase from crawler DDoS
export const revalidate = 3600;

interface StaticRouteConfig {
  path: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

const STATIC_ROUTES: StaticRouteConfig[] = [
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/community", changeFrequency: "daily", priority: 0.9 },
  { path: "/map", changeFrequency: "weekly", priority: 0.8 },
  { path: "/support", changeFrequency: "monthly", priority: 0.7 },
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.5 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/notice", changeFrequency: "yearly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://euronova.vercel.app").replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production" && (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))) {
    baseUrl = "https://euronova.vercel.app";
  }

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Static public routes across all 7 supported locales with hreflang alternates
  for (const route of STATIC_ROUTES) {
    const alternatesLanguages: Record<string, string> = {};
    for (const locale of routing.locales) {
      alternatesLanguages[locale] = `${baseUrl}/${locale}${route.path}`;
    }
    alternatesLanguages["x-default"] = `${baseUrl}/${routing.defaultLocale}${route.path}`;

    for (const locale of routing.locales) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: alternatesLanguages,
        },
      });
    }
  }

  // 2. Dynamically fetch active published projects from Supabase with a fail-safe timeout
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const queryPromise = supabase
        .from("projects")
        .select("id, created_at, updated_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1000);

      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error("Supabase sitemap query timed out after 5000ms")), 5000)
      );

      const { data: projects, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (!error && projects) {
        for (const project of projects) {
          const safeId = encodeURIComponent(project.id);
          const lastModified = project.updated_at
            ? new Date(project.updated_at)
            : project.created_at
            ? new Date(project.created_at)
            : new Date();

          const alternatesLanguages: Record<string, string> = {};
          for (const locale of routing.locales) {
            alternatesLanguages[locale] = `${baseUrl}/${locale}/projects/${safeId}`;
          }
          alternatesLanguages["x-default"] = `${baseUrl}/${routing.defaultLocale}/projects/${safeId}`;

          for (const locale of routing.locales) {
            sitemapEntries.push({
              url: `${baseUrl}/${locale}/projects/${safeId}`,
              lastModified,
              changeFrequency: "weekly",
              priority: 0.8,
              alternates: {
                languages: alternatesLanguages,
              },
            });
          }
        }
      }
    }
  } catch (err) {
    // Fail-safe: Always return static routes even if Supabase encounters an error or timeout
    console.error("Failed to dynamically generate project sitemaps:", err);
  }

  return sitemapEntries;
}
