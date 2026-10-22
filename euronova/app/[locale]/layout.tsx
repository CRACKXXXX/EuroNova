import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { BackToTop } from "@/components/BackToTop";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0A0D18",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://euronova.space";

  const languageAlternates: Record<string, string> = {};
  for (const l of routing.locales) {
    languageAlternates[l] = `/${l}`;
  }
  languageAlternates["x-default"] = `/${routing.defaultLocale}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "EuroNova — European Mobility Gateway",
      template: "%s | EuroNova",
    },
    description:
      "Discover verified Erasmus+ and European Solidarity Corps youth mobility missions across 30+ European nations with 100% funding.",
    manifest: "/manifest.json",
    icons: {
      icon: "/logo-svg.svg",
      shortcut: "/logo-svg.svg",
      apple: "/logo-svg.svg",
    },
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates,
    },
    openGraph: {
      type: "website",
      locale,
      url: `/${locale}`,
      siteName: "EuroNova",
      title: "EuroNova — European Mobility Gateway",
      description:
        "Discover verified Erasmus+ and European Solidarity Corps youth mobility missions across 30+ European nations with 100% funding.",
      images: [
        {
          url: "/logo-big.png",
          width: 1200,
          height: 630,
          alt: "EuroNova — European Mobility Gateway",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "EuroNova — European Mobility Gateway",
      description:
        "Discover verified Erasmus+ and European Solidarity Corps youth mobility missions across 30+ European nations with 100% funding.",
      images: ["/logo-big.png"],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo-svg.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0D18" />
      </head>
      <body className="min-h-full flex flex-col bg-void-deep text-white">
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <ScrollRestoration />
          </Suspense>
          {children}
          <BackToTop />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
