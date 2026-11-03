import { OrganizationsGridSkeleton, ShimmerBeam } from "@/components/Skeletons";

export default function OrganizationsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="bg-void-surface border border-void-border/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <ShimmerBeam />
        <div className="space-y-3">
          <div className="w-24 h-5 rounded-full bg-void-border/70" />
          <div className="w-64 h-8 rounded-xl bg-void-border/70" />
          <div className="w-80 h-4 rounded bg-void-border/50" />
        </div>
        <div className="w-36 h-10 rounded-xl bg-void-border/60 shrink-0" />
      </div>

      {/* Grid of 6 Organization Cards */}
      <OrganizationsGridSkeleton count={6} />
    </div>
  );
}

