import Image from "next/image";
import { QrCode } from "./QrCode";

export function AppPromo() {
  return (
    <section className="site-shell pt-3 pb-28 sm:pb-32 lg:pb-[118px]">
      <div className="relative">
        <div className="relative min-h-[360px] overflow-hidden rounded-3xl bg-[#ffc700] px-5 pt-8 pb-14 sm:min-h-[430px] sm:px-10 sm:pt-12 sm:pb-16 lg:h-[525px] lg:px-10 lg:pt-14">
          <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 text-center">
            <h2 className="max-w-[1240px] font-heading text-[28px] leading-[1.12] font-semibold text-[#191919] sm:text-[36px]">
              Установите приложение
              <br />
              с информацией о ваших билетах,{" "}
              <span className="inline-block rounded-[26px] bg-[#836de8] px-3 py-1 text-[#faf8f2] sm:px-5 sm:py-2">
                даже без интернета
              </span>
            </h2>

            <p className="max-w-[760px] font-sans text-base leading-relaxed text-[#191919] sm:text-lg">
              Отсканируйте QR-код камерой телефона, чтобы скачать
              <br className="hidden sm:block" />
              {" "}приложение, или нажмите сюда, чтобы скопировать ссылку
            </p>
          </div>

          <div className="pointer-events-none absolute right-0 bottom-0 w-[180px] sm:w-[250px] lg:w-[423px]">
            <Image
              src="/images/app-promo/suitcase-crop.png"
              alt=""
              width={520}
              height={450}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>

        <div className="absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-[38%] sm:translate-y-[36%] lg:bottom-[-118px] lg:translate-y-0">
          <div className="rounded-[30px] bg-white p-4 shadow-[0_4px_40px_rgba(36,35,32,0.10)] sm:rounded-[36px] sm:p-5 lg:rounded-[40px]">
            <QrCode className="h-[220px] w-[220px] sm:h-[320px] sm:w-[320px] lg:h-[360px] lg:w-[360px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
