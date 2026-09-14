import { PageTransition } from "@/components/layout/page-transition";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteLoader } from "@/components/layout/site-loader";

/** Каркас публичной воронки покупки: белая шапка, серое поле, общий футер. */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="order-design-viewport flex min-h-screen flex-col bg-db-surface-muted">
      <SiteLoader />
      <SiteHeader variant="plain" />
      <main className="flex-1">
        <PageTransition className="flex min-h-full flex-col">{children}</PageTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
