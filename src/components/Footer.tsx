import { Logo } from "./Logo";
import { QrCode } from "./QrCode";
import { HotelIcon, TrainIcon, PlaneIcon, VkIcon, OkIcon, TelegramIcon } from "./Icons";

const FOOTER_ITEMS = [
  { icon: HotelIcon, title: "Все отели", text: "Уже на ДонБилет" },
  { icon: TrainIcon, title: "Ж/Д билеты", text: "По цене автобусных" },
  { icon: PlaneIcon, title: "Авиа билеты", text: "Летай без наценок" },
];

export function Footer() {
  return (
    <footer className="site-wide pb-6">
      <div className="bg-white rounded-3xl px-6 sm:px-10 py-10 flex flex-col gap-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="flex flex-col gap-5">
            <Logo />
            <div className="flex items-center gap-3">
              <a href="#" aria-label="VK" className="w-11 h-11 rounded-xl bg-[#faf8f2] flex items-center justify-center text-[#757575] hover:bg-[#f0ede3]">
                <VkIcon className="w-[18px] h-[18px]" />
              </a>
              <a href="#" aria-label="OK" className="w-11 h-11 rounded-xl bg-[#faf8f2] flex items-center justify-center text-[#757575] hover:bg-[#f0ede3]">
                <OkIcon className="w-[18px] h-[18px]" />
              </a>
              <a href="#" aria-label="Telegram" className="w-11 h-11 rounded-xl bg-[#faf8f2] flex items-center justify-center text-[#757575] hover:bg-[#f0ede3]">
                <TelegramIcon className="w-[18px] h-[18px]" />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <a href="#" className="font-sans font-medium text-lg text-[#191919]">О ДонБилет</a>
            <a href="#" className="font-sans font-medium text-lg text-[#191919]">Контакты</a>
            <a href="#" className="font-sans font-medium text-lg text-[#191919]">Вопросы и ответы</a>
            <a href="#" className="font-sans font-medium text-lg text-[#191919]">Расписание</a>
          </div>

          <div className="flex flex-col gap-5">
            {FOOTER_ITEMS.map((item) => (
              <a key={item.title} href="#" className="flex items-center gap-3">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-[#faf8f2] flex items-center justify-center text-[#757575]">
                  <item.icon className="w-[18px] h-[18px]" />
                </span>
                <span className="flex flex-col">
                  <span className="font-heading font-semibold text-lg text-[#191919]">{item.title}</span>
                  <span className="font-sans font-light text-sm text-[#191919]">{item.text}</span>
                </span>
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-[#faf8f2] rounded-3xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2 min-w-0">
                <span className="font-heading font-semibold text-lg text-[#191919]">В приложении тоже удобно</span>
                <p className="font-sans font-light text-sm text-[#191919]">
                  Если цена на билет упадёт, сразу пришлём уведомление
                </p>
              </div>
              <QrCode className="w-16 h-16 shrink-0 rounded-lg overflow-hidden" />
            </div>

            <div className="bg-[#faf8f2] rounded-3xl px-5 py-4 flex flex-col gap-3">
              <span className="font-heading font-semibold text-lg text-[#191919]">Рассылка с выгодными билетами</span>
              <input
                type="email"
                placeholder="На какую почту отправлять"
                className="h-12 px-4 rounded-xl border border-[#191919]/15 bg-white text-sm font-sans font-light outline-none"
              />
              <p className="font-sans text-xs text-[#191919]">
                <strong className="font-bold">Соглашаюсь получать рекламу,</strong> нескучные письма, подборки
                билетов и другие полезности
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#191919]/10 pt-6 flex flex-wrap gap-4 sm:gap-8 text-sm text-[#757575]">
          <span className="font-medium text-[#191919]">Документы</span>
          <a href="#">Договор оферты</a>
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Согласие на обработку персональных данных</a>
        </div>
      </div>
    </footer>
  );
}
