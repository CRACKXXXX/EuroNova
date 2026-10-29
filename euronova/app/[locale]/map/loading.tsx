import { Compass, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function MapLoading() {
  const t = await getTranslations("Map");

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] bg-void-deep overflow-hidden flex items-center justify-center animate-pulse">
      {/* Background Radar Grid Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(#1E2640 1px, transparent 1px), linear-gradient(to right, #111420 1px, transparent 1px)",
          backgroundSize: "40px 40px, 80px 80px",
        }}
      />

      {/* Floating Filter Overlay Skeleton (Top-Left) */}
      <div className="absolute top-6 left-6 z-20 w-80 sm:w-96 p-4 rounded-2xl bg-void-surface/90 border border-void-border/80 shadow-2xl backdrop-blur-xl space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-plasma-cyan/50" />
          <div className="w-40 h-4 rounded bg-void-border/60" />
        </div>
        <div className="w-full h-10 rounded-xl bg-void-deep border border-void-border/50" />
        <div className="flex items-center gap-2 pt-1">
          <div className="w-20 h-6 rounded-full bg-void-border/40" />
          <div className="w-24 h-6 rounded-full bg-void-border/40" />
          <div className="w-20 h-6 rounded-full bg-void-border/40" />
        </div>
      </div>

      {/* Center Radar Scanner Indicator */}
      <div className="relative z-10 text-center space-y-4 p-8 rounded-3xl bg-void-surface/80 border border-void-border/80 backdrop-blur-2xl shadow-2xl max-w-sm mx-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_30px_rgba(0,229,255,0.25)]">
          <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: "6s" }} />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold text-white tracking-wide uppercase font-mono">
            {t("calibratingRadar")}
          </p>
          <p className="text-xs text-gray-400 font-light">
            {t("loadingTelemetry")}
          </p>
        </div>
      </div>
    </div>
  );
}
