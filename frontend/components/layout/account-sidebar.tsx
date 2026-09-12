"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Ticket, User, UsersRound } from "lucide-react";

import promoArt from "@assets/images/common/left-sidebar/image.png";
import { ACCOUNT_ROUTES } from "@/lib/routing/public-paths";

/**
 * Боковое меню личного кабинета.
 *
 * По макету: колонка 320px, padding 32, белый фон, правая граница #f6f6f6.
 * Сверху — разделы, снизу прижата жёлтая промо-карточка.
 *
 * Пункты видны и до входа: на экране авторизации сайдбар уже показан, просто
 * разделы за ним закрыты. Активный подсвечивается жёлтым — это `primary`,
 * остальные `ghost`.
 */

const ITEMS = [
  { label: "Мои билеты", href: ACCOUNT_ROUTES.tickets, Icon: Ticket },
  { label: "Уведомления", href: ACCOUNT_ROUTES.messages, Icon: Bell },
  { label: "Профиль", href: ACCOUNT_ROUTES.root, Icon: User },
  { label: "Пассажиры", href: ACCOUNT_ROUTES.passengers, Icon: UsersRound },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    // `overflow-y-auto`: если пунктов станет больше, прокручивается меню, а не
    // страница — промо-карточка при этом остаётся прижатой к низу.
    <aside className="flex w-[330px] shrink-0 flex-col justify-between overflow-y-auto border-r border-db-border-subtle bg-db-surface-default p-8">
      <nav className="flex flex-col">
        {ITEMS.map(({ label, href, Icon }, index) => {
          /*
           * На экране входа разделов ещё нет, но меню в макете не пустое:
           * первый пункт показан активным. Поэтому при отсутствии совпадения
           * по адресу подсвечивается «Мои билеты».
           */
          /*
           * У «Профиля» адрес — префикс всех остальных разделов кабинета
           * (`/profile/passengers`), поэтому для него нужно точное совпадение:
           * иначе на странице пассажиров подсвечиваются сразу два пункта.
           */
          const active =
            href === ACCOUNT_ROUTES.root
              ? pathname === href
              : pathname.startsWith(href) ||
                (index === 0 && !pathname.startsWith(ACCOUNT_ROUTES.root));

          return (
            <Link
              key={label}
              href={href}
              className={
                "squircle flex items-center gap-1 rounded-db-md px-5 py-4 " +
                "transition-colors duration-300 ease-out " +
                (active ? "bg-db-button-primary-bg" : "hover:bg-db-surface-muted")
              }
            >
              <Icon className="size-6 shrink-0 text-db-text-primary" strokeWidth={2} aria-hidden />
              <span className="px-1 text-[16px] leading-5 font-semibold text-db-text-primary">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Промо-карточка. Иллюстрация вылезает за левый край — так в макете. */}
      <div className="squircle relative flex h-96 flex-col gap-3 overflow-hidden rounded-db-xl bg-db-surface-base p-6">
        <h2 className="relative z-10 text-[30px] leading-9 font-semibold text-db-text-primary">
          Путешествие{" "}
          <span className="relative inline-block">
            {/*
             * Фиолетовая плашка под «с комфортом». Наклон против часовой:
             * в макете правый край приподнят, а не опущен. Торцы круглые —
             * `rounded-full`, а не радиус из токенов: у плашки высота задаёт
             * скругление целиком.
             */}
            <span
              /* Вылет 15px по горизонтали и почти вплотную по вертикали:
                 в макете плашка широкая, но обнимает строку по высоте. */
              className="absolute -inset-x-[15px] -inset-y-px -z-10 rounded-full bg-db-accent"
              style={{ transform: "rotate(-2deg)" }}
              aria-hidden
            />
            <span className="text-db-text-inverse">с комфортом</span>
          </span>
        </h2>

        <p className="relative z-10 text-[20px] leading-6 text-db-text-primary">
          Возврат онлайн,
          <br />
          поддержка 24/7
        </p>

        {/*
         * Ассет — готовый фрагмент: чемодан лежит в его правом нижнем углу и
         * там же обрезан. Поэтому он и ставится в правый нижний угол карточки
         * «как есть», без своих координат — любое смещение обнажает пустое
         * поле слева от чемодана.
         */}
        <Image
          src={promoArt}
          alt=""
          width={530}
          height={570}
          aria-hidden
          /* Крупнее и ниже: в макете чемодан занимает почти всю ширину карточки
             и срезается её нижним краем, а не стоит миниатюрой в углу. */
          className="pointer-events-none absolute -right-6 -bottom-4 h-[320px] w-auto max-w-none object-contain"
        />
      </div>
    </aside>
  );
}
