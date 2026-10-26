"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Users, Sparkles, CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserLevelBadge } from "@/components/UserLevelBadge";

interface MissionCompanionsSectionProps {
  projectTitle: string;
}

interface MockCompanion {
  id: string;
  name: string;
  country: string;
  flag: string;
  status: string;
  tag: string;
  level: number;
}

const MOCK_COMPANIONS: MockCompanion[] = [
  {
    id: "comp-1",
    name: "Elena R.",
    country: "Spain",
    flag: "🇪🇸",
    status: "Flight dossier confirmed",
    tag: "Airport Shuttle Buddy",
    level: 420,
  },
  {
    id: "comp-2",
    name: "Lukas M.",
    country: "Germany",
    flag: "🇩🇪",
    status: "Preparation pack completed",
    tag: "Roommate Match",
    level: 185,
  },
  {
    id: "comp-3",
    name: "Giulia B.",
    country: "Italy",
    flag: "🇮🇹",
    status: "ESC Dossier submitted",
    tag: "Looking for Squad",
    level: 312,
  },
];

const subscribe = () => () => {};

export function MissionCompanionsSection({ projectTitle }: MissionCompanionsSectionProps) {
  const t = useTranslations("ProjectDetails");
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const safeT = (key: string, fallback: string) => {
    try {
      const val = t(key);
      if (!val || val === `ProjectDetails.${key}` || val.endsWith(`.${key}`)) return fallback;
      return val;
    } catch {
      return fallback;
    }
  };

  const handleConnect = () => {
    startTransition(async () => {
      try {
        // Simulates P2P rendezvous handshake
        await new Promise((resolve) => setTimeout(resolve, 600));
        setIsConnected(true);
        setToastMessage(
          safeT(
            "companionsRequested",
            "P2P Mission Connection requested! You will be linked once registrations close."
          )
        );
        setTimeout(() => setToastMessage(null), 4500);
      } catch (err: unknown) {
        console.error("Failed to connect companion:", err);
      }
    });
  };

  return (
    <div className="bg-void-deep p-6 rounded-2xl border border-void-border space-y-6 relative overflow-hidden transition-all duration-300 hover:border-plasma-cyan/30">
      {/* Subtle ambient plasma glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-plasma-cyan/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Bar matching Mission Details & DistanceCalculator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-void-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <span>{safeT("missionCompanions", "Mission Companions & Travel Squad")}</span>
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {safeT("missionCompanionsSubtitle", "Coordinate travel and connect with peers")}
              {projectTitle ? ` • ${projectTitle}` : ""}
            </p>
          </div>
        </div>

        <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/30 shadow-[0_0_10px_rgba(0,229,255,0.1)]">
          P2P Rendezvous Active
        </span>
      </div>

      {/* 2. Companions Preview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MOCK_COMPANIONS.map((companion) => (
          <div
            key={companion.id}
            className="p-3 rounded-xl bg-void-surface/80 border border-void-border hover:border-plasma-cyan/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base select-none shrink-0" role="img" aria-label={companion.country}>
                  {companion.flag}
                </span>
                <span className="text-xs font-bold text-white truncate group-hover:text-plasma-cyan transition-colors">
                  {companion.name}
                </span>
              </div>
              <UserLevelBadge level={companion.level} size="sm" />
            </div>

            <div className="mt-2.5 space-y-1">
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/20">
                {companion.tag}
              </span>
              <p className="text-[10px] text-gray-400 truncate">
                {companion.status}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Action Bar with Morphing Connection Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-rup-emerald shrink-0" />
          <span className="text-[11px]">
            {safeT("verifiedVolunteersOnly", "Verified volunteers only. Direct P2P encrypted messaging.")}
          </span>
        </div>

        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnected || isPending}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
            isConnected
              ? "bg-rup-emerald/15 text-rup-emerald border border-rup-emerald/40 cursor-default shadow-[0_0_15px_rgba(0,230,118,0.2)]"
              : "bg-plasma-cyan text-void-deep hover:bg-plasma-cyan/90 shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] active:scale-95"
          } disabled:opacity-80`}
        >
          {isPending ? (
            <>
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>{t("linkingTelemetry")}</span>
            </>
          ) : isConnected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{safeT("connectedToSquad", "Squad Connected")}</span>
            </>
          ) : (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              <span>{safeT("connectWithSquad", "Join Travel Squad")}</span>
            </>
          )}
        </button>
      </div>

      {/* Cosmic Toast Notification */}
      {toastMessage && mounted && createPortal(
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="bg-void-surface/90 border border-plasma-cyan/60 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_0_35px_rgba(0,229,255,0.3)] flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-xl bg-plasma-cyan/20 border border-plasma-cyan/50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-plasma-cyan" />
            </div>
            <p className="text-xs text-gray-200 leading-snug">
              {toastMessage}
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
