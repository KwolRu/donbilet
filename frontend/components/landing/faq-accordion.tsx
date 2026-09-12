"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { MockFaq } from "@app/core/mocks/faq";

/**
 * Аккордеон вопросов.
 *
 * Общий для секции главной и страницы `/faq`. Раскрыт всегда ровно один
 * вопрос — как в макете; повторный клик по открытому закрывает его.
 *
 * По умолчанию раскрыт первый: пустой список вопросов выглядел бы как
 * незагруженный блок. Страница со списком категорий передаёт
 * `defaultOpenId={null}` — там раскрытый вопрос при переключении категории
 * прыгал бы по высоте.
 */
export function FaqAccordion({
  items,
  defaultOpenId,
}: {
  items: MockFaq[];
  /** `null` — все свёрнуты. По умолчанию раскрыт первый вопрос списка. */
  defaultOpenId?: number | null;
}) {
  const [openId, setOpenId] = useState<number | null>(
    defaultOpenId === undefined ? (items[0]?.id ?? null) : defaultOpenId,
  );

  return (
    <div className="flex w-full flex-col gap-2">
      {items.map((item) => {
        const open = item.id === openId;

        return (
          <div
            key={item.id}
            /* Без `gap`: закрытый ответ остаётся в разметке, и зазор висел бы впустую.
               Отступ над текстом задан внутри раскрывающегося блока. */
            className="flex w-full flex-col squircle rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
              className="group flex w-full items-center justify-between gap-4 text-left"
            >
              <span className="text-db-item font-medium text-db-text-primary transition-colors duration-300 ease-out group-hover:text-db-text-secondary">
                {item.question}
              </span>

              <span
                className={
                  "flex shrink-0 items-center justify-center squircle rounded-db-sm p-3 " +
                  "transition-colors duration-300 ease-out " +
                  (open ? "bg-db-surface-base" : "bg-db-surface-muted")
                }
              >
                <ChevronDown
                  className={
                    "size-4 text-db-text-secondary transition-transform duration-300 ease-out " +
                    (open ? "rotate-180" : "")
                  }
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
            </button>

            {/*
             * Ответ не снимается с разметки: раскрытие анимируется через
             * `grid-template-rows` (0fr → 1fr), а условный рендер такого
             * перехода не даёт — блок появлялся бы рывком.
             */}
            <div className={"db-collapse " + (open ? "db-collapse-open" : "")}>
              <div>
                <p className="pt-3 text-db-prose text-db-text-secondary">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
