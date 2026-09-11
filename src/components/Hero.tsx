import Image from "next/image";
import { SearchWidget } from "./SearchWidget";

export function Hero() {
  return (
    <section className="relative mx-1 sm:mx-2 mt-2 rounded-[32px] sm:rounded-[40px] overflow-hidden">
      <Image
        src="/hero-bus.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#191919]/45" />
      <div className="relative px-4 sm:px-8 pt-16 sm:pt-20 pb-28 sm:pb-32">
        <h1 className="font-heading font-extrabold text-white text-[32px] sm:text-[48px] lg:text-[64px] leading-tight text-center mb-8 sm:mb-10 drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          Здесь покупают
          <br />
          дешевые билеты на автобусы
        </h1>
        <SearchWidget />
      </div>
    </section>
  );
}
