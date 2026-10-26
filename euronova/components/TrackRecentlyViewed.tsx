"use client";

import { useEffect } from "react";

export interface ViewedProject {
  id: string;
  title: string;
  dest_country?: string;
  project_type?: string;
  duration_days?: number;
  org_name?: string;
  image_url?: string | null;
  timestamp: number;
}

const MAX_ITEMS = 8;

export function TrackRecentlyViewed({
  project,
  userId,
}: {
  project: Omit<ViewedProject, "timestamp">;
  userId?: string | null;
}) {
  useEffect(() => {
    try {
      const storageKey = userId ? `euronova_recently_viewed_${userId}` : `euronova_recently_viewed_guest`;
      const raw = localStorage.getItem(storageKey);
      let list: ViewedProject[] = raw ? JSON.parse(raw) : [];

      // Filtrar duplicados del mismo ID
      list = list.filter((p) => p.id !== project.id);

      // Añadir al inicio con timestamp actual
      list.unshift({
        ...project,
        timestamp: Date.now(),
      });

      // Limitar a los últimos 8 elementos
      if (list.length > MAX_ITEMS) {
        list = list.slice(0, MAX_ITEMS);
      }

      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
      // Ignorar errores de acceso a localStorage en modo incógnito estricto
    }
  }, [project, userId]);

  return null;
}
