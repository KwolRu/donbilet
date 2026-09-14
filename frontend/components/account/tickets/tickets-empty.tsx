"use client";

import { motion, useReducedMotion } from "motion/react";

import { DbButton } from "@/components/ui/db-button";

/**
 * Пустой результат подборки.
 *
 * Строка «ничего не нашлось» на всю ширину карточки читалась как ошибка
 * загрузки: белая полоса и серый текст посередине. Здесь то же сообщение, но
 * с иллюстрацией, разбором причин и действием — уйти отсюда можно в один
 * клик, не гадая, что сбрасывать.
 *
 * Подсказки разные в зависимости от того, что именно сузило список: искали
 * текстом, выбрали транспорт или и то и другое. Универсальное «измените
 * запрос или снимите фильтр» бесполезно, когда фильтра нет.
 */
export function TicketsEmpty({
  query,
  filterLabel,
  onReset,
}: {
  /** Текст поиска — пустая строка, если не искали. */
  query: string;
  /** Подпись выбранного транспорта или `null`, когда выбраны «Все». */
  filterLabel: string | null;
  onReset: () => void;
}) {
  const reduced = useReducedMotion();

  /*
   * Длинный запрос обрезаем: он попадает в заголовок 30px, и строка вроде
   * «фываыфваыфваыфва» разрывает его на две — заголовок перестаёт читаться
   * как заголовок.
   */
  const shownQuery = query.trim().length > 24 ? `${query.trim().slice(0, 24)}…` : query.trim();
  const title = query ? `По запросу «${shownQuery}» ничего нет` : "Здесь пока пусто";

  const description = query
    ? filterLabel
      ? `Мы искали среди поездок в категории «${filterLabel}». Попробуйте другой запрос или посмотрите все виды транспорта.`
      : "Проверьте написание города или номера заказа — искать можно и по тому, и по другому."
    : filterLabel
      ? `Поездок в категории «${filterLabel}» не нашлось. В других категориях они могут быть.`
      : "Купленные билеты появятся здесь сразу после оплаты.";

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      /*
       * Блок занимает всю оставшуюся высоту рабочей области, а содержимое
       * стоит по центру. Иначе на пустом результате получалась узкая белая
       * полоса под тулбаром и гектар серого фона под ней.
       */
      className="squircle flex flex-1 flex-col items-center justify-center gap-6 rounded-db-xl bg-db-surface-default p-10 text-center"
    >
      <EmptyArt />

      <div className="flex max-w-[560px] flex-col gap-2">
        <h2 className="text-db-subsection font-medium text-db-text-primary">{title}</h2>
        <p className="text-db-body leading-6 text-db-text-secondary">{description}</p>
      </div>

      {(query || filterLabel) && (
        <DbButton variant="primary" onClick={onReset}>
          Показать все поездки
        </DbButton>
      )}
    </motion.div>
  );
}

/**
 * Иллюстрация: билет с оторванным корешком и лупа поверх.
 *
 * Нарисована здесь, а не выгружена из макета: пустого состояния в макете нет,
 * а тащить в проект чужую картинку ради заглушки хуже, чем собрать фигуру из
 * тех же форм, что и сама карточка билета.
 */
function EmptyArt() {
  return (
    <svg viewBox="0 0 240 152" fill="none" aria-hidden className="h-[152px] w-[240px]">
      {/* Тень-подложка: билет не висит в воздухе. */}
      <ellipse cx="116" cy="134" rx="86" ry="8" fill="var(--color-db-surface-muted)" />

      {/* Билет целиком, слегка наклонён — как лежащий на столе. */}
      <g transform="rotate(-4 116 70)">
        {/* Светлая половина и жёлтый корешок. */}
        <rect x="24" y="30" width="132" height="80" rx="14" fill="var(--color-db-surface-muted)" />
        <rect x="156" y="30" width="56" height="80" rx="14" fill="var(--color-db-surface-base)" />

        {/* Просечка по линии отрыва и «надкусы» по её концам. */}
        <path
          d="M156 40v60"
          stroke="var(--color-db-surface-default)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="5 6"
        />
        <circle cx="156" cy="30" r="7" fill="var(--color-db-surface-default)" />
        <circle cx="156" cy="110" r="7" fill="var(--color-db-surface-default)" />

        {/* Строки на билете: маршрут и данные под ним. */}
        <rect x="42" y="48" width="74" height="9" rx="4.5" fill="var(--color-db-border-default)" />
        <rect x="42" y="68" width="98" height="7" rx="3.5" fill="var(--color-db-border-subtle)" />
        <rect x="42" y="83" width="60" height="7" rx="3.5" fill="var(--color-db-border-subtle)" />
      </g>

      {/*
       * Лупа стоит в углу и заходит на билет лишь краем: в прошлый раз она
       * была в центре и закрывала собой всё, ради чего рисовался билет.
       * Белая заливка круга отделяет её от подложки.
       */}
      <circle
        cx="176"
        cy="96"
        r="27"
        fill="var(--color-db-surface-default)"
        stroke="var(--color-db-text-primary)"
        strokeWidth="7"
      />
      <path
        d="M196 116l16 16"
        stroke="var(--color-db-text-primary)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Внутри лупы пусто — только прочерк: ничего не нашлось. */}
      <path
        d="M166 96h20"
        stroke="var(--color-db-text-tertiary)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
