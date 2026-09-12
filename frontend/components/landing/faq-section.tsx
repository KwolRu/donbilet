import Image from "next/image";

import faqBanner from "@assets/images/landing/6/image.png";
import { DbSectionHeading, DbSectionLink } from "@/components/ui/db-primitives";
import { MOCK_FAQ } from "@app/core/mocks/faq";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";
import { FaqAccordion } from "./faq-accordion";

/**
 * «Всё что нужно знать перед поездкой» — аккордеон вопросов.
 *
 * Сам аккордеон — общий компонент `faq-accordion.tsx`, его же использует
 * страница `/faq`. Здесь остаётся только обрамление секции: заголовок,
 * ссылка на все вопросы и иллюстрация с автобусом и поездом внизу карточки.
 *
 * Заголовок в макете написан с опечаткой («занть») — здесь исправлено.
 * Если заказчик хочет ровно как в макете, правка на одну букву.
 */
export function FaqSection() {
  return (
    <section className="flex w-full flex-col gap-6">
      <DbSectionHeading
        title="Всё что нужно знать перед поездкой"
        description="Ответы на частые вопросы о покупке, возврате и правилах проезда"
        action={<DbSectionLink href={PUBLIC_ROUTES.faq}>Все вопросы</DbSectionLink>}
      />

      <div className="flex w-full flex-col items-center gap-2 squircle rounded-db-2xl bg-db-surface-default p-6">
        <FaqAccordion items={MOCK_FAQ} />

        <Image
          src={faqBanner}
          alt=""
          className="w-full object-contain"
          sizes="1172px"
          loading="eager"
        />
      </div>
    </section>
  );
}
