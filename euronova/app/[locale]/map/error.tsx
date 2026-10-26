"use client";

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { MapPinOff } from "lucide-react";

export default function MapError({
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
      title="Geospatial Radar Disconnected"
      badge="MAP TELEMETRY FAULT"
      description="The interactive European project radar encountered an unexpected rendering error. Re-initialize the map engine to restore coordinates."
      icon={MapPinOff}
      returnHref="/dashboard"
      returnLabel="Back to Dashboard"
    />
  );
}
