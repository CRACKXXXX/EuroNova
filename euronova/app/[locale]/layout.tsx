import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { BackToTop } from "@/components/BackToTop";
import { ScrollRestoration } from "@/components/ScrollRestoration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0A0D18",
};

export const metadata: Metadata = {
  title: "EuroNova",
  description: "Encuentra proyectos de voluntariado y movilidad en Europa.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-svg.svg",
    shortcut: "/logo-svg.svg",
    apple: "/logo-svg.svg",
  },
};

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
