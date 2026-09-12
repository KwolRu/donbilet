import type { Metadata } from "next";

import { DbBreadcrumbs } from "@/components/ui/db-breadcrumbs";
import { NewsList } from "@/components/news/news-list";
import { MOCK_NEWS_ALL } from "@app/core/mocks/news";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

export const metadata: Metadata = {
  title: "Новости — ДонБилет",
  description:
    "Новые маршруты, изменения в расписании, обновления сервиса и полезные советы для поездок на автобусе.",
};

/**
 * Страница «Новости».
 *
 * Раскладка из макета: контейнер 1220px по центру, крошки, заголовок 36/52,
 * сетка карточек по три в ряд с шагом 20 и кнопка догрузки.
 *
 * Отступы заданы заказчиком: 32px от шапки и 16px до футера.
 *
 * Данные моковые (`core/mocks/news`) — стенд API ДонБилет пока не отвечает.
 */
export default function NewsPage() {
  return (
    <div className="mx-auto flex w-[1220px] flex-col gap-6 pt-8 pb-4">
      <DbBreadcrumbs
        items={[{ label: "Главная", href: PUBLIC_ROUTES.home }, { label: "Новости" }]}
      />

      <div className="flex w-full flex-col gap-4">
        <h1 className="text-db-page font-medium text-db-text-primary">Новости</h1>

        <NewsList items={MOCK_NEWS_ALL} />
      </div>
    </div>
  );
}
