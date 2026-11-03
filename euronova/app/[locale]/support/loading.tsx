import { Heart } from "lucide-react";
import { ShimmerBeam } from "@/components/Skeletons";

export default function PublicSupportLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-void-deep text-white animate-in fade-in duration-300">
      {/* Spacer matching fixed Header */}
      <div className="h-20 sm:h-24" />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 space-y-8">
        {/* Navigation Breadcrumb Skeleton */}
        <div className="w-36 h-4 rounded bg-void-border/50" />

        {/* Hero Section Skeleton */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nova-flare/10 border border-nova-flare/30">
            <Heart className="w-3.5 h-3.5 text-nova-flare/40" />
            <div className="w-20 h-3 rounded bg-nova-flare/30" />
          </div>

          <div className="w-80 sm:w-96 h-10 sm:h-12 rounded-2xl bg-void-surface border border-void-border/80 mx-auto relative overflow-hidden">
            <ShimmerBeam />
          </div>

          <div className="w-64 sm:w-80 h-4 rounded-lg bg-void-surface border border-void-border/60 mx-auto relative overflow-hidden">
            <ShimmerBeam />
          </div>
        </div>

        {/* Donation Block Card Skeleton */}
        <div className="bg-void-surface border border-void-border/80 rounded-3xl p-6 sm:p-10 space-y-6 relative overflow-hidden shadow-xl">
          <ShimmerBeam />
          <div className="w-48 h-6 rounded-lg bg-void-border/70" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-void-deep border border-void-border/50" />
            ))}
          </div>
          <div className="w-full h-12 rounded-xl bg-void-deep border border-void-border/60" />
          <div className="w-full h-12 rounded-xl bg-plasma-cyan/20 border border-plasma-cyan/40" />
        </div>
      </main>
    </div>
  );
}

