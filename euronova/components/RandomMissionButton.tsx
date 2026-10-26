"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dices, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getRandomProjectIdAction } from "@/actions/projects";

interface RandomMissionButtonProps {
  projectIds?: string[];
  className?: string;
}

export function RandomMissionButton({ projectIds = [], className = "" }: RandomMissionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("DashboardContent");

  const handleRandomize = () => {
    if (isPending) return;

    startTransition(async () => {
      try {
        let targetId: string | undefined;

        if (projectIds.length > 0) {
          const randomIndex = Math.floor(Math.random() * projectIds.length);
          targetId = projectIds[randomIndex];
        } else {
          const res = await getRandomProjectIdAction();
          if (res?.id) {
            targetId = res.id;
          }
        }

        if (targetId) {
          router.push(`/${locale}/dashboard/projects/${targetId}`);
        } else {
          toast.error("No active missions found to explore.");
        }
      } catch {
        toast.error("Could not fetch a random mission.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRandomize}
      disabled={isPending}
      className={`relative inline-flex items-center justify-center gap-2.5 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer select-none border border-plasma-cyan/40 bg-gradient-to-r from-hyper-violet/20 via-plasma-cyan/15 to-hyper-violet/20 hover:from-hyper-violet/30 hover:to-plasma-cyan/30 text-white shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:border-plasma-cyan focus-visible:ring-2 focus-visible:ring-plasma-cyan focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed group ${className}`}
      title={t("randomMission")}
      aria-label={t("randomMission")}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 text-plasma-cyan animate-spin" />
      ) : (
        <Dices className="w-4 h-4 text-plasma-cyan group-hover:rotate-180 transition-transform duration-500" />
      )}
      <span>{isPending ? t("rolling") : `🎲 ${t("randomMission")}`}</span>
    </button>
  );
}
