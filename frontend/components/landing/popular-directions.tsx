import Image from "next/image";

import { DbLinkButton } from "@/components/ui/db-button";
import { DbSectionHeading, DbSectionLink } from "@/components/ui/db-primitives";
import { MOCK_DIRECTIONS } from "@app/core/mocks/landing";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

/**
 * «Популярные направления» — четыре карточки в ряд.
 *
 * Размеры из макета: карточка 290×320, padding 8, radius 24, картинка 274×160
 * с radius 20, затем блок с длительностью, названием и жёлтой кнопкой цены.
 *
 * Название — ровно две строки (48px). В макете это фиксированная высота: иначе
 * у коротких маршрутов кнопка цены поднимается выше, чем у длинных.
 */
export function PopularDirections() {
  return (
    <section className="flex w-full flex-col gap-6">
      <DbSectionHeading
        title="Популярные направления"
        description="Самые востребованные маршруты среди наших пользователей"
        action={<DbSectionLink href={PUBLIC_ROUTES.schedules}>Все направления</DbSectionLink>}
      />

      <ul className="flex items-stretch gap-5">
        {MOCK_DIRECTIONS.map((direction) => (
          <li
            key={direction.id}
            className="group flex h-[320px] flex-1 flex-col gap-2 squircle rounded-db-xl bg-db-surface-default p-2 transition-[box-shadow,transform] duration-300 ease-out hover:shadow-lg"
          >
            {/* Обёртка с overflow: увеличение фото не должно вылезать за скругление. */}
            <div className="overflow-hidden squircle rounded-db-lg">
              <Image
                src={direction.image}
                alt=""
                className="h-40 w-full object-cover transition-transform duration-500 ease-out group-"
                sizes="274px"
                loading="eager"
              />
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              <p className="text-db-caption text-db-text-secondary">{direction.durationLabel}</p>

              <h3 className="h-12 text-db-item font-medium text-db-text-primary">
                {direction.from} → {direction.to}
              </h3>

              <DbLinkButton href={direction.href} variant="primary" size="small" fullWidth>
                {direction.priceLabel}
              </DbLinkButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
