"use client";

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ShieldAlert } from "lucide-react";

export default function AdminError({
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
      title="Admin Hub Transmission Interrupted"
      badge="COMMAND & CONTROL ANOMALY"
      description="The administrator telemetry pipeline encountered an unexpected exception while synchronizing secure records. You can safely retry or navigate back to the dashboard."
      icon={ShieldAlert}
      returnHref="/dashboard"
      returnLabel="Back to Dashboard"
    />
  );
}
