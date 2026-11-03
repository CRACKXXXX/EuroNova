import { MessageSquare, Sparkles } from "lucide-react";

export default function CommunityLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. Community Hero Banner Skeleton */}
      <div className="p-6 sm:p-10 rounded-3xl bg-void-surface border border-void-border/70 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-border/40 border border-void-border/60">
            <Sparkles className="w-3.5 h-3.5 text-plasma-cyan/40" />
            <div className="w-32 h-3 rounded bg-void-border/60" />
          </div>
          <div className="w-72 h-8 rounded-xl bg-void-border/60" />
          <div className="w-96 h-4 rounded bg-void-border/40" />
        </div>
        <div className="w-36 h-11 rounded-xl bg-void-border/50 shrink-0" />
      </div>

      {/* 2. Channel Category Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-void-border/50">
        {[
          "w-28", // General
          "w-36", // Travel Buddies
          "w-32", // Packing & Tips
          "w-28", // Q&A
          "w-32", // Leaderboard
          "w-28", // Surveys
        ].map((w, idx) => (
          <div key={idx} className={`h-10 rounded-xl bg-void-border/40 shrink-0 ${w}`} />
        ))}
      </div>

      {/* 3. Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-96 h-11 rounded-xl bg-void-surface border border-void-border/70" />
        <div className="w-40 h-11 rounded-xl bg-void-surface border border-void-border/70 shrink-0" />
      </div>

      {/* 4. Forum Discussion Thread Cards Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="p-5 sm:p-6 rounded-2xl bg-void-surface border border-void-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-void-deep border border-void-border flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-plasma-cyan/30" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-20 h-5 rounded-full bg-void-border/50" />
                  <div className="w-48 h-4 rounded bg-void-border/60" />
                </div>
                <div className="w-72 h-3.5 rounded bg-void-border/40" />
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-20 h-3 rounded bg-void-border/30" />
                  <div className="w-16 h-3 rounded bg-void-border/30" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0 sm:self-center">
              <div className="w-16 h-6 rounded-lg bg-void-border/40" />
              <div className="w-20 h-8 rounded-xl bg-void-border/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
