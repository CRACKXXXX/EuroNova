import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-void-deep text-white">
      {/* Suspense is required when using useSearchParams in Client Components */}
      <Suspense fallback={<div className="hidden lg:block fixed inset-y-0 left-0 w-72 bg-void-deep border-r border-void-border z-30" />}>
        <DashboardSidebar />
      </Suspense>

      <div className="lg:pl-72 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
