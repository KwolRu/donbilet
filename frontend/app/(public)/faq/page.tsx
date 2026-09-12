import type { Metadata } from "next";

import { DbBreadcrumbs } from "@/components/ui/db-breadcrumbs";
import { FaqCatalog } from "@/components/faq/faq-catalog";
import { FAQ_CATEGORIES } from "@app/core/mocks/faq";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

export const metadata: Metadata = {
  title: "Часто задаваемые вопросы — ДонБилет",
  description:
    "Ответы на вопросы о покупке и оплате билетов, возврате, багаже и правилах проезда на автобусных рейсах ДонБилет.",
};

/**
 * Страница «Часто задаваемые вопросы».
 *
 * Раскладка та же, что у новостей: контейнер 1220px, крошки, заголовок 36/52.
 * Ниже — вкладки категорий и аккордеон вопросов, оба переиспользуют готовые
 * компоненты (`SegmentedTabs` и `FaqAccordion` из секции главной).
 *
 * Отступы заданы заказчиком: 32px от шапки и 48px до футера.
 */
export default function FaqPage() {
  return (
    <div className="mx-auto flex w-[1220px] flex-col gap-6 pt-8 pb-12">
      <DbBreadcrumbs
        items={[
          { label: "Главная", href: PUBLIC_ROUTES.home },
          { label: "Часто задаваемые вопросы" },
        ]}
      />

      <div className="flex w-full flex-col gap-4">
        <h1 className="text-db-page font-medium text-db-text-primary">
          Часто задаваемые вопросы
        </h1>

        <FaqCatalog categories={FAQ_CATEGORIES} />
      </div>
    </div>
  );
}
