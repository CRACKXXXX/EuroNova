import Link from "next/link";
import { Compass, Home, Rocket } from "lucide-react";
import "./globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <title>404 - Lost in Deep Space | EuroNova</title>
        <link rel="icon" type="image/svg+xml" href="/logo-svg.svg" />
      </head>
      <body className="min-h-full flex flex-col bg-void-deep text-white">
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-hyper-violet/15 rounded-full blur-[200px] pointer-events-none -z-10" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-plasma-cyan/10 rounded-full blur-[180px] pointer-events-none -z-10" />

          <div className="w-full max-w-lg bg-void-surface/90 border border-void-border/80 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-plasma-cyan/10 border border-plasma-cyan/30 flex items-center justify-center text-plasma-cyan shadow-[0_0_30px_rgba(0,229,255,0.2)]">
              <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: "20s" }} />
            </div>

            <div className="space-y-3">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-plasma-cyan/10 text-plasma-cyan border border-plasma-cyan/20">
                COORDINATES UNREACHABLE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Lost in Deep Space (404)
              </h1>
              <p className="text-sm text-gray-400 font-light leading-relaxed">
                The orbital sector or mission coordinates you are attempting to reach do not exist or have been re-assigned.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/en"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-plasma-cyan text-void-surface font-extrabold text-sm transition-all duration-300 hover:bg-cyan-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,229,255,0.35)] cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Gateway</span>
              </Link>

              <Link
                href="/en/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-void-surface hover:bg-void-deep border border-void-border hover:border-gray-600 text-gray-300 hover:text-white font-semibold text-sm transition-all duration-200 cursor-pointer"
              >
                <Rocket className="w-4 h-4 text-plasma-cyan" />
                <span>Explore Missions</span>
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
