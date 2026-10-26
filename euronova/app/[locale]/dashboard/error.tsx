"use client";

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { LayoutDashboard } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Dashboard Subsystem Disruption"
      badge="TERMINAL SUBSYSTEM FAULT"
      description="An unhandled error occurred inside this dashboard segment. You can reset the boundary state or reload the current terminal view."
      icon={LayoutDashboard}
      returnHref="/dashboard"
      returnLabel="Reload Dashboard"
    />
  );
}
