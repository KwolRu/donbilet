"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef, useState } from "react";
import { ArrowRight, Star } from "lucide-react";

import { DbStripArrow } from "@/components/ui/db-strip-arrow";

import hotel1 from "@assets/images/account/hotels/hotel-1.png";
import hotel2 from "@assets/images/account/hotels/hotel-2.png";
import hotel3 from "@assets/images/account/hotels/hotel-3.png";
import hotel4 from "@assets/images/account/hotels/hotel-4.png";
import hotel5 from "@assets/images/account/hotels/hotel-5.png";
import hotel6 from "@assets/images/account/hotels/hotel-6.png";
import { MOCK_HOTELS, type HotelOffer } from "@app/core/mocks/search";

/**
 * Подборка жилья внутри выдачи рейсов.
 *
 * Стоит между карточками — так в макете, и это не случайность: жильё ищут
 * тогда же, когда билет, и предложить его посреди выдачи уместнее, чем
 * отдельной страницей.
 *
 * Лента листается стрелками и колесом; прокрутка живёт внутри неё, чтобы не
 * утаскивать страницу.
 */

const PHOTO: Record<HotelOffer["photo"], StaticImageData> = {
  1: hotel1,
  2: hotel2,
  3: hotel3,
  4: hotel4,
  5: hotel5,
  6: hotel6,
};

export function HotelsStrip({
  /** Город в предложном падеже: «во Владивостоке». Склонять на лету нельзя —
      русские предлоги и окончания зависят от слова, и API отдаст готовую форму. */
  cityIn,
  className = "",
  actionVariant = "outlined",
}: {
  cityIn: string;
  /** Отступы задаёт вызывающая сторона: секция стоит внутри чужой колонки. */
  className?: string;
  actionVariant?: "outlined" | "plain";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateEdges() {
    const track = trackRef.current;
    if (!track) return;

    setAtStart(track.scrollLeft <= 4);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
  }

  function scrollBy(direction: -1 | 1) {
    trackRef.current?.scrollBy({ left: direction * 552, behavior: "smooth" });
  }

  return (
    <section className={"relative flex flex-col gap-4 " + className}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex w-[600px] flex-col gap-1">
          <h2 className="text-[20px] leading-7 font-medium text-db-text-primary">
            Жильё {cityIn}
          </h2>
          <p className="text-db-caption leading-5 text-db-text-primary">
            Забронируйте жильё заранее, чтобы спокойно спланировать поездку и не тратить время на
            поиски по приезде.
          </p>
        </div>

        <button
          type="button"
          className={
            "flex shrink-0 items-center gap-1 transition-colors duration-300 ease-db hover:text-db-text-secondary " +
            (actionVariant === "outlined"
              ? "squircle rounded-db-xs bg-db-surface-default p-2 outline outline-1 -outline-offset-1 outline-db-border-subtle hover:bg-db-surface-muted"
              : "py-1")
          }
        >
          <span className="px-1 text-db-micro text-db-text-primary">Все отели и квартиры</span>
          <ArrowRight className="size-3 text-db-text-primary" strokeWidth={1.5} aria-hidden />
        </button>
      </header>

      <div
        ref={trackRef}
        onScroll={updateEdges}
        className="db-scroll-hidden flex items-center gap-3 overflow-x-auto scroll-smooth"
      >
        {MOCK_HOTELS.map((hotel) => (
          <article
            key={hotel.id}
            className="squircle group relative flex h-80 w-64 shrink-0 flex-col overflow-hidden rounded-db-xl bg-db-surface-default p-2"
          >
            <div className="squircle relative flex-1 overflow-hidden rounded-db-lg">
              <Image
                src={PHOTO[hotel.photo]}
                alt={hotel.name}
                fill
                sizes="256px"
                className="object-cover transition-transform duration-500 ease-db group-hover:scale-105"
              />

              {/* Затемнение снизу: белый текст поверх фотографии иначе не
                  читается — в макете тот же градиент. */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-transparent to-db-text-primary"
                aria-hidden
              />

              <span className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-db-surface-default px-2 py-1">
                <Star
                  className="size-4 fill-db-surface-base text-db-surface-base"
                  strokeWidth={2}
                  aria-hidden
                />
                {/* `leading-none`: строка в 16px поднимала число над звездой. */}
                <span className="text-db-caption leading-none text-db-text-primary">
                  {hotel.rating.toLocaleString("ru-RU", { minimumFractionDigits: 1 })}
                </span>
              </span>

              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-db-item font-medium text-db-text-inverse">
                    {hotel.name}
                  </span>

                  <span className="flex items-center gap-2 text-db-body text-db-text-tertiary">
                    {hotel.kind}
                    <span className="flex items-center gap-0.5">
                      {hotel.stars}
                      <Star className="size-4 fill-db-text-tertiary text-db-text-tertiary" strokeWidth={2} aria-hidden />
                    </span>
                  </span>
                </div>

                <span className="flex items-center gap-2">
                  <span className="text-db-item font-medium text-db-text-inverse">
                    {hotel.price}
                  </span>
                  <span className="pt-1.5 text-db-caption text-db-text-tertiary">За 1 ночь</span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Стрелки по центру ряда карточек: ряд 320px высотой начинается под
          заголовком, поэтому отсчёт идёт от низа секции. */}
      <DbStripArrow
        side="left"
        label="Предыдущие варианты"
        disabled={atStart}
        onClick={() => scrollBy(-1)}
        className="bottom-[140px] -left-5"
      />
      <DbStripArrow
        side="right"
        label="Следующие варианты"
        disabled={atEnd}
        onClick={() => scrollBy(1)}
        className="bottom-[140px] -right-5"
      />
    </section>
  );
}
