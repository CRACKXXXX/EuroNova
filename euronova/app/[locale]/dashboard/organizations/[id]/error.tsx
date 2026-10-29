"use client";

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { Building2 } from "lucide-react";

export default function OrganizationDetailError({
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
      icon={Building2}
      returnHref="/dashboard/organizations"
    />
  );
}
