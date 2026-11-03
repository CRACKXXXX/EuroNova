import { Building2 } from "lucide-react";
import { ProjectCardSkeleton } from "@/components/Skeletons";

export default function OrganizationDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* 1. Organization Hero Banner Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-void-surface border border-void-border/70 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar / Logo */}
            <div className="w-20 h-20 rounded-2xl bg-void-deep border border-void-border/80 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-plasma-cyan/40" />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-56 h-7 rounded-lg bg-void-border/60" />
                <div className="w-20 h-5 rounded-full bg-void-border/40" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 h-4 rounded bg-void-border/40" />
                <div className="w-36 h-4 rounded bg-void-border/30" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-10 rounded-xl bg-void-border/50" />
          </div>
        </div>
      </div>

      {/* 2. Sub-tab Pills Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-void-border/50">
        {[
          "w-24", // Overview
          "w-32", // Opportunities
          "w-20", // Team
          "w-24", // Analytics
          "w-24", // Surveys
          "w-24", // Webhooks
        ].map((w, idx) => (
          <div key={idx} className={`h-10 rounded-xl bg-void-border/40 shrink-0 ${w}`} />
        ))}
      </div>

      {/* 3. Main Content Columns Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: NGO Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-void-surface border border-void-border/80 space-y-4">
            <div className="w-32 h-5 rounded bg-void-border/60" />
            <div className="space-y-2">
              <div className="w-full h-3 rounded bg-void-border/40" />
              <div className="w-full h-3 rounded bg-void-border/40" />
              <div className="w-4/5 h-3 rounded bg-void-border/40" />
            </div>
            <div className="pt-4 border-t border-void-border/50 space-y-3">
              <div className="flex justify-between items-center">
                <div className="w-16 h-3 rounded bg-void-border/40" />
                <div className="w-24 h-4 rounded bg-void-border/50" />
              </div>
              <div className="flex justify-between items-center">
                <div className="w-20 h-3 rounded bg-void-border/40" />
                <div className="w-28 h-4 rounded bg-void-border/50" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Opportunities / Projects Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-44 h-6 rounded-lg bg-void-border/60" />
            <div className="w-28 h-8 rounded-lg bg-void-border/40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
