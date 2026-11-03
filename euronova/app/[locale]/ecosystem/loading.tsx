import { EcosystemGridSkeleton, ShimmerBeam } from "@/components/Skeletons";

export default function EcosystemLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header Skeleton */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-2 pb-4">
        <div className="w-64 sm:w-80 h-10 rounded-2xl bg-void-surface border border-void-border/80 mx-auto relative overflow-hidden">
          <ShimmerBeam />
        </div>
        <div className="w-80 sm:w-96 h-4 rounded-lg bg-void-surface border border-void-border/60 mx-auto relative overflow-hidden">
          <ShimmerBeam />
        </div>
      </div>

      {/* Filter Deck Skeleton (Search + 3 Dropdowns) */}
      <div className="bg-void-surface border border-void-border/80 rounded-2xl p-6 relative overflow-hidden space-y-6">
        <ShimmerBeam />
        {/* Search input dummy */}
        <div className="w-full h-12 rounded-xl bg-void-deep border border-void-border/60" />
        {/* 3 Dropdown Columns dummy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-void-border/60">
          <div className="h-11 rounded-xl bg-void-deep border border-void-border/60" />
          <div className="h-11 rounded-xl bg-void-deep border border-void-border/60" />
          <div className="h-11 rounded-xl bg-void-deep border border-void-border/60" />
        </div>
      </div>

      {/* Grid of 6 Resource Cards Skeleton */}
      <EcosystemGridSkeleton count={6} />
    </div>
  );
}

