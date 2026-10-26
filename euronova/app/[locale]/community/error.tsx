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
      title="Community Signal Disrupted"
      badge="VOLUNTEER NETWORK ANOMALY"
      description="The global community discussions and travel companion channels could not be synchronized. Re-establish connection to resume."
      icon={MessageSquare}
      returnHref="/"
      returnLabel="Return Home"
    />
  );
}
