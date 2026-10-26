"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface ScrollRestorationHelperProps {
  storageKey?: string;
}

export function ScrollRestorationHelper({
  storageKey = "euronova_projects_scroll_position",
}: ScrollRestorationHelperProps) {
  const pathname = usePathname();
  const isRestoredRef = useRef(false);

  // 1. Restaurar posición de scroll guardada al montar el componente
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedPosition = sessionStorage.getItem(storageKey);
      if (savedPosition && !isRestoredRef.current) {
        const targetY = parseInt(savedPosition, 10);
        if (!isNaN(targetY) && targetY > 0) {
          // Usar doble frame para asegurar que el DOM de las tarjetas haya hidratado
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({
                top: targetY,
                behavior: "instant",
              });
              isRestoredRef.current = true;
            });
          });
        }
      }
    } catch {
      // Ignorar fallos de acceso a sessionStorage
    }
  }, [pathname, storageKey]);

  // 2. Escuchar eventos de scroll y guardar la posición periódicamente
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          if (window.scrollY > 0) {
            sessionStorage.setItem(storageKey, window.scrollY.toString());
          }
        } catch {
          // Ignorar fallos de sessionStorage
        }
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [storageKey]);

  return null;
}
