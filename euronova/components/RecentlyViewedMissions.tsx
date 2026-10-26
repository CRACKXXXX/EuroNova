"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { History, Trash2, ArrowUpRight, Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";
import { ViewedProject } from "./TrackRecentlyViewed";
import { createClient } from "@/utils/supabase/client";

interface RecentlyViewedMissionsProps {
  userId?: string | null;
}

const subscribe = () => () => {};

export function RecentlyViewedMissions({ userId: initialUserId }: RecentlyViewedMissionsProps = {}) {
  const t = useTranslations("Profile");
  const [items, setItems] = useState<ViewedProject[]>([]);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [internalUserId, setInternalUserId] = useState<string | null>(null);

  const effectiveUserId = initialUserId !== undefined ? initialUserId : internalUserId;

  const safeT = (key: string, fallback: string) => {
    try {
      const val = t(key);
      if (!val || val === `Profile.${key}` || val.endsWith(`.${key}`)) return fallback;
      return val;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (initialUserId !== undefined) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setInternalUserId(user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setInternalUserId(session?.user?.id ?? null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [initialUserId]);

  const storageKey = effectiveUserId ? `euronova_recently_viewed_${effectiveUserId}` : `euronova_recently_viewed_guest`;

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          setItems(JSON.parse(raw));
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      }
    });
    return () => {
      ignore = true;
    };
  }, [storageKey]);

  const handleClear = () => {
    try {
      localStorage.removeItem(storageKey);
      setItems([]);
    } catch {
      // Ignorar
    }
  };

  if (!mounted) return null;

  return (
    <div className="mt-12 pt-8 border-t border-void-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-plasma-cyan" />
            <span>{safeT("recentlyViewed", "Recently Viewed Missions")}</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {safeT("recentlyViewedDesc", "Planetary mission transmissions you have explored recently.")}
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClear}
            type="button"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-nova-flare transition-colors px-2.5 py-1 rounded-lg border border-void-border hover:border-nova-flare/40 cursor-pointer"
            title={t("clearHistory")}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t("clearHistory")}</span>
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {items.map((project) => {
            const countryObj = COUNTRIES.find((c) => c.code === project.dest_country);
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group p-3.5 rounded-xl bg-void-deep/80 border border-void-border hover:border-plasma-cyan/50 hover:shadow-[0_0_15px_rgba(0,229,255,0.15)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-plasma-cyan bg-plasma-cyan/10 border border-plasma-cyan/30 px-2 py-0.5 rounded-full">
                      {project.project_type || "MISSION"}
                    </span>
                    {countryObj && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-300">
                        <Image
                          src={countryObj.flagUrl}
                          alt={countryObj.name}
                          width={14}
                          height={10}
                          unoptimized
                          style={{ width: "auto", height: "auto" }}
                          className="w-3.5 h-auto rounded-[2px]"
                        />
                        <span className="truncate max-w-[80px]">{countryObj.name}</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-plasma-cyan transition-colors line-clamp-2 leading-snug">
                    {project.title}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-void-border/50 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="truncate max-w-[120px]">{project.org_name || "EuroNova"}</span>
                  <span className="flex items-center gap-0.5 text-plasma-cyan font-semibold group-hover:translate-x-0.5 transition-transform">
                    View <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-void-border bg-void-deep/40 text-center">
          <Compass className="w-8 h-8 text-gray-500 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {safeT("noRecentlyViewed", "No recently viewed missions yet. Explore new opportunities on your radar!")}
          </p>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-plasma-cyan hover:underline"
          >
            Explore Missions <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
