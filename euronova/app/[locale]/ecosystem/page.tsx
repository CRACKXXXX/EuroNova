import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/server";
import { Header } from "@/components/Header";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EcosystemDirectoryClient } from "./EcosystemDirectoryClient";
import { Globe } from "lucide-react";

interface EcosystemPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: EcosystemPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Ecosystem" });

  const languageAlternates: Record<string, string> = {};
  for (const l of routing.locales) {
    languageAlternates[l] = `/${l}/ecosystem`;
  }
  languageAlternates["x-default"] = `/${routing.defaultLocale}/ecosystem`;

  return {
    title: "EuroNova",
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}/ecosystem`,
      languages: languageAlternates,
    },
    openGraph: {
      title: "EuroNova",
      description: t("subtitle"),
      url: `/${locale}/ecosystem`,
      siteName: "EuroNova",
      locale,
      images: [
        {
          url: "/logo-big.png",
          width: 1200,
          height: 630,
          alt: "EuroNova — External Erasmus+ Ecosystem",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "EuroNova",
      description: t("subtitle"),
      images: ["/logo-big.png"],
    },
  };
}

export default async function EcosystemPage({ params }: EcosystemPageProps) {
  const { locale } = await params;
  const [t, supabase] = await Promise.all([
    getTranslations({ locale, namespace: "Ecosystem" }),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOrg = false;
  let isAdmin = false;

  if (user) {
    isAdmin = user.email === "euronovaofficial@gmail.com";
    const { data: orgData } = await supabase
      .from("users_org")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (orgData) {
      isOrg = true;
    }
  }

  return (
    <div className="min-h-screen bg-void-deep text-white flex flex-col relative selection:bg-plasma-cyan/25 selection:text-plasma-cyan">
      {/* Navigation Header: Contextual (Public vs Authenticated) */}
      {user ? (
        <Header role={isOrg ? "org" : "youth"} isAdmin={isAdmin} />
      ) : (
        <PublicHeader />
      )}

      {/* Cosmic Nebula Ambient Lighting */}
      <div className="fixed top-0 left-1/4 w-[700px] h-[700px] bg-plasma-cyan/10 rounded-full blur-[220px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[650px] h-[650px] bg-hyper-violet/12 rounded-full blur-[240px] pointer-events-none -z-10" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-2">
          <Breadcrumbs items={[{ label: t("title") }]} />
        </div>

        {/* Hero Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-2 pb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-widest animate-pulse">
            <Globe className="w-4 h-4 text-plasma-cyan" />
            <span>{t("badge")}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {t("title")}
          </h1>

          <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Client-Side Interactive Filter Deck & Card Grid */}
        <EcosystemDirectoryClient />
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

