import { DbSectionHeading, DbSectionLink } from "@/components/ui/db-primitives";
import { MOCK_NEWS } from "@app/core/mocks/news";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";
import { NewsCard } from "./news-card";

/**
 * «Новости» — три карточки в ряд.
 *
 * Сама карточка живёт в `news-card.tsx` и та же самая используется на
 * странице `/news`: в макете это один элемент, и держать две копии значит
 * гарантированно их рассинхронизировать.
 */
export function NewsSection() {
  return (
    <section className="flex w-full flex-col gap-6">
      <DbSectionHeading
        title="Новости"
        description="Новые маршруты, изменения в расписании и полезные советы для поездок"
        action={<DbSectionLink href={PUBLIC_ROUTES.news}>Все новости</DbSectionLink>}
      />

      <ul className="flex items-stretch gap-5">
        {MOCK_NEWS.map((item) => (
          <li key={item.id} className="flex flex-1">
            <NewsCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
