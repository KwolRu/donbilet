import Image from "next/image";

export function BusinessPromo() {
  return (
    <section className="site-shell py-3">
      <div className="relative overflow-hidden rounded-3xl bg-[#1e1e1e] px-5 py-6 sm:px-8 sm:py-8 lg:min-h-[478px] lg:px-[54px] lg:py-[54px]">
        <div className="relative z-10 flex max-w-[620px] flex-col items-start">
          <span className="inline-flex rounded-[20px] bg-white px-4 py-2 font-sans text-base leading-none font-medium text-[#757575]">
            Бизнес
          </span>

          <h2 className="mt-8 font-heading text-[36px] leading-[1.05] font-semibold text-white sm:text-[48px] lg:text-[64px]">
            Удобные решения
            <br />
            для вашего бизнеса
          </h2>

          <p className="mt-7 max-w-[760px] font-sans text-xl leading-tight font-normal text-white/85 sm:text-2xl lg:text-[26px]">
            Организуем поездки и командировки под ключ.
            <br />
            Экономьте время и ресурсы вместе с ДоБилет
          </p>

          <button className="mt-11 inline-flex items-center justify-center rounded-[24px] bg-[#ffc700] px-10 py-5 font-sans text-2xl leading-none font-semibold text-[#191919] transition-colors hover:bg-[#f0ba00]">
            Получить предложение
          </button>
        </div>

        <div className="pointer-events-none mt-10 flex justify-center lg:mt-0 lg:absolute lg:right-0 lg:bottom-0 lg:w-[48%]">
          <Image
            src="/images/business-promo/business-envelope.png"
            alt=""
            width={619}
            height={365}
            quality={100}
            className="h-auto w-[320px] sm:w-[440px] lg:w-full lg:max-w-[760px] object-contain object-bottom"
          />
        </div>
      </div>
    </section>
  );
}
