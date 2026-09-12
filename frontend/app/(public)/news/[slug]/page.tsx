import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DbBreadcrumbs } from "@/components/ui/db-breadcrumbs";
import { NewsArticle } from "@/components/news/news-article";
import { NEWS_SLUGS, findNewsArticle } from "@app/core/mocks/news";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

type PageProps = { params: Promise<{ slug: string }> };

/** Все статьи известны заранее — страницы отдаются статикой, без запроса. */
export function generateStaticParams() {
  return NEWS_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = findNewsArticle(slug);

  if (!article) return { title: "Статья не найдена — ДонБилет" };

  return {
    title: `${article.title} — ДонБилет`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      images: [{ url: article.image.src }],
    },
  };
}

/**
 * Страница отдельной новости.
 *
 * Раскладка из макета: контейнер 1220px, крошки в три уровня (последний —
 * заголовок статьи), под ними белая карточка с колонкой текста 600px.
 *
 * Отступы заданы заказчиком: 32px от шапки и 45px до футера.
 *
 * Неизвестный slug — 404, а не пустая страница: поисковику нужно понимать,
 * что статьи нет, иначе он проиндексирует заглушку.
 */
export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = findNewsArticle(slug);

  if (!article) notFound();

  return (
    <div className="mx-auto flex w-[1220px] flex-col gap-6 pt-8 pb-[45px]">
      <DbBreadcrumbs
        items={[
          { label: "Главная", href: PUBLIC_ROUTES.home },
          { label: "Новости", href: PUBLIC_ROUTES.news },
          { label: article.title },
        ]}
      />

      <NewsArticle article={article} />
    </div>
  );
}
