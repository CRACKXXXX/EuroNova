"use client";

import { useState } from "react";
import { MessageSquare, HelpCircle, Vote } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface CommunityTabWrapperProps {
  initialTab?: string;
  forumView: React.ReactNode;
  surveysView: React.ReactNode;
  faqView: React.ReactNode;
}

export function CommunityTabWrapper({
  initialTab = "forum",
  forumView,
  surveysView,
  faqView,
}: CommunityTabWrapperProps) {
  const t = useTranslations("Community");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") || initialTab;
  const [tab, setTab] = useState<string>(
    currentTab === "faq" ? "faq" : currentTab === "surveys" ? "surveys" : "forum"
  );

  const handleTabChange = (newTab: "forum" | "surveys" | "faq") => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* Tab Switcher Buttons */}
      <div className="flex flex-wrap items-center gap-3 border-b border-void-border/80 pb-4">
        <button
          type="button"
          onClick={() => handleTabChange("forum")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            tab === "forum"
              ? "bg-plasma-cyan text-void-deep shadow-[0_0_20px_rgba(0,229,255,0.3)]"
              : "bg-void-surface text-gray-400 hover:text-white border border-void-border hover:border-void-border/80"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t("tabForum")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("surveys")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            tab === "surveys"
              ? "bg-plasma-cyan text-void-deep shadow-[0_0_20px_rgba(0,229,255,0.3)]"
              : "bg-void-surface text-gray-400 hover:text-white border border-void-border hover:border-void-border/80"
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>{t("tabSurveys")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("faq")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            tab === "faq"
              ? "bg-plasma-cyan text-void-deep shadow-[0_0_20px_rgba(0,229,255,0.3)]"
              : "bg-void-surface text-gray-400 hover:text-white border border-void-border hover:border-void-border/80"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t("tabFaq")}</span>
        </button>
      </div>

      {/* Render Active View */}
      <div>
        {tab === "forum" ? forumView : tab === "surveys" ? surveysView : faqView}
      </div>
    </div>
  );
}
