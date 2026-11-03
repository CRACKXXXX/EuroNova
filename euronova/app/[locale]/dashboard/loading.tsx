import { LayoutDashboard } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* 1. Dashboard Sub-page Header Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-void-surface border border-void-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-border/40 border border-void-border/60">
            <LayoutDashboard className="w-3.5 h-3.5 text-plasma-cyan/40" />
            <div className="w-28 h-3 rounded bg-void-border/60" />
          </div>
          <div className="w-64 h-8 rounded-xl bg-void-border/60" />
          <div className="w-80 h-4 rounded bg-void-border/40" />
        </div>
        <div className="w-36 h-10 rounded-xl bg-void-border/50 shrink-0" />
      </div>

      {/* 2. Metric Highlight Cards (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-void-surface border border-void-border/80 space-y-3">
            <div className="w-24 h-3.5 rounded bg-void-border/40" />
            <div className="w-36 h-7 rounded-lg bg-void-border/60" />
            <div className="w-48 h-3 rounded bg-void-border/30" />
          </div>
        ))}
      </div>

      {/* 3. Main Dashboard Body Card Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-void-surface border border-void-border/80 space-y-6">
        <div className="w-48 h-6 rounded-lg bg-void-border/60" />
        <div className="space-y-3">
          <div className="w-full h-12 rounded-xl bg-void-deep border border-void-border/60" />
          <div className="w-full h-12 rounded-xl bg-void-deep border border-void-border/60" />
          <div className="w-full h-12 rounded-xl bg-void-deep border border-void-border/60" />
        </div>
      </div>
    </div>
  );
}
