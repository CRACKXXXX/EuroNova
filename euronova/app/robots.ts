import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://euronova.space").replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/*/projects/",
          "/projects/",
          "/*/dashboard/projects/",
          "/dashboard/projects/",
        ],
        disallow: [
          "/dashboard/",
          "/*/dashboard/",
          "/api/",
          "/*/api/",
          "/auth/",
          "/*/auth/",
          "/login",
          "/*/login",
          "/signup",
          "/*/signup",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
