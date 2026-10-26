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
  { path: "/support", changeFrequency: "monthly", priority: 0.7 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/notice", changeFrequency: "yearly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://euronova.space").replace(/\/+$/, "");
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Static public routes across all supported locales
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

  // 2. Dynamically fetch published projects from Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: projects, error } = await supabase
        .from("projects")
        .select("id, created_at")
        .eq("status", "published");

      if (!error && projects) {
        for (const project of projects) {
          const projectCreatedDate = project.created_at ? new Date(project.created_at) : new Date();

          const alternatesLanguages: Record<string, string> = {};
          for (const locale of routing.locales) {
            alternatesLanguages[locale] = `${baseUrl}/${locale}/dashboard/projects/${project.id}`;
          }
          alternatesLanguages["x-default"] = `${baseUrl}/${routing.defaultLocale}/dashboard/projects/${project.id}`;

          for (const locale of routing.locales) {
            sitemapEntries.push({
              url: `${baseUrl}/${locale}/dashboard/projects/${project.id}`,
              lastModified: projectCreatedDate,
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
    // Fail-safe: Always return static routes even if Supabase connection encounters an error
    console.error("Failed to dynamically generate project sitemaps:", err);
  }

  return sitemapEntries;
}
