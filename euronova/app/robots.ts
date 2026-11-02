import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  let baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://euronova.vercel.app").replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production" && (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))) {
    baseUrl = "https://euronova.vercel.app";
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/*/api/",
          "/auth/",
          "/*/auth/",
          "/dashboard/admin",
          "/*/dashboard/admin",
          "/dashboard/moderator-panel",
          "/*/dashboard/moderator-panel",
          "/dashboard/support-panel",
          "/*/dashboard/support-panel",
          "/dashboard/profile",
          "/*/dashboard/profile",
          "/dashboard/my-missions",
          "/*/dashboard/my-missions",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
