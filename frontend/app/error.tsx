"use client";

import { useEffect } from "react";

import { PageErrorFallback } from "@/components/ui/page-error-fallback";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen bg-bg-surface-base-layout p-6">
      <PageErrorFallback onRetry={reset} />
    </main>
  );
}
