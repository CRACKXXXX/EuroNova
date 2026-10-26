import type { Metadata } from "next";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { DonationBlock } from "@/components/DonationBlock";
import { SupportHeaderNav } from "@/components/SupportHeaderNav";
import { Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "EuroNova",
  description: "Support EuroNova: 100% free, zero ads platform connecting European youth to Erasmus+ and ESC mobility opportunities.",
};

export default async function SupportPage() {
  const t = await getTranslations("PublicSupport");
  return (
    <div className="min-h-screen flex flex-col bg-void-deep text-white selection:bg-plasma-cyan selection:text-void-deep">
      {/* Cabecera pública unificada */}
      <PublicHeader />

      {/* Contenido Principal con espaciado para compensar el header fijo */}
      <main className="flex-1 pt-24 sm:pt-28 pb-12 sm:pb-16">
        {/* Navegación y Breadcrumbs */}
        <SupportHeaderNav />

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nova-flare/10 border border-nova-flare/30 text-nova-flare text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
            <Heart className="w-3.5 h-3.5 fill-nova-flare/30" />
            <span>{t("badge")}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {t("titlePrefix")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-plasma-cyan via-hyper-violet to-nova-flare">{t("freeAndIndependent")}</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Dedicated Transparent Donations Engine */}
        <DonationBlock />
      </main>

      {/* Pie de página con enlaces legales y soporte */}
      <Footer />
    </div>
  );
}
