"use client";

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { MessageSquare } from "lucide-react";

export default function CommunityError({
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
      icon={MessageSquare}
      returnHref="/"
    />
  );
}
