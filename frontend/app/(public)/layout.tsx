import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteLoader } from "@/components/layout/site-loader";
import { PageTransition } from "@/components/layout/page-transition";

/**
 * Layout публичной зоны: шапка, контент, футер.
 *
 * Group-сегмент `(public)` не влияет на URL — он отделяет публичный сайт от
 * личного кабинета и CRM, у которых будут свои layout'ы и свои гейты в `proxy.ts`.
 *
 * Шапка и футер — во всю ширину экрана с отступом 32px по бокам (на 1920 это
 * 1856px контента). Ограничение ширины контента задаёт уже сама страница:
 * у секций лендинга оно разное.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * `min-h-screen`, а не `min-h-full`: последний зависит от высоты родителя,
     * и на короткой странице колонка сжимается по содержимому — футер повисает
     * посреди экрана, а под ним остаётся пустое поле. От высоты окна он всегда
     * прижат к низу, а на длинных страницах просто уезжает вниз.
     */
    <div className="flex min-h-screen flex-col bg-db-surface-muted">
      <SiteLoader />
      <SiteHeader />
      {/*
       * Анимация смены страницы обнимает только контент: шапка и футер
       * остаются на месте и переживают переход — вместе с открытым меню
       * аккаунта и состоянием прокрутки.
       */}
      <main className="flex-1">
        <PageTransition className="flex min-h-full flex-col">{children}</PageTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
