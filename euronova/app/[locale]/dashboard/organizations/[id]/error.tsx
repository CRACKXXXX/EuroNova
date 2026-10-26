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
      title="Organization Dossier Inaccessible"
      badge="ACCREDITATION NETWORK ANOMALY"
      description="The NGO dossier or associated European mobility opportunities could not be retrieved from the database. Please try again."
      icon={Building2}
      returnHref="/dashboard/organizations"
      returnLabel="All Organizations"
    />
  );
}
