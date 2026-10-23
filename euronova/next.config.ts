import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// ============================================================================
// EURONOVA MULTI-LAYER HTTP SECURITY HEADERS & CSP
// ============================================================================

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co https://flagcdn.com https://*.cartocdn.com https://basemaps.cartocdn.com https://euronova.vercel.app",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.openmaptiles.org https://basemaps.cartocdn.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.cartocdn.com https://basemaps.cartocdn.com https://nominatim.openstreetmap.org https://fonts.openmaptiles.org",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
