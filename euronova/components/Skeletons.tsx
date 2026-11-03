import React from "react";

/**
 * High-tech cosmic animated beam overlay that sweeps across skeleton cards.
 */
export function ShimmerBeam({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="cosmic-shimmer-sweep" />
    </div>
  );
}

// ============================================================================
// 1. PROJECT CARD & GRID SKELETON (Search Projects / Favorites / Saved)
// ============================================================================

export function ProjectCardSkeleton() {
  return (
    <div className="bg-void-surface border border-void-border/80 rounded-2xl p-5 flex flex-col h-[400px] justify-between relative overflow-hidden shadow-lg">
      <ShimmerBeam />
      
      {/* Sombra sutil interna */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-plasma-cyan/5 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header con Badges y Botones de Acción */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-20 h-6 rounded-full bg-void-border/70" />
            <div className="w-28 h-6 rounded-full bg-void-border/50" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-void-border/60" />
            <div className="w-8 h-8 rounded-xl bg-void-border/60" />
          </div>
        </div>

        {/* 2. Título dummy */}
        <div className="space-y-2.5 mb-5">
          <div className="w-5/6 h-5 rounded-md bg-void-border/70" />
          <div className="w-3/5 h-5 rounded-md bg-void-border/50" />
        </div>

        {/* 3. Organización dummy */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-6 h-6 rounded-full bg-void-border/70 shrink-0" />
          <div className="w-36 h-4 rounded-md bg-void-border/50" />
        </div>

        {/* 4. Filas de metadatos (Ubicación, Edad, Duración) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-void-border/60 shrink-0" />
            <div className="w-40 h-4 rounded-md bg-void-border/50" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-void-border/60 shrink-0" />
            <div className="w-28 h-4 rounded-md bg-void-border/40" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-void-border/60 shrink-0" />
            <div className="w-24 h-4 rounded-md bg-void-border/40" />
          </div>
        </div>
      </div>

      {/* 5. Footer con presupuesto y botón dummy */}
      <div className="pt-4 border-t border-void-border/60 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="w-16 h-3 rounded bg-void-border/40" />
          <div className="w-28 h-5 rounded-md bg-void-border/70" />
        </div>
        <div className="w-28 h-9 rounded-xl bg-void-border/60" />
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

// ============================================================================
// 2. ORGANIZATION CARD & GRID SKELETON
// ============================================================================

export function OrganizationCardSkeleton() {
  return (
    <div className="bg-void-surface border border-void-border/80 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden shadow-lg space-y-5">
      <ShimmerBeam />
      
      <div className="flex items-start gap-4">
        {/* Avatar / Logo */}
        <div className="w-12 h-12 rounded-xl bg-void-border/70 shrink-0" />
        
        {/* Name and Badges */}
        <div className="flex-1 space-y-2">
          <div className="w-3/4 h-5 rounded-md bg-void-border/70" />
          <div className="flex items-center gap-2">
            <div className="w-24 h-4 rounded bg-void-border/50" />
            <div className="w-16 h-4 rounded-full bg-void-border/40" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 py-1">
        <div className="w-full h-3.5 rounded bg-void-border/50" />
        <div className="w-5/6 h-3.5 rounded bg-void-border/40" />
        <div className="w-2/3 h-3.5 rounded bg-void-border/30" />
      </div>

      {/* Footer Meta & Social Icons */}
      <div className="pt-4 border-t border-void-border/60 flex items-center justify-between gap-3 mt-auto">
        <div className="w-24 h-6 rounded-md bg-void-border/50" />
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-void-border/40" />
          <div className="w-7 h-7 rounded-lg bg-void-border/40" />
          <div className="w-7 h-7 rounded-lg bg-void-border/40" />
        </div>
      </div>
    </div>
  );
}

export function OrganizationsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-full">
          <OrganizationCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 3. ECOSYSTEM CARD & GRID SKELETON
// ============================================================================

export function EcosystemCardSkeleton() {
  return (
    <div className="bg-void-surface border border-void-border/80 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden shadow-lg space-y-4">
      <ShimmerBeam />

      {/* Top Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-20 h-5 rounded-full bg-void-border/70" />
          <div className="w-24 h-5 rounded-full bg-void-border/50" />
        </div>
        <div className="w-16 h-5 rounded bg-void-border/40" />
      </div>

      {/* Title */}
      <div className="w-3/4 h-6 rounded-md bg-void-border/70 my-1" />

      {/* Description */}
      <div className="space-y-2 flex-1">
        <div className="w-full h-3.5 rounded bg-void-border/50" />
        <div className="w-11/12 h-3.5 rounded bg-void-border/40" />
        <div className="w-4/5 h-3.5 rounded bg-void-border/30" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 py-1">
        <div className="w-14 h-4 rounded bg-void-border/40" />
        <div className="w-16 h-4 rounded bg-void-border/40" />
        <div className="w-12 h-4 rounded bg-void-border/40" />
      </div>

      {/* Action button */}
      <div className="pt-4 border-t border-void-border/60 mt-auto">
        <div className="w-full h-10 rounded-xl bg-void-border/60" />
      </div>
    </div>
  );
}

export function EcosystemGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="h-full">
          <EcosystemCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 4. DASHBOARD 3-1-3 GEOMETRIC SKELETON (Zero Cumulative Layout Shift)
// ============================================================================

export function Dashboard313Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8 space-y-10 animate-in fade-in duration-300">
      {/* Header Welcome text */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="w-72 sm:w-96 h-10 sm:h-12 rounded-2xl bg-void-surface border border-void-border/80 mx-auto relative overflow-hidden">
          <ShimmerBeam />
        </div>
        <div className="w-48 sm:w-64 h-5 rounded-lg bg-void-surface border border-void-border/60 mx-auto relative overflow-hidden">
          <ShimmerBeam />
        </div>
      </div>

      {/* 3-1-3 Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* ROW 1: Card 1 (Search Projects) */}
        <div className="col-span-1 bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden h-[260px]">
          <ShimmerBeam />
          <div className="w-16 h-16 rounded-full bg-void-border/70 mb-6" />
          <div className="w-44 h-6 rounded-md bg-void-border/70 mb-2" />
          <div className="w-56 h-4 rounded bg-void-border/40" />
        </div>

        {/* ROW 1: Card 2 (Mission Radar) */}
        <div className="col-span-1 bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden h-[260px]">
          <ShimmerBeam />
          <div className="w-16 h-16 rounded-full bg-void-border/70 mb-6" />
          <div className="w-40 h-6 rounded-md bg-void-border/70 mb-2" />
          <div className="w-52 h-4 rounded bg-void-border/40" />
        </div>

        {/* ROW 1: Card 3 (Ecosystem) */}
        <div className="col-span-1 bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden h-[260px]">
          <ShimmerBeam />
          <div className="w-16 h-16 rounded-full bg-void-border/70 mb-6" />
          <div className="w-44 h-6 rounded-md bg-void-border/70 mb-2" />
          <div className="w-60 h-4 rounded bg-void-border/40" />
        </div>

        {/* ROW 2: CENTERPIECE (My Profile - spans 3 cols) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left relative overflow-hidden h-[180px]">
          <ShimmerBeam />
          <div className="w-16 h-16 rounded-2xl bg-void-border/70 shrink-0" />
          <div className="space-y-2 max-w-xl w-full">
            <div className="w-48 h-7 rounded-lg bg-void-border/70 mx-auto md:mx-0" />
            <div className="w-full h-4 rounded bg-void-border/40" />
            <div className="w-3/4 h-4 rounded bg-void-border/30 mx-auto md:mx-0" />
          </div>
        </div>

        {/* ROW 3: Card 1 (Search Orgs) */}
        <div className="col-span-1 bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden h-[260px]">
          <ShimmerBeam />
          <div className="w-16 h-16 rounded-full bg-void-border/70 mb-6" />
          <div className="w-44 h-6 rounded-md bg-void-border/70 mb-2" />
          <div className="w-52 h-4 rounded bg-void-border/40" />
        </div>

        {/* ROW 3: Card 2 (My Missions) */}
        <div className="col-span-1 bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden h-[260px]">
          <ShimmerBeam />
          <div className="w-16 h-16 rounded-full bg-void-border/70 mb-6" />
          <div className="w-36 h-6 rounded-md bg-void-border/70 mb-2" />
          <div className="w-56 h-4 rounded bg-void-border/40" />
        </div>

        {/* ROW 3: Card 3 (Community Hub) */}
        <div className="col-span-1 bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden h-[260px]">
          <ShimmerBeam />
          <div className="w-16 h-16 rounded-full bg-void-border/70 mb-6" />
          <div className="w-48 h-6 rounded-md bg-void-border/70 mb-2" />
          <div className="w-52 h-4 rounded bg-void-border/40" />
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// 5. PROFILE VIEW SKELETON
// ============================================================================

export function ProfileViewSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Banner + Avatar */}
      <div className="bg-void-surface border border-void-border/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <ShimmerBeam />
        <div className="w-24 h-24 rounded-full bg-void-border/70 shrink-0" />
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <div className="w-48 h-7 rounded-lg bg-void-border/70 mx-auto sm:mx-0" />
          <div className="w-32 h-4 rounded bg-void-border/50 mx-auto sm:mx-0" />
          <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
            <div className="w-20 h-6 rounded-full bg-void-border/50" />
            <div className="w-24 h-6 rounded-full bg-void-border/50" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-void-border/60 pb-3">
        <div className="w-28 h-9 rounded-xl bg-void-border/60" />
        <div className="w-28 h-9 rounded-xl bg-void-border/40" />
        <div className="w-28 h-9 rounded-xl bg-void-border/40" />
      </div>

      {/* Profile Form Content */}
      <div className="bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <ShimmerBeam />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="w-24 h-4 rounded bg-void-border/50" />
            <div className="w-full h-11 rounded-xl bg-void-deep border border-void-border/60" />
          </div>
          <div className="space-y-2">
            <div className="w-24 h-4 rounded bg-void-border/50" />
            <div className="w-full h-11 rounded-xl bg-void-deep border border-void-border/60" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="w-32 h-4 rounded bg-void-border/50" />
          <div className="w-full h-24 rounded-xl bg-void-deep border border-void-border/60" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. PROJECT DETAIL SKELETON (Dossier View)
// ============================================================================

export function ProjectDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-void-surface border border-void-border/80 rounded-3xl p-6 sm:p-10 relative overflow-hidden space-y-6">
        <ShimmerBeam />
        <div className="flex items-center gap-2">
          <div className="w-24 h-6 rounded-full bg-void-border/70" />
          <div className="w-28 h-6 rounded-full bg-void-border/50" />
        </div>
        <div className="w-4/5 h-9 sm:h-11 rounded-xl bg-void-border/70" />
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-void-border/60 shrink-0" />
          <div className="w-48 h-5 rounded bg-void-border/50" />
        </div>
      </div>

      {/* Main Grid: Body & Sticky Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-void-surface border border-void-border/80 rounded-2xl p-6 sm:p-8 space-y-4 relative overflow-hidden">
            <ShimmerBeam />
            <div className="w-36 h-6 rounded bg-void-border/70" />
            <div className="space-y-2.5">
              <div className="w-full h-4 rounded bg-void-border/50" />
              <div className="w-11/12 h-4 rounded bg-void-border/40" />
              <div className="w-5/6 h-4 rounded bg-void-border/40" />
              <div className="w-4/5 h-4 rounded bg-void-border/30" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-void-surface border border-void-border/80 rounded-2xl p-6 space-y-5 relative overflow-hidden">
            <ShimmerBeam />
            <div className="w-32 h-5 rounded bg-void-border/70" />
            <div className="w-full h-12 rounded-xl bg-void-border/70" />
            <div className="space-y-3 pt-3 border-t border-void-border/60">
              <div className="flex justify-between">
                <div className="w-20 h-4 rounded bg-void-border/40" />
                <div className="w-16 h-4 rounded bg-void-border/50" />
              </div>
              <div className="flex justify-between">
                <div className="w-24 h-4 rounded bg-void-border/40" />
                <div className="w-20 h-4 rounded bg-void-border/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
