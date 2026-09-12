"use client";

import { useEffect } from "react";

import { ErrorLayout } from "@/components/layout/error-layout";
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
    <ErrorLayout>
      <PageErrorFallback onRetry={reset} />
    </ErrorLayout>
  );
}
