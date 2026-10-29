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
      icon={ShieldAlert}
      returnHref="/dashboard"
    />
  );
}
