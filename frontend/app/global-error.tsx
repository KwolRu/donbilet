"use client";

import { PageErrorFallback } from "@/components/ui/page-error-fallback";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ru">
      <body>
        <main className="flex min-h-screen bg-[#f5f5f9] p-6">
          <PageErrorFallback onRetry={reset} />
        </main>
      </body>
    </html>
  );
}
