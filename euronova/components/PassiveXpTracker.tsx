"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { awardDailyEngagementXp } from "@/actions/gamification";

interface PassiveXpTrackerProps {
  userId?: string | null;
  role?: "youth" | "org";
}

/**
 * Sistema Pasivo de Recompensa de Engagement (+2 XP por sesión de navegación).
 * Límite estricto de +10 XP por día calendario tanto en cliente (localStorage)
 * como en base de datos (user_xp_logs) para evitar farming por refresco.
 */
export function PassiveXpTracker({ userId, role = "youth" }: PassiveXpTrackerProps) {
  const t = useTranslations("Leveling");
  const hasChecked = useRef(false);

  useEffect(() => {
    // Las organizaciones no acumulan XP de voluntario
    if (role !== "youth" || !userId || hasChecked.current) {
      return;
    }

    hasChecked.current = true;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const dateKey = `user_${userId}_passive_xp_date`;
      const countKey = `user_${userId}_passive_xp_total`;

      const lastDate = localStorage.getItem(dateKey);
      let todayTotal = 0;

      if (lastDate === today) {
        todayTotal = parseInt(localStorage.getItem(countKey) || "0", 10);
      } else {
        localStorage.setItem(dateKey, today);
        localStorage.setItem(countKey, "0");
        todayTotal = 0;
      }

      // Si ya alcanzó el límite diario de 10 XP, no consultar al servidor
      if (todayTotal >= 10) {
        return;
      }

      awardDailyEngagementXp().then((res) => {
        if (res.success && res.gained) {
          const updatedTotal = todayTotal + res.gained;
          localStorage.setItem(dateKey, today);
          localStorage.setItem(countKey, updatedTotal.toString());

          toast.success(
            t("dailyBonusToast", { gained: res.gained, total: updatedTotal }),
            { 
              icon: "✨",
              duration: 4500 
            }
          );

          if (res.leveledUp && res.level) {
            toast.success(t("levelUpToast", { level: res.level }), { 
              icon: "🚀",
              duration: 6000 
            });
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("euronova:xp-updated", { 
                detail: { xpGained: res.gained, level: res.level } 
              })
            );
          }
        } else if (res.dailyCapReached) {
          localStorage.setItem(dateKey, today);
          localStorage.setItem(countKey, "10");
        }
      }).catch(() => {});
    } catch {
      // LocalStorage access restricted in private mode
    }
  }, [userId, role, t]);

  return null;
}

export default PassiveXpTracker;
