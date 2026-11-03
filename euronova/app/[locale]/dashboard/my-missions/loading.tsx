import { Rocket } from "lucide-react";
import { ProjectsGridSkeleton } from "@/components/Skeletons";

export default function MyMissionsLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* 1. Header Banner Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-void-surface border border-void-border/70 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-border/40 border border-void-border/60">
            <Rocket className="w-3.5 h-3.5 text-plasma-cyan/40" />
            <div className="w-28 h-3 rounded bg-void-border/60" />
          </div>
          <div className="w-64 h-8 rounded-xl bg-void-border/60" />
          <div className="w-80 h-4 rounded bg-void-border/40" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-36 h-10 rounded-xl bg-void-border/50" />
        </div>
      </div>

      {/* 2. Folder Navigation Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-void-border/50">
        {[
          "w-24", // All
          "w-28", // Applied
          "w-24", // Saved
          "w-28", // Selected
          "w-28", // Completed
        ].map((w, idx) => (
          <div key={idx} className={`h-10 rounded-xl bg-void-border/40 shrink-0 ${w}`} />
        ))}
      </div>

      {/* 3. Search & Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80 h-10 rounded-xl bg-void-surface border border-void-border/70" />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-36 h-10 rounded-xl bg-void-surface border border-void-border/70" />
          <div className="w-36 h-10 rounded-xl bg-void-surface border border-void-border/70" />
        </div>
      </div>

      {/* 4. Projects Grid Skeleton (6 items) */}
      <ProjectsGridSkeleton count={6} />
    </div>
  );
}
