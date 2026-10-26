import React from "react";

export function ProjectCardSkeleton() {
  return (
    <div className="animate-pulse bg-void-surface border border-void-border rounded-2xl p-5 flex flex-col h-[400px] justify-between relative overflow-hidden">
      {/* Sombra sutil interna */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/5 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header con Badges y Botones de Acción dummy */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-16 h-6 rounded-full bg-void-border/60" />
            <div className="w-24 h-6 rounded-full bg-void-border/40" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-void-border/50" />
            <div className="w-8 h-8 rounded-xl bg-void-border/50" />
          </div>
        </div>

        {/* 2. Título dummy */}
        <div className="space-y-2 mb-4">
          <div className="w-5/6 h-5 rounded-md bg-void-border/60" />
          <div className="w-3/5 h-5 rounded-md bg-void-border/40" />
        </div>

        {/* 3. Organización dummy */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-void-border/60 shrink-0" />
          <div className="w-32 h-4 rounded-md bg-void-border/40" />
        </div>

        {/* 4. Filas de metadatos (Ubicación, Edad, Duración) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-void-border/50 shrink-0" />
            <div className="w-36 h-4 rounded-md bg-void-border/40" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-void-border/50 shrink-0" />
            <div className="w-24 h-4 rounded-md bg-void-border/30" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-void-border/50 shrink-0" />
            <div className="w-20 h-4 rounded-md bg-void-border/30" />
          </div>
        </div>
      </div>

      {/* 5. Footer con presupuesto y botón dummy */}
      <div className="pt-4 border-t border-void-border/50 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="w-16 h-3 rounded bg-void-border/40" />
          <div className="w-24 h-5 rounded-md bg-void-border/60" />
        </div>
        <div className="w-28 h-9 rounded-xl bg-void-border/50" />
      </div>
    </div>
  );
}

export function ProjectsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-full">
          <ProjectCardSkeleton />
        </div>
      ))}
    </div>
  );
}
