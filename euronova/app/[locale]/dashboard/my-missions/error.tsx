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
      icon={FolderGit2}
      returnHref="/dashboard"
    />
  );
}
