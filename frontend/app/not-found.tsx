import { PageErrorFallback } from "@/components/ui/page-error-fallback";

export default function NotFound() {
  return (
    <main className="flex min-h-screen bg-bg-surface-base-layout p-6">
      <PageErrorFallback kind="not-found" />
    </main>
  );
}
