import Image from "next/image";

import phoneImage from "@assets/images/landing/end/image.png";
import qrCode from "@assets/images/landing/footer/qr.svg";
import { Logo } from "@/components/layout/logo";
import { MobileAppCopy } from "./mobile-app-copy";

/**
 * «Установите приложение» — иллюстрация с телефоном слева, текст справа,
 * QR-карточка поверх картинки.
 *
 * По макету QR позиционируется абсолютно (left 286, top 166) — он ложится
 * на экран телефона на иллюстрации.
 */
export function MobileAppSection() {
  return (
    <section className="relative flex w-full items-center gap-[46px] squircle rounded-db-2xl bg-db-surface-default py-20 pr-20 pl-8">
      <Image
        src={phoneImage}
        alt="Мобильное приложение ДонБилет"
        className="h-[451px] w-[697px] shrink-0 object-contain"
        sizes="697px"
        loading="eager"
      />

      <div className="flex flex-1 flex-col gap-6">
        <MobileAppCopy />
      </div>

      {/* Карточка QR ложится на экран телефона — координаты и размеры из макета. */}
      <div className="absolute top-[166px] left-[286px] flex w-[174px] flex-col items-center gap-4">
        <Logo variant="dark" asLink={false} width={134} />
        <div className="flex flex-col items-center justify-center squircle rounded-db-xl bg-db-surface-default p-4 shadow-[0_4px_29.5px_rgba(36,35,32,0.20)]">
          <Image
            src={qrCode}
            alt="QR-код для загрузки приложения"
            width={142}
            height={142}
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
