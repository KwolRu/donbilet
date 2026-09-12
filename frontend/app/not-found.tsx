import { ErrorLayout } from "@/components/layout/error-layout";
import { PageErrorFallback } from "@/components/ui/page-error-fallback";

export default function NotFound() {
  return (
    <ErrorLayout>
      <PageErrorFallback kind="not-found" />
    </ErrorLayout>
  );
}
