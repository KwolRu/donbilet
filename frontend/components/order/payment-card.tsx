"use client";

import { Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";

import { DbButton } from "@/components/ui/db-button";
import { DbCheckbox } from "@/components/ui/db-checkbox";
import { DbField } from "@/components/ui/db-field";
import { DbDateField } from "@/components/ui/db-form-fields";
import { RadioGroup, RadioItem } from "@/components/ui/radio";

type PaymentMethod = "sbp" | "domestic-card" | "digital-ruble" | "foreign-card";

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "sbp", label: "СБП" },
  { value: "domestic-card", label: "Карта банка РФ" },
  { value: "digital-ruble", label: "Цифровой рубль" },
  { value: "foreign-card", label: "Карта иностранного банка" },
];

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function PaymentCard() {
  const [method, setMethod] = useState<PaymentMethod>("domestic-card");
  const [cardNumber, setCardNumber] = useState("6534 5884 5463 5644");
  const [expiresAt, setExpiresAt] = useState<Date | null>(new Date("2030-09-15T00:00:00"));
  const [cvv, setCvv] = useState("123");
  const [cvvVisible, setCvvVisible] = useState(false);
  const [rememberCard, setRememberCard] = useState(false);
  const [promoCode, setPromoCode] = useState("OSEN10");
  const [appliedPromo, setAppliedPromo] = useState("OSEN10");
  const cardMethod = method === "domestic-card" || method === "foreign-card";

  return (
    <section
      data-order-payment
      className="squircle flex w-[755px] shrink-0 flex-col gap-4 rounded-db-xl bg-db-surface-default p-6"
    >
      <h2 className="text-db-subsection font-medium text-db-text-primary">Оплата</h2>

      <section className="squircle flex w-full flex-col gap-4 rounded-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <h3 className="text-[20px] leading-7 font-medium text-db-text-primary">Способ оплаты</h3>

        <RadioGroup
          value={method}
          onChange={(next) => setMethod(next as PaymentMethod)}
          ariaLabel="Способ оплаты"
          className="flex w-full flex-col gap-3"
        >
          {PAYMENT_METHODS.map((item) => (
            <RadioItem
              key={item.value}
              value={item.value}
              size="large"
              filled
              className="w-full text-db-body leading-5 text-db-text-primary"
            >
              <span className="flex-1">{item.label}</span>
            </RadioItem>
          ))}
        </RadioGroup>

        {cardMethod ? (
          <div data-order-card-fields className="flex w-full flex-col gap-3">
            <DbField
              label="Номер карты"
              value={cardNumber}
              inputMode="numeric"
              autoComplete="cc-number"
              onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
            />

            <div className="grid w-full grid-cols-3 items-center gap-3">
              <DbDateField
                label="Срок действия"
                value={expiresAt}
                min={new Date()}
                onChange={setExpiresAt}
              />

              <DbField
                label="CVV"
                value={cvv}
                type={cvvVisible ? "text" : "password"}
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={3}
                onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 3))}
                rightIcon={
                  <button
                    type="button"
                    aria-label={cvvVisible ? "Скрыть CVV" : "Показать CVV"}
                    onClick={() => setCvvVisible((current) => !current)}
                    className="flex size-4 items-center justify-center text-db-text-primary"
                  >
                    {cvvVisible ? (
                      <EyeOff className="size-4" strokeWidth={1.5} aria-hidden />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.5} aria-hidden />
                    )}
                  </button>
                }
              />

              <div className="flex items-center">
                <DbCheckbox checked={rememberCard} onChange={setRememberCard}>
                  Запомнить карту
                </DbCheckbox>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="squircle flex w-full flex-col gap-4 rounded-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <h3 className="text-[20px] leading-7 font-medium text-db-text-primary">Есть промокод?</h3>

        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-center gap-3">
            <DbField
              label="Промокод"
              value={promoCode}
              autoComplete="off"
              onChange={(event) => {
                setPromoCode(event.target.value.toUpperCase());
                if (event.target.value.toUpperCase() !== appliedPromo) setAppliedPromo("");
              }}
              rightIcon={
                promoCode ? (
                  <button
                    type="button"
                    aria-label="Очистить промокод"
                    onClick={() => {
                      setPromoCode("");
                      setAppliedPromo("");
                    }}
                    className="flex size-4 items-center justify-center text-db-text-primary"
                  >
                    <X className="size-4" strokeWidth={1.5} aria-hidden />
                  </button>
                ) : undefined
              }
            />

            <DbButton
              type="button"
              size="small"
              className="h-12 w-40 shrink-0 !rounded-db-sm"
              disabled={!promoCode.trim()}
              onClick={() => setAppliedPromo(promoCode.trim())}
            >
              Применить
            </DbButton>
          </div>

          {appliedPromo ? (
            <div
              role="status"
              className="squircle flex w-full items-center justify-center rounded-db-sm bg-db-session-current p-3 text-center text-db-caption leading-5 text-text-success"
            >
              Скидка 10% по промокоду применена
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
