import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import type { Metadata } from "next";
import { Link, routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import {
  MotionDiv,
  MotionSection,
} from "@/components/LandingMotion";
import {
  Rocket,
  Sparkles,
  Plane,
  Building2,
  ShieldCheck,
  Compass,
  MessageSquare,
  HelpCircle,
  Award,
  Headphones,
  CheckCircle2,
  Heart,
  Globe2,
  MapPin,
  Server,
  Users2,
} from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  const languageAlternates: Record<string, string> = {};
  for (const l of routing.locales) {
    languageAlternates[l] = `/${l}`;
  }
  languageAlternates["x-default"] = `/${routing.defaultLocale}`;

  const title = "EuroNova — European Mobility Gateway";
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: languageAlternates,
    },
    openGraph: {
      title,
      description,
      url: `/${locale}`,
      siteName: "EuroNova",
      locale,
      images: [
        {
          url: "/logo-big.png",
          width: 1200,
          height: 630,
          alt: "EuroNova — European Youth Mobility Gateway",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo-big.png"],
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching projects count from Supabase:", error);
  }

  const projectCount = typeof count === "number" && count > 0 ? count : 50;

  return (
    <div className="min-h-screen bg-void-deep text-white flex flex-col relative selection:bg-plasma-cyan/25 selection:text-plasma-cyan overflow-hidden">
      {/* Public Header (Logo & Language Switcher only) */}
      <PublicHeader />

      {/* Cosmic Nebula Ambient Lighting */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-hyper-violet/12 rounded-full blur-[220px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[750px] h-[750px] bg-plasma-cyan/10 rounded-full blur-[240px] pointer-events-none -z-10" />
      <div className="fixed top-2/3 left-1/3 w-[700px] h-[700px] bg-rup-emerald/10 rounded-full blur-[200px] pointer-events-none -z-10" />

      <main className="flex-1 flex flex-col items-center pt-28 sm:pt-36 pb-32 px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto w-full z-10 space-y-28 sm:space-y-40">

        {/* ============================================================ */}
        {/* A. BETA SYSTEM BANNER                                        */}
        {/* ============================================================ */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-4xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 rounded-2xl bg-void-surface/80 border border-plasma-cyan/30 backdrop-blur-xl shadow-[0_0_30px_rgba(0,229,255,0.08)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-plasma-cyan/20 text-plasma-cyan border border-plasma-cyan/40 shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "6s" }} />
                <span>{t("betaBadge")}</span>
              </span>
              <p className="text-xs sm:text-sm text-gray-300 font-medium text-center sm:text-left leading-relaxed">
                {t("betaText")}
              </p>
            </div>
            <span className="text-[11px] font-mono text-gray-500 whitespace-nowrap hidden sm:inline-block">
              v1.0-genesis
            </span>
          </div>
        </MotionDiv>

        {/* ============================================================ */}
        {/* B. HERO SECTION (WITH THE ONLY ACTION BUTTON ON THE PAGE)    */}
        {/* ============================================================ */}
        <MotionSection
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center text-center space-y-8 sm:space-y-10 max-w-4xl mx-auto w-full pt-4"
        >
          {/* Main Logo with Ambient Glow */}
          <div className="relative group my-2">
            <div className="absolute -inset-6 bg-gradient-to-r from-plasma-cyan/30 via-hyper-violet/30 to-plasma-cyan/30 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <Image
              src="/logo-big.png"
              alt={t("logoAlt")}
              width={420}
              height={110}
              priority
              sizes="(max-width: 640px) 280px, 420px"
              style={{ width: "auto", height: "auto" }}
              className="relative w-auto h-auto max-w-[280px] sm:max-w-[420px] drop-shadow-[0_0_40px_rgba(0,229,255,0.35)]"
            />
            <h1 className="sr-only">{t("heroH1")}</h1>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
              {t("title")}
            </h2>
            <p className="text-base sm:text-xl text-gray-300 font-light max-w-3xl mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Live Telemetry Counter: Projects in Orbit */}
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-void-surface/80 backdrop-blur-2xl border border-void-border rounded-3xl p-6 sm:p-8 w-full max-w-md my-2 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-plasma-cyan/50 transition-colors"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rup-emerald animate-ping" />
              <span>{t("projectsInOrbit")}</span>
            </p>
            <p className="text-5xl sm:text-6xl font-black text-plasma-cyan flex items-center justify-center gap-3 drop-shadow-[0_0_30px_rgba(0,229,255,0.4)]">
              {projectCount}+
            </p>
            <p className="text-[11px] text-gray-400 font-mono mt-2 uppercase tracking-wider">
              {t("projectsInOrbitSub")}
            </p>
          </MotionDiv>

          {/* THE SOLE & EXCLUSIVE ACTION BUTTON ON THE ENTIRE LANDING PAGE (HERO CTA) */}
          <div className="pt-8 w-full flex items-center justify-center">

            {/* LA CARD / CAJA CON BORDES QUE ENVUELVE EL BOTÓN */}
            <div className="bg-transparent border border-transparent shadow-none rounded-3xl p-8 flex items-center justify-center transition-all duration-300">
              {/* EL BOTÓN REAL DENTRO DE LA CARD */}
              <Link
                href="/login"
                className="group flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 transition-all duration-300 hover:bg-cyan-500/20 hover:text-cyan-300 hover:scale-105 active:scale-95"
              >
                <span className="font-extrabold text-lg sm:text-xl tracking-wide text-center break-words sm:whitespace-nowrap min-w-0">
                  {t("singleCta")}
                </span>
                <Rocket className="w-6 h-6 shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>

            </div>

          </div>
        </MotionSection>

        {/* ============================================================ */}
        {/* C. THE INITIATIVE (WHO & WHY)                                */}
        {/* ============================================================ */}
        <MotionSection
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-5xl mx-auto"
        >
          <div className="bg-gradient-to-br from-void-surface/90 via-void-surface/70 to-void-deep/90 border border-void-border rounded-3xl p-8 sm:p-14 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] relative overflow-hidden space-y-8">
            <div className="absolute top-0 right-0 w-96 h-96 bg-hyper-violet/15 rounded-full blur-[140px] pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/30 uppercase tracking-widest">
              <Compass className="w-4 h-4" />
              <span>{t("initiativeBadge")}</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
              {t("initiativeTitle")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm sm:text-base text-gray-300 leading-relaxed font-light">
              <p>{t("initiativeDesc1")}</p>
              <p>{t("initiativeDesc2")}</p>
            </div>

            {/* Sub-Card: Community Staff Recruitment */}
            <div className="p-6 sm:p-8 rounded-2xl bg-void-deep/80 border border-void-border/80 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30">
                  {t("initiativeStaffBadge")}
                </span>
                <h4 className="text-base font-bold text-white">
                  {t("initiativeStaffTitle")}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
                {t("initiativeStaffDesc")}
              </p>
            </div>

            {/* Integrity & Value Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-void-border/60">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-200">
                <CheckCircle2 className="w-4 h-4 text-rup-emerald shrink-0" />
                <span>{t("tagFree")}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-200">
                <CheckCircle2 className="w-4 h-4 text-plasma-cyan shrink-0" />
                <span>{t("tagZeroPaywall")}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-200">
                <CheckCircle2 className="w-4 h-4 text-hyper-violet shrink-0" />
                <span>{t("tagNoIntermediaries")}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-200">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t("tagCommunityStaff")}</span>
              </div>
            </div>
          </div>
        </MotionSection>

        {/* ============================================================ */}
        {/* D. FOR VOLUNTEERS & YOUTH (OUTERMOST REGIONS FOCUS)           */}
        {/* ============================================================ */}
        <MotionSection
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl mx-auto space-y-12"
        >
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-widest">
              <Plane className="w-4 h-4" />
              <span>{t("youthBadge")}</span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {t("youthTitle")}
            </h3>
            <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed">
              {t("youthSubtitle")}
            </p>
          </div>

          {/* Responsive Grid with Generous Padding */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1: Fully Funded Travel */}
            <div className="bg-void-surface/80 border border-void-border hover:border-plasma-cyan/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_20px_rgba(0,229,255,0.2)] mb-4">
                <Globe2 className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">
                {t("youthPoint1Title")}
              </h4>
              <p className="text-sm text-gray-300 font-light leading-relaxed mb-6">
                {t("youthPoint1Desc")}
              </p>
              <div className="mt-auto pt-6 border-t border-void-border/50 flex items-center gap-2 text-xs text-plasma-cyan font-mono">
                <span>{t("tagGrantFunded")}</span>
              </div>
            </div>

            {/* Card 2: CRITICAL - Outermost Regions (ORs) Priority */}
            <div className="bg-void-surface/80 border border-rup-emerald/40 hover:border-rup-emerald backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-rup-emerald/20 border border-rup-emerald/40 flex items-center justify-center text-rup-emerald shadow-[0_0_20px_rgba(0,230,118,0.25)] mb-4">
                <MapPin className="w-7 h-7" />
              </div>
              <div className="mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-rup-emerald block mb-1">
                  {t("tagEuDirective")}
                </span>
                <h4 className="text-xl font-bold text-white">
                  {t("youthPoint2Title")}
                </h4>
              </div>
              <p className="text-sm text-gray-200 font-light leading-relaxed mb-6">
                {t("youthPoint2Desc")}
              </p>
              <div className="mt-auto pt-6 border-t border-rup-emerald/20 flex items-center gap-2 text-xs text-rup-emerald font-mono">
                <span>{t("tagCanaryRegions")}</span>
              </div>
            </div>

            {/* Card 3: Authentic Peer Feedback */}
            <div className="bg-void-surface/80 border border-void-border hover:border-hyper-violet/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)] md:col-span-2 lg:col-span-1 flex flex-col h-full p-8 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center text-hyper-violet shadow-[0_0_20px_rgba(99,102,241,0.2)] mb-4">
                <Users2 className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">
                {t("youthPoint3Title")}
              </h4>
              <p className="text-sm text-gray-300 font-light leading-relaxed mb-6">
                {t("youthPoint3Desc")}
              </p>
              <div className="mt-auto pt-6 border-t border-void-border/50 flex items-center gap-2 text-xs text-hyper-violet font-mono">
                <span>{t("tagDirectSquad")}</span>
              </div>
            </div>
          </div>
        </MotionSection>

        {/* ============================================================ */}
        {/* E. FOR ORGANIZATIONS & NGOS (VERIFIED OID ECOSYSTEM)         */}
        {/* ============================================================ */}
        <MotionSection
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl mx-auto space-y-12"
        >
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-hyper-violet/15 text-hyper-violet border border-hyper-violet/30 uppercase tracking-widest">
              <Building2 className="w-4 h-4" />
              <span>{t("orgsBadge")}</span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {t("orgsTitle")}
            </h3>
            <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed">
              {t("orgsSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* OID Verification Standard */}
            <div className="bg-void-surface/80 border border-void-border hover:border-hyper-violet/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center text-hyper-violet">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white">
                  {t("orgPoint1Title")}
                </h4>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  {t("orgPoint1Desc")}
                </p>
              </div>
              <div className="mt-auto pt-6 border-t border-void-border/50 text-xs text-hyper-violet font-mono">
                {t("tagRegistryValidation")}
              </div>
            </div>

            {/* Pan-European Reach */}
            <div className="bg-void-surface/80 border border-void-border hover:border-plasma-cyan/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan">
                  <Globe2 className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white">
                  {t("orgPoint2Title")}
                </h4>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  {t("orgPoint2Desc")}
                </p>
              </div>
              <div className="mt-auto pt-6 border-t border-void-border/50 text-xs text-plasma-cyan font-mono">
                {t("tagPanEuropeanReach")}
              </div>
            </div>

            {/* Candidate Dashboard */}
            <div className="bg-void-surface/80 border border-void-border hover:border-rup-emerald/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)] md:col-span-2 lg:col-span-1 flex flex-col h-full p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rup-emerald/15 border border-rup-emerald/30 flex items-center justify-center text-rup-emerald">
                  <Award className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white">
                  {t("orgPoint3Title")}
                </h4>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  {t("orgPoint3Desc")}
                </p>
              </div>
              <div className="mt-auto pt-6 border-t border-void-border/50 text-xs text-rup-emerald font-mono">
                {t("tagVerifiedRouting")}
              </div>
            </div>
          </div>
        </MotionSection>

        {/* ============================================================ */}
        {/* F. PLATFORM INNOVATIONS (RESPONSIVE NON-COLLAPSING GRID)     */}
        {/* ============================================================ */}
        <MotionSection
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl mx-auto space-y-12"
        >
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-plasma-cyan/15 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>{t("featuresBadge")}</span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {t("featuresTitle")}
            </h3>
            <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed">
              {t("featuresSubtitle")}
            </p>
          </div>

          {/* Balanced Responsive Grid: Never collapses into vertical strips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">

            {/* Bento Card 1: Erasmus+ Info & Dynamic FAQ */}
            <div className="bg-gradient-to-br from-void-surface/90 to-void-deep/90 border border-void-border hover:border-plasma-cyan/50 backdrop-blur-2xl transition-all duration-300 shadow-[0_0_35px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  <HelpCircle className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-bold text-white">
                  {t("featFaqTitle")}
                </h4>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  {t("featFaqDesc")}
                </p>
              </div>
              <div className="mt-auto pt-6 flex flex-wrap gap-2 border-t border-void-border/50 text-xs font-mono text-gray-400">
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagGreenTravel")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagYouthpass")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagHealthCoverage")}</span>
              </div>
            </div>

            {/* Bento Card 2: Global Community Forums */}
            <div className="bg-gradient-to-br from-void-surface/90 to-void-deep/90 border border-void-border hover:border-hyper-violet/50 backdrop-blur-2xl transition-all duration-300 shadow-[0_0_35px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-hyper-violet/15 border border-hyper-violet/30 flex items-center justify-center text-hyper-violet shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-bold text-white">
                  {t("featForumTitle")}
                </h4>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  {t("featForumDesc")}
                </p>
              </div>
              <div className="mt-auto pt-6 flex flex-wrap gap-2 border-t border-void-border/50 text-xs font-mono text-gray-400">
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagFlightCoord")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagLuggageAdvice")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagCulturalExchange")}</span>
              </div>
            </div>

            {/* Bento Card 3: True Trust Protocol 0-100 XP */}
            <div className="bg-gradient-to-br from-void-surface/90 to-void-deep/90 border border-void-border hover:border-rup-emerald/50 backdrop-blur-2xl transition-all duration-300 shadow-[0_0_35px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rup-emerald/15 border border-rup-emerald/30 flex items-center justify-center text-rup-emerald shadow-[0_0_20px_rgba(0,230,118,0.2)]">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-bold text-white">
                  {t("featTrustTitle")}
                </h4>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  {t("featTrustDesc")}
                </p>
              </div>
              <div className="mt-auto pt-6 flex flex-wrap gap-2 border-t border-void-border/50 text-xs font-mono text-gray-400">
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagGamification")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagAntiSpam")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagStaffEligibility")}</span>
              </div>
            </div>

            {/* Bento Card 4: Direct Support & Problem Solving */}
            <div className="bg-gradient-to-br from-void-surface/90 to-void-deep/90 border border-void-border hover:border-plasma-cyan/50 backdrop-blur-2xl transition-all duration-300 shadow-[0_0_35px_rgba(0,0,0,0.5)] flex flex-col h-full p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  <Headphones className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-bold text-white">
                  {t("featSupportTitle")}
                </h4>
                <p className="text-sm text-gray-300 font-light leading-relaxed">
                  {t("featSupportDesc")}
                </p>
              </div>
              <div className="mt-auto pt-6 flex flex-wrap gap-2 border-t border-void-border/50 text-xs font-mono text-gray-400">
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagDisputeEscalation")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagDiscordWebhooks")}</span>
                <span className="px-3 py-1.5 rounded-lg bg-void-deep border border-void-border">{t("tagAutoPurgePrivacy")}</span>
              </div>
            </div>

          </div>
        </MotionSection>

        {/* ============================================================ */}
        {/* G. LEGAL, HOW TO SUPPORT & DONATIONS                         */}
        {/* ============================================================ */}
        <MotionSection
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-5xl mx-auto space-y-8"
        >
          <div className="bg-gradient-to-br from-void-surface/90 via-void-surface/70 to-void-deep/90 border border-void-border rounded-3xl p-8 sm:p-14 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.7)] space-y-10">

            {/* Header: Transparency & Sustainability */}
            <div className="space-y-4 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/30 uppercase tracking-widest">
                <Heart className="w-4 h-4 text-rup-emerald" />
                <span>{t("legalBadge")}</span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {t("legalTitle")}
              </h3>
              <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed">
                {t("legalDesc")}
              </p>
            </div>

            {/* HIGHLIGHTED DEDICATED DONATIONS & SERVER SUSTAINABILITY BLOCK */}
            <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-plasma-cyan/10 via-void-deep/90 to-hyper-violet/10 border border-plasma-cyan/30 shadow-[0_0_40px_rgba(0,229,255,0.1)] space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-plasma-cyan/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-plasma-cyan/20 border border-plasma-cyan/40 flex items-center justify-center text-plasma-cyan shrink-0 shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold text-white">
                    {t("donationsTitle")}
                  </h4>
                  <span className="text-[11px] font-mono text-plasma-cyan uppercase tracking-wider">
                    {t("tagCommunityFunded")}
                  </span>
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-light relative z-10">
                {t("donationsDesc")}
              </p>
            </div>

            {/* Two-Column Grid: How to Help & Legal Disclaimer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-void-border/60">
              {/* How to support */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-plasma-cyan" />
                  <span>{t("howToHelpTitle")}</span>
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
                  {t("howToHelpDesc")}
                </p>
              </div>

              {/* Legal disclaimer */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-hyper-violet" />
                  <span>{t("legalDisclaimerTitle")}</span>
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
                  {t("legalDisclaimerDesc")}
                </p>
              </div>
            </div>

          </div>
        </MotionSection>

      </main>

      {/* Global Minimalist Footer */}
      <Footer />
    </div>
  );
}
