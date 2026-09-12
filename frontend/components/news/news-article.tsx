import Image from "next/image";

import { NewsGallery } from "./news-gallery";
import type { MockNewsArticle } from "@app/core/mocks/news";

/**
 * Тело статьи: заголовок, дата и блоки текста.
 *
 * Колонка 600px по центру белой карточки — так в макете (padding по бокам
 * подстраивается под ширину экрана, а не задан числом: на 1220 это ровно те
 * самые 310px). Ширина колонки нужна и галерее: её стрелки вынесены за края
 * текста и считаются от неё.
 *
 * Абзацы одного блока идут с шагом 12px, между блоками — 16px, как в макете.
 */
export function NewsArticle({ article }: { article: MockNewsArticle }) {
  return (
    <article className="squircle w-full rounded-db-xl bg-db-surface-default py-12">
      <div className="mx-auto flex w-[600px] flex-col gap-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-db-page font-medium text-db-text-primary">{article.title}</h1>
          <time className="text-db-article text-db-text-secondary">{article.dateLabel}</time>
        </header>

        <div className="flex flex-col gap-3">
          {article.blocks.map((block, index) => {
            switch (block.kind) {
              case "heading":
                return (
                  /*
                   * Отступ сверху у заголовка, а не `gap` у контейнера: между
                   * абзацами шаг меньше, чем перед новым разделом.
                   */
                  <h2
                    key={index}
                    className="mt-1 text-db-subsection font-medium text-db-text-primary"
                  >
                    {block.text}
                  </h2>
                );

              case "image":
                return (
                  <Image
                    key={index}
                    src={block.image}
                    alt={block.alt ?? ""}
                    className="squircle aspect-[600/364] w-full rounded-db-lg object-cover"
                    sizes="600px"
                    loading="eager"
                  />
                );

              case "gallery":
                return <NewsGallery key={index} images={block.images} />;

              default:
                return (
                  <p key={index} className="text-db-article text-db-text-secondary">
                    {block.text}
                  </p>
                );
            }
          })}
        </div>
      </div>
    </article>
  );
}
