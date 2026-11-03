import { Headphones } from "lucide-react";
import { ShimmerBeam } from "@/components/Skeletons";

export default function SupportLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Breadcrumb Skeleton */}
      <div className="mb-2">
        <div className="w-32 h-4 rounded bg-void-border/50" />
      </div>

      {/* Top Header Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-void-surface border border-hyper-violet/30 shadow-[0_0_40px_rgba(99,102,241,0.08)] relative overflow-hidden">
        <ShimmerBeam />
        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hyper-violet/15 border border-hyper-violet/40">
            <Headphones className="w-3.5 h-3.5 text-hyper-violet" />
            <div className="w-24 h-3 rounded bg-void-border/60" />
          </div>
          <div className="w-64 sm:w-80 h-9 rounded-xl bg-void-border/60" />
          <div className="w-72 sm:w-96 h-4 rounded bg-void-border/40" />
        </div>

        {/* View Switcher Tabs Skeleton */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-void-deep border border-void-border shrink-0 relative z-10">
          <div className="w-28 h-9 rounded-xl bg-hyper-violet/30" />
          <div className="w-28 h-9 rounded-xl bg-void-border/40" />
        </div>
      </div>

      {/* 2-Column Support Hub Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-2xl bg-void-surface border border-void-border space-y-3 relative overflow-hidden">
            <ShimmerBeam />
            <div className="w-full h-10 rounded-xl bg-void-deep border border-void-border/50" />
            <div className="flex gap-2">
              <div className="w-16 h-7 rounded-lg bg-void-border/50" />
              <div className="w-16 h-7 rounded-lg bg-void-border/40" />
              <div className="w-16 h-7 rounded-lg bg-void-border/40" />
            </div>
          </div>

          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-void-surface border border-void-border space-y-2.5 relative overflow-hidden"
              >
                <ShimmerBeam />
                <div className="flex items-center justify-between">
                  <div className="w-32 h-4 rounded bg-void-border/60" />
                  <div className="w-16 h-4 rounded-full bg-void-border/40" />
                </div>
                <div className="w-full h-3 rounded bg-void-border/40" />
                <div className="w-24 h-3 rounded bg-void-border/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Ticket Conversation Thread */}
        <div className="lg:col-span-2">
          <div className="p-6 sm:p-8 rounded-3xl bg-void-surface border border-void-border/80 space-y-6 relative overflow-hidden min-h-[500px]">
            <ShimmerBeam />
            {/* Thread Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-void-border/60">
              <div className="space-y-2">
                <div className="w-56 h-6 rounded-lg bg-void-border/70" />
                <div className="w-40 h-4 rounded bg-void-border/40" />
              </div>
              <div className="w-20 h-6 rounded-full bg-void-border/50" />
            </div>

            {/* Messages */}
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-2xl bg-void-deep border border-void-border/50 space-y-2 max-w-lg">
                <div className="w-24 h-3 rounded bg-void-border/50" />
                <div className="w-full h-4 rounded bg-void-border/40" />
                <div className="w-3/4 h-4 rounded bg-void-border/30" />
              </div>

              <div className="p-4 rounded-2xl bg-hyper-violet/10 border border-hyper-violet/30 space-y-2 max-w-lg ml-auto">
                <div className="w-28 h-3 rounded bg-hyper-violet/40" />
                <div className="w-full h-4 rounded bg-void-border/40" />
              </div>
            </div>

            {/* Reply Input Skeleton */}
            <div className="pt-6 border-t border-void-border/60 mt-auto">
              <div className="w-full h-20 rounded-2xl bg-void-deep border border-void-border/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

