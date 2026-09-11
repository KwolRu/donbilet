"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

const DESTINATIONS = [
  { city: "Москва", date: "13 июля", price: "от 2 725 ₽", image: "/images/destinations/moscow-hq.jpg" },
  { city: "Санкт-Петербург", date: "14 июля", price: "от 3 480 ₽", image: "/images/destinations/saint-petersburg-hq.jpg" },
  { city: "Казань", date: "15 июля", price: "от 3 120 ₽", image: "/images/destinations/kazan-hq.jpg" },
  { city: "Ростов-на-Дону", date: "16 июля", price: "от 2 540 ₽", image: "/images/destinations/rostov-hq.jpg" },
  { city: "Сочи", date: "17 июля", price: "от 2 340 ₽", image: "/images/destinations/sochi-hq.jpg" },
  { city: "Волгоград", date: "18 июля", price: "от 2 180 ₽", image: "/images/destinations/volgograd-hq.jpg" },
  { city: "Краснодар", date: "19 июля", price: "от 1 907 ₽", image: "/images/destinations/krasnodar-hq.jpg" },
  { city: "Калининград", date: "20 июля", price: "от 4 260 ₽", image: "/images/destinations/kaliningrad-hq.jpg" },
];

export function Destinations() {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("a");
    const gap = 24;
    const width = card ? card.clientWidth + gap : 300;
    track.scrollBy({ left: direction * width, behavior: "smooth" });
  }

  return (
    <section className="site-shell relative z-10 -mt-16 sm:-mt-20 pb-6">
      <div className="bg-white rounded-3xl p-5 sm:p-8">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="font-heading font-semibold text-2xl sm:text-3xl text-[#191919]">
            Попробовать что-то новое
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => scroll(-1)}
              aria-label="Назад"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#faf8f2] flex items-center justify-center hover:bg-[#f0ede3] transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 text-[#191919]" />
            </button>
            <button
              onClick={() => scroll(1)}
              aria-label="Вперёд"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#ffc700] flex items-center justify-center hover:bg-[#f0ba00] transition-colors"
            >
              <ArrowRightIcon className="w-4 h-4 text-[#191919]" />
            </button>
          </div>
        </div>

        <div ref={trackRef} className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-1">
          {DESTINATIONS.map((d) => (
            <a key={d.city} href="#" className="shrink-0 w-[240px] sm:w-[300px] lg:w-[360px] flex flex-col gap-3">
              <div className="relative w-full aspect-[400/456] rounded-3xl overflow-hidden flex items-end p-5">
                <Image
                  src={d.image}
                  alt={d.city}
                  fill
                  quality={100}
                  sizes="(max-width: 640px) 240px, (max-width: 1024px) 300px, 360px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />
                <span className="relative font-heading font-semibold text-white/90 text-lg drop-shadow-md">{d.city}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-lg sm:text-xl">
                  <span className="text-[#191919] font-medium font-sans">{d.city}</span>
                  <span className="w-1 h-1 rounded-full bg-[#757575]" />
                  <span className="text-[#757575] font-sans">{d.date}</span>
                </div>
                <span className="font-heading font-bold text-lg sm:text-xl text-[#191919]">{d.price}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
