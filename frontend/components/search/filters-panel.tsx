"use client";

import { useState } from "react";
import { RotateCcw, X } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { DbToggle } from "@/components/ui/db-primitives";
import { RadioGroup, RadioItem } from "@/components/ui/radio";
import { SidePanel } from "@/components/layout-panels/side-panel";
import { FILTER_SECTIONS } from "@app/core/mocks/search";

/**
 * Подробные фильтры выдачи.
 *
 * Каждая секция включается тумблером целиком: выключенная секция не
 * участвует в отборе, и её варианты гаснут — так видно, что выбор внутри
 * ничего не изменит, пока секция выключена.
 *
 * Варианты — радиокнопки: в макете внутри секции выбирается одно значение
 * («от 20 кг» включает и 20, и больше). Рядом с каждым — цена «от», чтобы
 * было видно, во что обойдётся условие.
 *
 * Кнопка слева от «Показать» сбрасывает всё — то же действие, что чип
 * «Очистить» над выдачей.
 */

type Selection = Record<string, string | null>;
type Enabled = Record<string, boolean>;

export function FiltersPanel({
  open,
  foundCount,
  onClose,
  onApply,
  onReset,
}: {
  open: boolean;
  foundCount: number;
  onClose: () => void;
  onApply: (selection: Selection) => void;
  onReset: () => void;
}) {
  const [enabled, setEnabled] = useState<Enabled>(() =>
    Object.fromEntries(FILTER_SECTIONS.map((section) => [section.id, true])),
  );
  const [selection, setSelection] = useState<Selection>({});

  function reset() {
    setEnabled(Object.fromEntries(FILTER_SECTIONS.map((section) => [section.id, true])));
    setSelection({});
    onReset();
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      className="!p-0"
      header={
        <div className="flex flex-col items-end gap-4 px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="transition-[opacity,transform] duration-300 ease-db hover:rotate-90 hover:opacity-60"
          >
            <X className="size-6 text-db-text-primary" strokeWidth={2} aria-hidden />
          </button>

          <h2 className="w-full text-db-subsection font-medium text-db-text-primary">Фильтры</h2>
        </div>
      }
      footer={
        <div className="flex items-stretch gap-2.5 px-6 pt-0 pb-6">
          <button
            type="button"
            onClick={reset}
            aria-label="Сбросить фильтры"
            className="squircle flex size-14 shrink-0 items-center justify-center rounded-db-md bg-db-surface-primary transition-[filter,transform] duration-300 ease-db hover:brightness-125 active:scale-95"
          >
            <RotateCcw className="size-6 text-db-text-inverse" strokeWidth={2} aria-hidden />
          </button>

          <DbButton
            variant="primary"
            size="large"
            fullWidth
            onClick={() => onApply(selection)}
          >
            Показать {foundCount} рейса
          </DbButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-6 pb-6">
        {FILTER_SECTIONS.map((section) => {
          const on = enabled[section.id];

          return (
            <fieldset
              key={section.id}
              className="squircle flex flex-col gap-4 rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle"
            >
              <div className="flex items-center justify-between gap-4">
                <legend className="text-[20px] leading-7 font-medium text-db-text-primary">
                  {section.title}
                </legend>

                <DbToggle
                  checked={on}
                  onChange={(next) =>
                    setEnabled((current) => ({ ...current, [section.id]: next }))
                  }
                  label={`${section.title}: учитывать в фильтре`}
                />
              </div>

              {/* Выключенная секция гаснет и перестаёт ловить нажатия: выбор
                  внутри неё всё равно ни на что не повлияет. */}
              <div
                className={
                  "flex flex-col gap-3 transition-opacity duration-300 ease-db " +
                  (on ? "opacity-100" : "pointer-events-none opacity-40")
                }
              >
                {/* Радио — общий компонент: свой рисовать значило бы завести
                    вторые состояния фокуса и наведения, которые потом
                    разъедутся с остальными формами. */}
                <RadioGroup
                  value={selection[section.id] ?? ""}
                  onChange={(next) =>
                    setSelection((current) => ({ ...current, [section.id]: next }))
                  }
                  className="flex flex-col gap-3"
                >
                  {section.options.map((option) => (
                    <RadioItem key={option.value} value={option.value} className="w-full">
                      <span className="flex flex-1 items-center justify-between gap-4">
                        <span className="text-db-body text-db-text-primary">{option.label}</span>
                        <span className="text-db-caption text-db-text-secondary">
                          {option.price}
                        </span>
                      </span>
                    </RadioItem>
                  ))}
                </RadioGroup>
              </div>
            </fieldset>
          );
        })}
      </div>
    </SidePanel>
  );
}
