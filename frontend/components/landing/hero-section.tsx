import Image from "next/image";
import { Star, Ticket, Trophy, Users } from "lucide-react";

import heroBg from "@assets/images/landing/Hero/bg.png";
import heroBus from "@assets/images/landing/Hero/Bus.png";
import { HERO_STATS, type HeroStat } from "@app/core/mocks/landing";
import { HeroReveal } from "./hero-reveal";
import { SearchForm } from "./search/search-form";

/**
 * Hero главной страницы.
 *
 * По макету: блок 1840×640, radius 32, фото с затемнением rgba(25,25,25,.90),
 * внутри контейнер 1220px. Автобус вынесен абсолютно и выходит за верхнюю
 * границу карточки поиска.
 *
 * Блок шире контентного контейнера 1220: он занимает всю ширину за вычетом
 * боковых отступов 32px — на экране 1920 это 1856, в макете 1840.
 */

const ICONS: Record<HeroStat["icon"], typeof Trophy> = {
  trophy: Trophy,
  star: Star,
  users: Users,
  ticket: Ticket,
};

export function HeroSection() {
  return (
    <section className="relative flex min-h-[640px] w-full flex-col items-center justify-center gap-9 squircle rounded-db-2xl">
      {/*
       * Фон в отдельном слое со своим overflow-hidden. На самой секции его быть
       * не должно: выпадающие панели формы поиска выходят за нижнюю границу
       * и обрезались бы.
       */}
      <div className="absolute inset-0 overflow-hidden squircle rounded-db-2xl" aria-hidden>
        {/*
         * Затемнение rgba(25,25,25,.90) из макета уже запечено в экспорт bg.png,
         * поэтому отдельного слоя поверх нет: он делал секцию сплошным чёрным.
         */}
        <Image src={heroBg} alt="" fill priority sizes="100vw" className="object-cover" />
      </div>

      {/*
       * Содержимое появляется лесенкой, когда уходит экран загрузки: плашки,
       * заголовок, форма, автобус. Порядок тот же, в каком его читают.
       */}
      <div className="relative flex w-[1220px] flex-col items-start gap-12 py-16">
        <HeroReveal>
          <ul className="flex items-center gap-3">
            {HERO_STATS.map((stat) => {
              const Icon = ICONS[stat.icon];
              return (
                <li
                  key={stat.value}
                  className="flex items-center justify-center gap-2 rounded-full px-3 py-2 outline outline-1 -outline-offset-1 outline-db-border-strong"
                >
                  <Icon className="size-6 text-db-surface-base" strokeWidth={2} aria-hidden />
                  <span className="text-db-body text-db-text-inverse">
                    <span className="font-semibold">{stat.value}</span>
                    {stat.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </HeroReveal>

        <div className="flex w-full flex-col items-start gap-9">
          <HeroReveal delay={0.08}>
            <h1 className="flex w-[794px] flex-col items-start gap-2.5 text-db-hero font-semibold text-db-text-inverse">
              <span>Здесь покупают</span>
              <span className="flex items-start gap-3">
                <span className="flex items-center justify-center rounded-full bg-db-surface-base px-4 pb-1 text-db-text-primary">
                  выгодно
                </span>
                <span>билеты на автобусы</span>
              </span>
            </h1>
          </HeroReveal>

          <div className="relative w-full">
            {/*
             * Автобус перекрывает верх карточки поиска — позиция из макета.
             * Она задана на обёртке: анимация двигает именно её, и абсолютное
             * позиционирование должно двигаться вместе с картинкой.
             */}
            <HeroReveal
              delay={0.24}
              from="right"
              className="pointer-events-none absolute -top-[181px] left-[778px] z-10"
            >
              <Image
                src={heroBus}
                alt=""
                width={426}
                height={284}
                priority
                aria-hidden
                className="h-[284px] w-[426px] object-contain"
              />
            </HeroReveal>

            <HeroReveal delay={0.16}>
              <SearchForm />
            </HeroReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
