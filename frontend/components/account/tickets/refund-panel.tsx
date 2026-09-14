"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { DbCheckbox } from "@/components/ui/db-checkbox";
import { HoverTooltip } from "@/components/common/hover-tooltip";
import { SidePanel } from "@/components/layout-panels/side-panel";
import { REFUND_FEE_HINT, formatPrice, type Ticket } from "@app/core/mocks/tickets";

/**
 * Возврат билета: выбор пассажиров, расчёт и подтверждение.
 *
 * Два шага в одной панели — форма и результат. Отдельной панелью результат
 * делать нельзя: между ними нет перехода назад, а закрытие возвращает в
 * список, и две панели подряд читались бы как сбой.
 *
 * Возвращают поштучно: в заказе может ехать трое, а сдать билет нужен одному.
 * Поэтому сумма к возврату считается по выбранным пассажирам, а не берётся
 * из заказа целиком.
 *
 * Удержание перевозчика — 5% от стоимости выбранных билетов (нижняя ступень
 * ст. 23 ФЗ № 259-ФЗ). Точную ставку считает API возврата; до его появления
 * (блокер B1) здесь честная нижняя граница, а не выдуманное число.
 */

const CARRIER_FEE_RATE = 0.05;

export function RefundPanel({
  open,
  ticket,
  onClose,
}: {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [openedFor, setOpenedFor] = useState<number | null>(null);

  /*
   * Каждое открытие — новый возврат: панель не размонтируется, и без сброса в
   * неё попал бы выбор из прошлого заказа. По умолчанию отмечены все — чаще
   * сдают заказ целиком, а снять галочку проще, чем поставить три.
   *
   * Сброс во время рендера, а не в эффекте: иначе первый кадр покажет чужой
   * выбор и чужую сумму.
   */
  if (open && ticket && ticket.id !== openedFor) {
    setOpenedFor(ticket.id);
    setSelected(ticket.passengers.map((passenger) => passenger.id));
    setDone(false);
  }

  if (!open && openedFor !== null) setOpenedFor(null);

  if (!ticket) {
    // Панель остаётся в дереве и после закрытия: у неё есть анимация ухода.
    return (
      <SidePanel open={false} onClose={onClose}>
        {null}
      </SidePanel>
    );
  }

  const chosen = ticket.passengers.filter((passenger) => selected.includes(passenger.id));
  const gross = chosen.reduce((sum, passenger) => sum + passenger.price, 0);
  const fee = Math.round(gross * CARRIER_FEE_RATE);
  const refund = gross - fee;

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
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

          <h2 className="w-full text-db-subsection font-medium text-db-text-primary">
            Возврат билета
          </h2>
        </div>
      }
      footer={
        <div className="flex gap-3 px-6 pt-0 pb-6">
          {done ? (
            <DbButton variant="primary" size="large" fullWidth onClick={onClose}>
              Готово
            </DbButton>
          ) : (
            <>
              <DbButton variant="lianer" size="large" fullWidth onClick={onClose}>
                Отмена
              </DbButton>

              <DbButton
                variant="primary"
                size="large"
                fullWidth
                disabled={chosen.length === 0}
                onClick={() => setDone(true)}
              >
                Подтвердить
              </DbButton>
            </>
          )}
        </div>
      }
    >
      {done ? (
        <RefundDone amount={refund} />
      ) : (
        <div className="flex flex-col gap-6 px-6 pb-6">
          <div className="flex flex-col gap-1">
            <span className="text-db-item font-medium text-db-text-primary">
              {ticket.departure.city} - {ticket.arrival.city}
            </span>
            <span className="text-db-body text-db-text-secondary">{ticket.departure.date}</span>
          </div>

          <ul className="flex flex-col gap-3">
            {ticket.passengers.map((passenger) => (
              <li key={passenger.id}>
                <DbCheckbox
                  checked={selected.includes(passenger.id)}
                  onChange={() => toggle(passenger.id)}
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-db-body text-db-text-primary">{passenger.name}</span>
                    <span className="text-db-caption text-db-text-secondary">
                      Билет № {passenger.ticketNumber} · место {passenger.seat}
                    </span>
                    <span className="text-db-item font-medium text-db-text-primary">
                      {formatPrice(passenger.price)}
                    </span>
                  </span>
                </DbCheckbox>
              </li>
            ))}
          </ul>

          <div className="squircle flex flex-col gap-4 rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
            <div className="flex items-center justify-between gap-2">
              <span className="text-db-item font-medium text-db-text-primary">
                Условия возврата
              </span>

              <HoverTooltip content={REFUND_FEE_HINT} contentClassName="w-64">
                <Info className="size-4 text-db-text-tertiary" strokeWidth={1.5} aria-hidden />
              </HoverTooltip>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[36px] leading-10 font-medium text-db-text-primary">
                {formatPrice(refund)}
              </span>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-db-caption text-db-text-primary">Стоимость билета</span>
                  <span className="mb-1 h-px flex-1 bg-db-border-default" aria-hidden />
                  <span className="text-db-caption text-db-text-primary">
                    {formatPrice(gross)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1">
                    <span className="text-db-caption text-db-text-primary">
                      Удержание перевозчика
                    </span>

                    <HoverTooltip content={REFUND_FEE_HINT} contentClassName="w-64">
                      <Info className="size-4 text-db-text-tertiary" strokeWidth={1.5} aria-hidden />
                    </HoverTooltip>
                  </span>
                  <span className="mb-1 h-px flex-1 bg-db-border-default" aria-hidden />
                  <span className="shrink-0 text-db-caption text-db-text-primary">
                    −{formatPrice(fee)}
                  </span>
                </div>
              </div>
            </div>

            <p className="squircle rounded-db-sm bg-db-surface-muted p-3 text-db-caption leading-5 text-db-text-primary">
              Сумма рассчитана по условиям перевозчика. После подтверждения возврат нельзя будет
              отменить.
            </p>
          </div>

          <div className="squircle flex flex-col gap-2 rounded-db-sm bg-bg-surface-base-elevated p-3">
            <span className="text-db-body font-medium text-db-text-primary">Внимание</span>
            <span className="text-db-caption leading-5 text-db-text-secondary">
              После подтверждения возврат билета будет оформлен окончательно. Отменить действие
              после подтверждения нельзя.
            </span>
          </div>
        </div>
      )}
    </SidePanel>
  );
}

/**
 * Медаль с галочкой над надписью «Возврат оформлен».
 *
 * Нарисована здесь, а не выгружена из макета: на тарифе Figma кончился лимит
 * MCP-вызовов. Форма повторяет иллюстрацию — жёлтый круг, тёмная галочка,
 * блик и искры. Когда ассет выгрузят, компонент заменяется на `Image`.
 */
function RefundDoneArt() {
  return (
    <svg
      viewBox="0 0 166 117"
      fill="none"
      aria-hidden
      className="h-[117px] w-[166px]"
      role="presentation"
    >
      <circle cx="83" cy="60" r="42" fill="var(--color-db-surface-base)" />
      <circle cx="83" cy="60" r="32" fill="#fff8e0" />
      <path
        d="M69 60.5 79 70.5 98 51"
        stroke="var(--color-db-text-primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M62 26c0-1 1-1 1 0l1.5 5 5 1.5c1 .3 1 1.2 0 1.5l-5 1.5-1.5 5c-.3 1-1.2 1-1.5 0l-1.5-5-5-1.5c-1-.3-1-1.2 0-1.5l5-1.5 1.5-5Z"
        fill="var(--color-db-surface-base)"
      />
      <path
        d="M122 74c0-1 1-1 1 0l1 3.5 3.5 1c1 .3 1 1.2 0 1.5l-3.5 1-1 3.5c-.3 1-1.2 1-1.5 0l-1-3.5-3.5-1c-1-.3-1-1.2 0-1.5l3.5-1 1-3.5Z"
        fill="var(--color-db-surface-base)"
      />
      <ellipse cx="83" cy="108" rx="34" ry="5" fill="var(--color-db-surface-muted)" />
    </svg>
  );
}

/** Экран «Возврат оформлен» — второй шаг той же панели. */
function RefundDone({ amount }: { amount: number }) {
  return (
    <div className="flex flex-col gap-4 px-6 pb-6">
      <div className="squircle flex flex-col items-center gap-4 rounded-db-md bg-db-surface-default px-4 pt-6 pb-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <div className="flex flex-col items-center gap-2">
          <RefundDoneArt />

          <div className="flex flex-col items-center gap-1">
            <span className="text-[20px] leading-7 font-medium text-db-text-primary">
              Возврат оформлен
            </span>
            <span className="text-db-body text-db-text-secondary">Заявка на возврат принята</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[36px] leading-10 font-medium text-db-text-primary">
            {formatPrice(amount)}
          </span>
          <span className="text-db-body text-db-text-secondary">К возврату</span>
        </div>

        <p className="squircle rounded-db-sm bg-bg-surface-base-elevated p-3 text-center text-db-caption leading-5 text-db-text-secondary">
          Деньги будут возвращены тем же способом, которым был оплачен билет. Срок зачисления
          зависит от банка.
        </p>
      </div>
    </div>
  );
}
