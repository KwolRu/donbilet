import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Хлебные крошки контентных страниц публичного сайта.
 *
 * Отдельно от `components/ui/bread-crumbs.tsx`: тот собирает путь из URL по
 * словарю `ROUTE_LABELS` личного кабинета, где сегменты предсказуемы. На
 * публичном сайте подпись последней крошки часто не выводится из адреса —
 * у статьи это заголовок, а не slug, — поэтому список задаётся явно.
 *
 * По макету: текст 14/16, промежуточные крошки #525252, последняя #BFBFBF,
 * между ними chevron 16×16.
 */

export type Crumb = { label: string; href?: string };

export function DbBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки">
      <ol className="flex items-center gap-2">
        {items.map((item, index) => {
          const last = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="db-link-underline text-db-caption text-db-text-secondary transition-colors duration-300 ease-out hover:text-db-text-primary"
                >
                  {item.label}
                </Link>
              ) : (
                /* Текущая страница — не ссылка: вести на саму себя незачем. */
                <span aria-current={last ? "page" : undefined} className="text-db-caption text-db-text-tertiary">
                  {item.label}
                </span>
              )}

              {!last && (
                <ChevronRight
                  className="size-4 shrink-0 text-db-text-secondary"
                  strokeWidth={1.5}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
