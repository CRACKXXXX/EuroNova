"use client";

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { FolderGit2 } from "lucide-react";

export default function MyMissionsError({
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
      title="Missions Portfolio Offline"
      badge="DOSSIER TELEMETRY WARNING"
      description="We could not synchronize your mobility applications and saved missions. Try re-establishing the session link."
      icon={FolderGit2}
      returnHref="/dashboard"
      returnLabel="Back to Dashboard"
    />
  );
}
