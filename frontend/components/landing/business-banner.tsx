import Image from "next/image";

import businessBg from "@assets/images/landing/4/business-banner.png";

import { DbLinkButton } from "@/components/ui/db-button";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

/**
 * Баннер «Удобные решения для вашего бизнеса».
 *
 * Размер из макета — 1220×348, фон #191919. Иллюстрация (ассет из Figma,
 * 1774×887) не растягивается на всю карточку: в макете она занимает правую
 * часть, а слева остаётся чистый фон под текст. Поэтому не `object-cover`, а
 * фиксированные 867×434 с прижатием вправо и сдвигом вверх на 54px — так
 * портфель встаёт на «пол», а оба самолёта остаются в кадре.
 *
 * Отдельного градиента нет: левый край самого ассета уже затемнён.
 */
export function BusinessBanner() {
  return (
    <section className="relative flex h-[348px] w-full items-center overflow-hidden squircle rounded-db-2xl bg-db-surface-primary p-20">
      <Image
        src={businessBg}
        alt=""
        width={867}
        height={434}
        sizes="867px"
        loading="eager"
        className="absolute -top-[54px] right-0 h-[434px] w-[867px] max-w-none object-contain"
        // Левый край растворяется в фоне: иначе на стыке картинки и #191919
        // видна вертикальная граница — у ассета там своя виньетка.
        style={{
          maskImage: "linear-gradient(to right, transparent 0, #000 18%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 18%)",
        }}
        aria-hidden
      />

      <div className="relative flex w-[568px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-db-section font-medium text-db-text-inverse">
            Удобные решения
            <br />
            для вашего бизнеса
          </h2>
          <p className="text-db-prose text-db-text-tertiary">
            Организуем поездки и командировки под ключ.
            <br />
            Экономьте время и ресурсы вместе с ДонБилет
          </p>
        </div>

        <DbLinkButton href={PUBLIC_ROUTES.b2b} variant="primary" size="small" className="self-start">
          Получить предложение
        </DbLinkButton>
      </div>
    </section>
  );
}
