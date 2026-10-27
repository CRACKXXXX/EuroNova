import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getGlobalCategories, getUserForumEligibility, getCategoryThreads } from "@/actions/globalForum";
import { getCommunitySurveysAction } from "@/actions/surveys";
import { GlobalForumView } from "@/components/GlobalForumView";
import { CommunitySurveysView } from "@/components/CommunitySurveysView";
import { ErasmusFaqSection } from "@/components/ErasmusFaqSection";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CommunityTabWrapper } from "./CommunityTabWrapper";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "EuroNova",
  description:
    "Connect with European volunteers, find travel companions, coordinate NGO initiatives, and explore the complete Erasmus+ and ESC FAQ knowledge base.",
};

interface CommunityPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CommunityPage({ params, searchParams }: CommunityPageProps) {
  const [{ locale }, resolvedParams, t, supabase] = await Promise.all([
    params,
    searchParams,
    getTranslations("Community"),
    createClient(),
  ]);

  const rawTab = resolvedParams?.tab;
  const validTabs = ["forum", "surveys", "faq"];
  const activeTab = typeof rawTab === "string" && validTabs.includes(rawTab.toLowerCase())
    ? rawTab.toLowerCase()
    : "forum";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [categoriesRes, eligibility, surveysRes] = await Promise.all([
    getGlobalCategories(),
    getUserForumEligibility(),
    getCommunitySurveysAction(1, 50),
  ]);

  const categories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : [];
  const firstCategoryId = categories[0]?.id;

  const initialThreadsRes = firstCategoryId
    ? await getCategoryThreads(firstCategoryId)
    : { success: true, data: [] };

  const initialThreads = initialThreadsRes.success && initialThreadsRes.data
    ? initialThreadsRes.data
    : [];

  const isAdmin = user.email === "euronovaofficial@gmail.com";
  const isOrg = eligibility.role === "coordinator";
  const effectiveRole = isAdmin ? "admin" : (eligibility.userRole || eligibility.role);

  return (
    <div className="min-h-screen bg-void-deep text-white flex flex-col relative selection:bg-plasma-cyan/20 selection:text-plasma-cyan">
      {/* 1. Header Autenticado */}
      <Header role={isOrg ? "org" : "youth"} isAdmin={isAdmin} />

      {/* Background Glows */}
      <div className="absolute top-20 left-1/4 w-[450px] h-[450px] bg-hyper-violet/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-plasma-cyan/10 rounded-full blur-[140px] pointer-events-none" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-20 space-y-8 z-10">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: t("home"), href: `/${locale}/dashboard` },
            { label: t("communityHub") },
          ]}
        />

        {/* Hero Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10px] font-bold bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            <span>{t("badge")}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Global Community <span className="text-plasma-cyan">{t("titleHub")}</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mt-2 leading-relaxed">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Dynamic Content */}
        <CommunityTabWrapper
          initialTab={activeTab}
          forumView={
            <GlobalForumView
              initialCategories={categories}
              initialThreads={initialThreads}
              initialPagination={initialThreadsRes.pagination}
              userEligibility={eligibility}
            />
          }
          surveysView={
            <CommunitySurveysView
              initialData={surveysRes}
              currentUserId={user.id}
              user={{ id: user.id, role: effectiveRole }}
              userRole={effectiveRole}
            />
          }
          faqView={<ErasmusFaqSection />}
        />
      </main>

      {/* 2. Footer Completo de EuroNova */}
      <Footer />
    </div>
  );
}
