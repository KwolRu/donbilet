import type { Metadata } from "next";

import { BusinessBanner } from "@/components/landing/business-banner";
import { FaqSection } from "@/components/landing/faq-section";
import { HeroSection } from "@/components/landing/hero-section";
import { NewsSection } from "@/components/landing/news-section";
import { PopularDirections } from "@/components/landing/popular-directions";
import { WhyDonbilet } from "@/components/landing/why-donbilet";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "ДонБилет — билеты на автобусы, поезда, самолёты и отели",
  description:
    "Онлайн-продажа автобусных билетов. Быстрый поиск рейсов, удобная оплата, электронные билеты на email. Более 100 направлений из Ростова-на-Дону.",
};

/**
 * Главная страница — лендинг ДонБилет.
 *
 * Секции «Установите приложение» здесь нет: по решению владельца от 2026-09-11
 * этот блок живёт только в модалке «Скачать приложение» из шапки.
 *
 * Раскладка сверена с Figma (фрейм `main`, 1920×4767):
 *   Hero — 1840px, вплотную к шапке, боковые отступы по 40px.
 *   Остальные секции — в контейнере 1220px по центру, между ними 100px,
 *   столько же до шапки сверху и до футера снизу.
 *
 * Данные пока моковые (`core/mocks/landing`): стенд API ДонБилет не отвечает.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* 40px, а не 32: в макете hero — 1840 из 1920. */}
      <div className="px-10">
        <HeroSection />
      </div>

      {/*
       * Каждая секция появляется при прокрутке. Hero обёртки не получает: он
       * виден сразу при загрузке, и анимация «въезда» здесь читалась бы как
       * подтормаживание страницы.
       */}
      <div className="mx-auto flex w-[1220px] flex-col gap-[100px] py-[100px]">
        <Reveal>
          <PopularDirections />
        </Reveal>
        <Reveal>
          <WhyDonbilet />
        </Reveal>
        <Reveal>
          <BusinessBanner />
        </Reveal>
        <Reveal>
          <NewsSection />
        </Reveal>
        <Reveal>
          <FaqSection />
        </Reveal>
      </div>
    </div>
  );
}
