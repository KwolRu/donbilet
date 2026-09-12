"use client";

import { useState } from "react";

import { DbButton } from "@/components/ui/db-button";
import { NewsCard } from "@/components/landing/news-card";
import { NEWS_PAGE_SIZE, type MockNews } from "@app/core/mocks/news";
import { selectRussianPlural } from "@app/core/utils/russian-plural";

/**
 * Сетка статей с догрузкой по кнопке.
 *
 * Пока список моковый, «догрузка» — это раскрытие уже полученного массива.
 * Когда появится API, здесь меняется только источник следующей страницы:
 * состояние (сколько показано) и разметка остаются теми же.
 *
 * Сетка на `grid`, а не на рядах по три, как в макете: там ряды нарисованы
 * вручную, потому что в Figma нет автоматического переноса. Гриду хвост из
 * одной-двух карточек не мешает, и ряды не приходится делить в коде.
 */
export function NewsList({ items }: { items: MockNews[] }) {
  const [visible, setVisible] = useState(NEWS_PAGE_SIZE);

  const shown = items.slice(0, visible);
  const rest = items.length - shown.length;
  const nextBatch = Math.min(rest, NEWS_PAGE_SIZE);

  return (
    <div className="flex w-full flex-col gap-4">
      <ul className="grid w-full grid-cols-3 items-stretch gap-5">
        {shown.map((item) => (
          <li key={item.id} className="flex">
            <NewsCard item={item} />
          </li>
        ))}
      </ul>

      {rest > 0 && (
        <DbButton
          variant="secondary"
          size="small"
          fullWidth
          className="p-4 h-[48px]"
          onClick={() => setVisible(visible + NEWS_PAGE_SIZE)}
        >
          {`Показать ещё ${nextBatch} ${selectRussianPlural(nextBatch, {
            one: "статью",
            few: "статьи",
            many: "статей",
          })}`}
        </DbButton>
      )}
    </div>
  );
}
