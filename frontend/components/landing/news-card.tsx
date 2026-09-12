import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { MockNews } from "@app/core/mocks/news";
import { publicRoute } from "@/lib/routing/public-paths";

/**
 * Карточка новости.
 *
 * Один компонент на секцию главной и на страницу `/news`: в макете это
 * одна и та же карточка, и расхождение между ними появилось бы при первой же
 * правке шрифта или отступа.
 *
 * Размеры из макета: padding 8, картинка 260px, заголовок 22/27.5, анонс
 * 16/22.4, разделитель, внизу дата и стрелка 16×16.
 *
 * Высоты текста не фиксируются: в макете они тянутся по содержимому, а низ
 * выравнивается за счёт растяжения текстового блока. Жёсткая высота обрезала
 * бы длинные анонсы и оставляла пустоту под короткими.
 */
export function NewsCard({ item }: { item: MockNews }) {
  return (
    <Link
      href={publicRoute.newsItem(item.slug)}
      className="group squircle flex flex-1 flex-col gap-2 rounded-db-xl bg-db-surface-default p-2 transition-[box-shadow,transform] duration-300 ease-out hover:shadow-lg"
    >
      {/* Обёртка с overflow: увеличение фото не должно вылезать за скругление. */}
      <div className="squircle overflow-hidden rounded-db-lg">
        <Image
          src={item.image}
          alt=""
          className="h-[260px] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          sizes="377px"
          loading="eager"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-db-card font-medium text-db-text-primary">{item.title}</h3>
          {/* Четыре строки анонса — как в макете: карточки в ряду держат высоту. */}
          <p className="line-clamp-4 text-db-prose text-db-text-secondary">{item.excerpt}</p>
        </div>

        <span className="h-px w-full bg-db-border-subtle" aria-hidden />

        <div className="flex items-center justify-between">
          <time className="text-db-prose text-db-text-secondary">{item.dateLabel}</time>
          <ArrowUpRight
            className="size-4 text-db-text-secondary transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}
