import Image from "next/image";

import { DbSectionHeading } from "@/components/ui/db-primitives";
import { MOCK_BENEFITS } from "@app/core/mocks/landing";

/**
 * «Почему путешествуют с ДонБилет» — четыре карточки с иллюстрациями 122×122.
 *
 * Размеры из макета: карточка 290×330, padding 24, radius 32, иллюстрация
 * 122×122, текстовая колонка 242px. Ссылки справа от заголовка у этой секции
 * нет — в отличие от остальных.
 *
 * Заголовок — ровно две строки (56px). В макете это фиксированная высота:
 * без неё «Реальная поддержка» занимает одну строку, и её описание съезжает
 * вверх относительно соседей.
 */
export function WhyDonbilet() {
  return (
    <section className="flex w-full flex-col gap-6">
      <DbSectionHeading
        title="Почему путешествуют с ДонБилет"
        description="Всё необходимое для поездки — от поиска билетов до поддержки в пути"
      />

      <ul className="flex items-stretch gap-5">
        {MOCK_BENEFITS.map((benefit) => (
          <li
            key={benefit.id}
            className="flex h-[330px] flex-1 flex-col gap-2 overflow-hidden squircle rounded-db-2xl bg-db-surface-default p-6"
          >
            <Image
              src={benefit.image}
              alt=""
              width={122}
              height={122}
              loading="eager"
              className="size-[122px]"
            />

            <div className="flex flex-col gap-2">
              <h3 className="h-14 text-db-card font-medium text-db-text-primary">
                {benefit.title}
              </h3>
              <p className="text-db-prose text-db-text-secondary">{benefit.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
