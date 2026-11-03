import { Shield, Users, Building2, FolderGit2, Flag } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* 1. Header Banner Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-void-surface border border-void-border/70 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-void-border/40 border border-void-border/60">
              <Shield className="w-3.5 h-3.5 text-plasma-cyan/40" />
              <div className="w-32 h-3 rounded bg-void-border/60" />
            </div>
            <div className="w-72 h-8 rounded-xl bg-void-border/60" />
            <div className="w-96 h-4 rounded bg-void-border/40" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 h-10 rounded-xl bg-void-border/50" />
            <div className="w-28 h-10 rounded-xl bg-void-border/40" />
          </div>
        </div>

        {/* KPI Metric Cards Skeleton (4 columns) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-void-border/50">
          {[
            { icon: Building2, labelW: "w-20", valW: "w-12" },
            { icon: Users, labelW: "w-16", valW: "w-14" },
            { icon: FolderGit2, labelW: "w-24", valW: "w-12" },
            { icon: Flag, labelW: "w-20", valW: "w-10" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-void-deep/80 border border-void-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className={`h-3 rounded bg-void-border/40 ${item.labelW}`} />
                <item.icon className="w-4 h-4 text-gray-600" />
              </div>
              <div className={`h-6 rounded-lg bg-void-border/60 ${item.valW}`} />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Horizontal Tab Bar Skeleton (7 tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-void-border/50">
        {[
          "w-28", // Organizations
          "w-24", // Youth
          "w-24", // Projects
          "w-20", // Reports
          "w-20", // Staff
          "w-28", // Escalations
          "w-24", // Tickets
        ].map((w, idx) => (
          <div key={idx} className={`h-10 rounded-xl bg-void-border/40 shrink-0 ${w}`} />
        ))}
      </div>

      {/* 3. Table Card Skeleton */}
      <div className="rounded-2xl bg-void-surface border border-void-border p-6 space-y-6">
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80 h-10 rounded-xl bg-void-deep border border-void-border/60" />
          <div className="flex items-center gap-2">
            <div className="w-24 h-9 rounded-lg bg-void-border/40" />
            <div className="w-24 h-9 rounded-lg bg-void-border/40" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-3">
          <div className="h-10 rounded-lg bg-void-deep/90 border border-void-border/40" />
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="h-14 rounded-xl bg-void-deep/50 border border-void-border/30 flex items-center px-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-void-border/50" />
                <div className="space-y-1.5">
                  <div className="w-40 h-3.5 rounded bg-void-border/50" />
                  <div className="w-24 h-2.5 rounded bg-void-border/30" />
                </div>
              </div>
              <div className="w-20 h-5 rounded-full bg-void-border/40" />
              <div className="w-16 h-8 rounded-lg bg-void-border/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
