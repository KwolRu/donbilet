"use client";

import { type FormEvent, useState } from "react";
import { ArrowUpRightIcon, PlaneIcon } from "./Icons";

function WorldArt() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%] min-w-[420px] overflow-hidden">
      <div className="absolute left-[6%] top-[58%] h-24 w-24 rounded-full border-[3px] border-dashed border-[#191919] border-r-transparent border-t-transparent opacity-90" />
      <div className="absolute right-[16%] top-[24%] h-40 w-40 rounded-full border-[3px] border-dashed border-[#191919] border-l-transparent border-b-transparent opacity-90" />

      <div className="absolute left-[8%] top-[34%] h-[68px] w-[68px] text-[#191919]">
        <svg viewBox="0 0 48 48" fill="currentColor" className="h-full w-full drop-shadow-[0_8px_18px_rgba(25,25,25,0.22)]">
          <path d="M24 3C15.2 3 8 10.2 8 19c0 10.5 13.2 24.1 15 26 1.1-1.2 15-16.3 15-26C40 10.2 32.8 3 24 3zm0 22.5A6.5 6.5 0 1 1 24 12a6.5 6.5 0 0 1 0 13.5z" />
        </svg>
      </div>
      <div className="absolute left-[28%] top-[6%] h-[74px] w-[74px] text-[#191919]">
        <svg viewBox="0 0 48 48" fill="currentColor" className="h-full w-full drop-shadow-[0_8px_18px_rgba(25,25,25,0.22)]">
          <path d="M24 3C15.2 3 8 10.2 8 19c0 10.5 13.2 24.1 15 26 1.1-1.2 15-16.3 15-26C40 10.2 32.8 3 24 3zm0 22.5A6.5 6.5 0 1 1 24 12a6.5 6.5 0 0 1 0 13.5z" />
        </svg>
      </div>
      <div className="absolute left-[46%] top-[46%] h-[70px] w-[70px] text-[#191919]">
        <svg viewBox="0 0 48 48" fill="currentColor" className="h-full w-full drop-shadow-[0_8px_18px_rgba(25,25,25,0.22)]">
          <path d="M24 3C15.2 3 8 10.2 8 19c0 10.5 13.2 24.1 15 26 1.1-1.2 15-16.3 15-26C40 10.2 32.8 3 24 3zm0 22.5A6.5 6.5 0 1 1 24 12a6.5 6.5 0 0 1 0 13.5z" />
        </svg>
      </div>

      <div className="absolute left-[26%] top-[12%] h-[250px] w-[250px] rounded-full bg-[radial-gradient(circle_at_32%_24%,#ffffff_0%,#f7f4ff_22%,#8d75f4_58%,#6d57da_100%)] shadow-[inset_-22px_-24px_44px_rgba(37,25,95,0.24)]">
        <div className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,transparent_0_18%,rgba(255,255,255,0.3)_18%_19%,transparent_19%_38%,rgba(255,255,255,0.3)_38%_39%,transparent_39%_58%,rgba(255,255,255,0.3)_58%_59%,transparent_59%_78%,rgba(255,255,255,0.3)_78%_79%,transparent_79%_100%)]" />
        <div className="absolute inset-0 rounded-full bg-[linear-gradient(transparent_0_22%,rgba(255,255,255,0.3)_22%_23%,transparent_23%_48%,rgba(255,255,255,0.3)_48%_49%,transparent_49%_73%,rgba(255,255,255,0.3)_73%_74%,transparent_74%_100%)]" />
        <div className="absolute left-[15%] top-[7%] h-[45%] w-[39%] rounded-[49%_51%_50%_50%/56%_40%_60%_44%] bg-white shadow-[16px_18px_20px_rgba(25,25,25,0.12)]" />
        <div className="absolute right-[13%] top-[19%] h-[33%] w-[28%] rounded-[53%_47%_58%_42%/45%_55%_45%_55%] bg-white" />
        <div className="absolute left-[39%] bottom-[7%] h-[26%] w-[16%] rounded-[55%_45%_54%_46%/46%_52%_48%_54%] bg-white" />
      </div>

      <div className="absolute right-[11%] top-[6%] rotate-[12deg] text-[#191919]">
        <div className="relative">
          <PlaneIcon className="h-24 w-24 fill-current stroke-none text-white drop-shadow-[0_14px_20px_rgba(25,25,25,0.18)]" />
          <PlaneIcon className="absolute inset-0 h-24 w-24 stroke-none text-[#191919]" />
          <div className="absolute bottom-[22px] right-[18px] h-4 w-14 rounded-full bg-[#ffc700]" />
        </div>
      </div>

      <div className="absolute left-[4%] top-[18%] h-8 w-20 rounded-full bg-white/90 blur-[1px]" />
      <div className="absolute left-[7%] top-[14%] h-10 w-10 rounded-full bg-white/85 blur-[2px]" />
      <div className="absolute right-[9%] top-[3%] h-8 w-18 rounded-full bg-white/90 blur-[1px]" />
      <div className="absolute right-[12%] top-[0%] h-10 w-10 rounded-full bg-white/85 blur-[2px]" />
    </div>
  );
}

function BooksArt() {
  return (
    <div className="pointer-events-none absolute -right-8 bottom-0 h-[200px] w-[240px]">
      <div className="absolute right-[12px] top-[4px] h-11 w-28 rounded-[12px] bg-[#ffc700] shadow-[0_12px_24px_rgba(25,25,25,0.12)]" />
      <div className="absolute right-[40px] top-[44px] h-14 w-34 rounded-[14px] bg-[#7f60f5] shadow-[0_14px_26px_rgba(102,72,212,0.24)]" />
      <div className="absolute right-[52px] top-[84px] h-14 w-36 rounded-[14px] bg-[#6a45ef] shadow-[0_14px_26px_rgba(72,41,171,0.22)]" />
      <div className="absolute right-[86px] top-[36px] h-16 w-16 rounded-full border-[10px] border-[#191919] bg-transparent" />
      <div className="absolute right-[48px] top-[90px] h-16 w-3 rotate-[-40deg] rounded-full bg-[#191919]" />
    </div>
  );
}

function HeadsetArt() {
  return (
    <svg viewBox="0 0 180 140" className="h-[188px] w-[220px]" aria-hidden>
      <defs>
        <linearGradient id="mosaic-headset-band" x1="0" x2="1">
          <stop offset="0%" stopColor="#8d75f4" />
          <stop offset="100%" stopColor="#5b39d9" />
        </linearGradient>
      </defs>
      <path d="M48 66a42 42 0 0 1 84 0" stroke="url(#mosaic-headset-band)" strokeWidth="14" fill="none" />
      <path d="M48 66a42 42 0 0 1 84 0" stroke="#191919" strokeWidth="5" fill="none" />
      <rect x="36" y="62" width="24" height="42" rx="12" fill="#191919" />
      <rect x="120" y="62" width="24" height="42" rx="12" fill="#191919" />
      <rect x="42" y="65" width="18" height="36" rx="9" fill="#7c63f2" />
      <rect x="120" y="65" width="18" height="36" rx="9" fill="#7c63f2" />
      <rect x="66" y="104" width="60" height="28" rx="10" fill="#ffc700" />
      <circle cx="83" cy="118" r="6" fill="#191919" />
      <circle cx="98" cy="118" r="6" fill="#191919" />
      <circle cx="113" cy="118" r="6" fill="#191919" />
      <path d="M126 112c21 2 31 14 31 24" stroke="#7c63f2" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="157" cy="136" r="4" fill="#191919" />
    </svg>
  );
}

function CartArt() {
  return (
    <svg viewBox="0 0 220 160" className="h-[185px] w-[235px]" aria-hidden>
      <path d="M28 34h16l18 68h96l18-54H66" stroke="#8d8d8d" strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M28 34h16l18 68h96l18-54H66" stroke="#191919" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.65" />
      <circle cx="86" cy="122" r="10" fill="#7c63f2" />
      <circle cx="150" cy="122" r="10" fill="#7c63f2" />
      <circle cx="86" cy="122" r="5" fill="#ffc700" />
      <circle cx="150" cy="122" r="5" fill="#ffc700" />
      <rect x="92" y="10" width="34" height="54" rx="6" fill="#ffc700" transform="rotate(6 92 10)" />
      <path d="M98 20c3-8 16-8 19 0" stroke="#191919" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="128" y="2" width="34" height="56" rx="6" fill="#ff5ca8" transform="rotate(6 128 2)" />
      <path d="M134 12c3-8 16-8 19 0" stroke="#191919" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="48" y="80" width="30" height="48" rx="6" fill="#8b72f2" transform="rotate(8 48 80)" />
      <path d="M52 88c2-6 12-6 14 0" stroke="#191919" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function GlobeArt() {
  return (
    <svg viewBox="0 0 220 160" className="h-[188px] w-[220px]" aria-hidden>
      <circle cx="120" cy="76" r="54" fill="#7c63f2" />
      <path d="M88 48c11-17 31-25 49-24 13 1 22 4 35 12-6 6-15 6-19 13-3 5 1 12-4 16-5 4-12 0-17 2-5 3-6 10-11 14-7 5-17 2-25 7-8 4-14 13-14 13-13-13-12-39 6-58z" fill="#ffd300" />
      <path d="M130 96c15-2 28 4 38 14-5 11-16 19-29 18-9 0-18-4-24-11 3-8 8-18 15-21z" fill="#ffd300" />
      <path d="M72 128h92" stroke="#191919" strokeWidth="5" strokeLinecap="round" />
      <path d="M118 128v12" stroke="#191919" strokeWidth="5" strokeLinecap="round" />
      <path d="M160 36l28 -18" stroke="#191919" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="82" cy="30" r="16" fill="#ffc700" />
      <path d="M82 18c-8 0-14 6-14 14 0 9 11.5 20.7 14 23 1-1.2 14-13 14-23 0-8-6-14-14-14zm0 20a6 6 0 1 1 0-12 6 6 0 0 1 0 12z" fill="#191919" />
      <path d="M166 14l26 14-22 4 5 14-12-8-9 11 2-16-15-1 13-8-8-12 14 5 6-13z" fill="#ffffff" />
    </svg>
  );
}

function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`relative overflow-hidden rounded-3xl ${className ?? ""}`}>{children}</div>;
}

export function InfoMosaic() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [agreed, setAgreed] = useState(true);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !agreed) return;
    setSent(true);
    setEmail("");
  }

  return (
    <section className="site-shell py-3">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1065px)_minmax(0,445px)] gap-5">
          <Card className="min-h-[234px] bg-[#fdc003] p-6 flex flex-col justify-between">
            <div className="relative z-10 flex max-w-[380px] flex-col gap-6">
              <span className="inline-flex w-fit rounded-full bg-[#836de8] px-5 py-2 font-heading text-[26px] leading-none font-semibold text-[#faf8f2]">
                Карта цен всего мира
              </span>
              <p className="font-sans text-xl leading-tight font-medium text-[#755f0f]">
                Самолёты, поезда и автобусы
                <br />
                в одном сервисе
              </p>
            </div>
            <a
              href="#"
              className="relative z-10 inline-flex w-fit items-center justify-center rounded-[14px] bg-white px-4 py-3 font-heading text-base leading-none font-semibold text-[#191919] transition-colors hover:bg-[#faf8f2]"
            >
              Открыть
            </a>
            <WorldArt />
          </Card>

          <Card className="min-h-[234px] bg-white p-6 flex flex-col justify-between">
            <div className="relative z-10 flex max-w-[320px] flex-col gap-6">
              <h3 className="font-heading text-[26px] leading-none font-semibold text-[#191919]">
                Энциклопедия
              </h3>
              <p className="font-sans text-xl leading-tight font-medium text-[#757575]">
                Всё о покупке, оплате,
                <br />
                возврате и поездках
              </p>
            </div>
            <a
              href="#"
              className="relative z-10 inline-flex w-fit items-center justify-center rounded-xl bg-[#ffc700] px-6 py-3 font-sans text-base leading-none font-semibold text-[#191919] transition-colors hover:bg-[#f0ba00]"
            >
              Перейти в раздел
            </a>
            <BooksArt />
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <Card className="min-h-[245px] bg-white p-6">
            <div className="relative z-10 flex max-w-[290px] flex-col gap-6">
              <h3 className="font-heading text-[26px] leading-none font-semibold text-[#191919]">
                Реальная поддержка
              </h3>
              <p className="font-sans text-xl leading-tight font-medium text-[#757575]">
                Оперативно отвечаем и
                <br />
                сопровождаем на каждом
                <br />
                этапе
              </p>
            </div>
            <div className="absolute right-0 bottom-0">
              <HeadsetArt />
            </div>
          </Card>

          <Card className="min-h-[245px] bg-white p-6">
            <div className="relative z-10 flex max-w-[260px] flex-col gap-6">
              <h3 className="font-heading text-[26px] leading-none font-semibold text-[#191919]">
                Всё тут
              </h3>
              <p className="font-sans text-xl leading-tight font-medium text-[#757575]">
                Автобусные,
                <br />
                железнодорожные
                <br />
                и авиабилеты
                <br />
                в одном месте
              </p>
            </div>
            <div className="absolute right-0 bottom-0">
              <CartArt />
            </div>
          </Card>

          <Card className="min-h-[245px] bg-white p-6">
            <div className="relative z-10 flex max-w-[300px] flex-col gap-6">
              <h3 className="font-heading text-[26px] leading-none font-semibold text-[#191919]">
                Билеты по всему миру
              </h3>
              <p className="font-sans text-xl leading-tight font-medium text-[#757575]">
                Маршруты по России, СНГ
                <br />
                и всему миру
              </p>
            </div>
            <div className="absolute right-0 bottom-0">
              <GlobeArt />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,445px)_minmax(0,290px)_minmax(0,290px)_minmax(0,445px)] gap-5">
          <Card className="min-h-[205px] bg-white p-6">
            <div className="flex flex-col gap-6">
              <h3 className="font-heading text-4xl leading-none font-semibold text-[#191919]">
                3 вида транспорта
              </h3>
              <p className="max-w-[250px] font-sans text-xl leading-tight font-medium text-[#757575]">
                Автобусы, поезда и самолёты.
              </p>
            </div>
          </Card>

          <Card className="min-h-[205px] bg-white p-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-end justify-between gap-3">
                <h3 className="font-heading text-4xl leading-none font-semibold text-[#191919]">
                  1 сервис
                </h3>
                <div className="flex">
                  <span className="h-8 w-8 rounded-full bg-[#ffc700]" />
                  <span className="-ml-2 h-8 w-8 rounded-full bg-[#001dff]" />
                  <span className="-ml-2 h-8 w-8 rounded-full bg-[#ff0000]" />
                </div>
              </div>
              <p className="max-w-[238px] font-sans text-xl leading-tight font-medium text-[#757575]">
                Все билеты
                <br />
                в одном месте
              </p>
            </div>
          </Card>

          <Card className="min-h-[205px] bg-white p-6">
            <div className="flex flex-col gap-6">
              <h3 className="font-heading text-4xl leading-none font-semibold text-[#191919]">
                28 лет
              </h3>
              <p className="max-w-[232px] font-sans text-xl leading-tight font-medium text-[#757575]">
                Работаем для путешественников
              </p>
            </div>
          </Card>

          <Card className="min-h-[205px] bg-white p-6">
            <div className="flex h-full flex-col gap-3">
              <p className="max-w-[377px] font-sans text-xl leading-tight font-medium text-[#757575]">
                Подпишитесь на рассылку и получайте выгодные предложения.
              </p>

              <form onSubmit={handleSubmit} className="mt-auto flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={sent ? "Спасибо, вы подписаны" : "Email"}
                    className="h-12 flex-1 min-w-0 rounded-xl border border-[#191919]/20 px-4 font-sans text-base font-light text-[#191919] outline-none placeholder:text-[#757575]"
                  />
                  <button
                    type="submit"
                    aria-label="Подписаться"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#ffc700] transition-colors hover:bg-[#f0ba00]"
                  >
                    <ArrowUpRightIcon className="h-5 w-5 text-[#191919]" />
                  </button>
                </div>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-6 w-6 rounded-lg border border-[#191919]/20 accent-[#836de8]"
                  />
                  <span className="font-sans text-sm leading-[14px] text-[#191919]">
                    Я согласен на{" "}
                    <span className="font-semibold text-[#836de8]">обработку персональных данных</span>{" "}
                    и получение информационных рассылок
                  </span>
                </label>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
