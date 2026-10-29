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
      icon={LayoutDashboard}
      returnHref="/dashboard"
    />
  );
}
