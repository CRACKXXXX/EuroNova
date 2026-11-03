import { ProjectCardSkeleton } from "@/components/Skeletons";
import { Rocket, ArrowLeft } from "lucide-react";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
      {/* 1. Header Navigation Skeleton */}
      <div className="mb-2">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
          <div className="w-24 h-4 rounded bg-void-border/50" />
        </div>
      </div>

      {/* 2. Page Title and Random Button Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Rocket className="w-8 h-8 text-plasma-cyan/40" />
            <div className="w-64 h-8 rounded-lg bg-void-border/60" />
          </div>
          <div className="w-80 h-4 rounded bg-void-border/40 mt-3" />
        </div>
        <div className="w-40 h-10 rounded-xl bg-void-border/50 shrink-0" />
      </div>

      {/* 3. Main Content: Sidebar + Grid */}
      <div className="flex flex-col lg:flex-row gap-6 mt-8">
        {/* Left Sidebar Filter Skeleton */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="p-5 rounded-2xl bg-void-surface border border-void-border space-y-6">
            <div className="w-32 h-5 rounded bg-void-border/60" />
            <div className="space-y-3">
              <div className="w-20 h-3 rounded bg-void-border/40" />
              <div className="w-full h-9 rounded-lg bg-void-border/40" />
            </div>
            <div className="space-y-3">
              <div className="w-24 h-3 rounded bg-void-border/40" />
              <div className="w-full h-9 rounded-lg bg-void-border/40" />
            </div>
            <div className="space-y-3">
              <div className="w-28 h-3 rounded bg-void-border/40" />
              <div className="w-full h-9 rounded-lg bg-void-border/40" />
            </div>
          </div>
        </div>

        {/* Right Project Grid Skeleton (6 items) */}
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-full">
                <ProjectCardSkeleton />
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="mt-10 pt-6 border-t border-void-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-48 h-4 rounded bg-void-border/40" />
            <div className="flex items-center gap-2">
              <div className="w-24 h-9 rounded-lg bg-void-border/40" />
              <div className="w-24 h-9 rounded-lg bg-void-border/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
