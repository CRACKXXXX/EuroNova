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
      icon={MapPinOff}
      returnHref="/dashboard"
    />
  );
}
