"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { SidePanel } from "@/components/layout-panels/side-panel";
import { RATING_CRITERIA } from "@app/core/mocks/tickets";

/**
 * Оценка поездки по критериям.
 *
 * Оценки живут в панели и уезжают вместе с ней: пока не нажали «Подтвердить»,
 * в списке ничего не меняется. Поле отзыва появляется, только когда выставлена
 * хотя бы одна оценка, — пустая форма в макете его не показывает.
 *
 * «Подтвердить» заблокирована, пока не оценён ни один критерий: это состояние
 * `disabled` из макета, а не запрет ради запрета — отправлять пустой отзыв
 * бессмысленно.
 */

type Scores = Record<string, number>;

export function RateTripPanel({
  open,
  route,
  date,
  initialRating,
  onClose,
  onSubmit,
}: {
  open: boolean;
  route: string;
  date: string;
  /** Уже выставленная оценка: панель открывается с ней по всем критериям. */
  initialRating?: number | null;
  onClose: () => void;
  onSubmit: (rating: number) => void;
}) {
  const [scores, setScores] = useState<Scores>({});
  const [comment, setComment] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  /*
   * Каждое открытие начинается с чистого листа (или с прошлой оценки): панель
   * не размонтируется — её каркас нужен для анимации ухода, — поэтому оценки
   * пришлось бы тащить из предыдущего заказа.
   *
   * Сброс идёт во время рендера, а не в эффекте: эффект отрисовал бы кадр со
   * старыми звёздами и только потом погасил их.
   */
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setScores(
        initialRating
          ? Object.fromEntries(RATING_CRITERIA.map(({ id }) => [id, initialRating]))
          : {},
      );
      setComment("");
    }
  }

  const rated = Object.values(scores).filter((value) => value > 0);
  const average = rated.length
    ? Math.round(rated.reduce((sum, value) => sum + value, 0) / rated.length)
    : 0;

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
            Оцените поездку по критериям
          </h2>
        </div>
      }
      footer={
        <div className="flex gap-3 px-6 pt-0 pb-6">
          <DbButton variant="lianer" size="large" fullWidth onClick={onClose}>
            Отмена
          </DbButton>

          <DbButton
            variant="primary"
            size="large"
            fullWidth
            disabled={average === 0}
            onClick={() => onSubmit(average)}
          >
            Подтвердить
          </DbButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex flex-col gap-1">
          <span className="text-db-item font-medium text-db-text-primary">{route}</span>
          <span className="text-db-body text-db-text-secondary">{date}</span>
        </div>

        {RATING_CRITERIA.map((criterion) => (
          <fieldset
            key={criterion.id}
            className="squircle flex flex-col gap-4 rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle"
          >
            <legend className="text-db-item font-medium text-db-text-primary">
              {criterion.label}
            </legend>

            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = (scores[criterion.id] ?? 0) >= value;

                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${criterion.label}: ${value} из 5`}
                    aria-pressed={active}
                    onClick={() =>
                      setScores((current) => ({ ...current, [criterion.id]: value }))
                    }
                    className="transition-transform duration-300 ease-db hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={
                        "size-6 transition-colors duration-300 ease-db " +
                        (active
                          ? "fill-db-surface-base text-db-surface-base"
                          : "fill-db-surface-muted text-db-text-tertiary")
                      }
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/*
         * Поле отзыва раскрывается по высоте, а не появляется рывком: панель
         * короткая, и подстановка блока в 288px сдвигала бы кнопки скачком.
         */}
        <div className={"db-collapse " + (average > 0 ? "db-collapse-open" : "")}>
          {/*
           * Отзыв — такая же карточка, как критерии: те же поля 16, радиус и
           * обводка. Раньше это было поле ввода с тонкой рамкой, и блок
           * выпадал из ряда.
           */}
          <div className="pt-0">
            <label className="squircle flex h-64 flex-col gap-1 rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle transition-colors duration-300 ease-db focus-within:outline-db-border-hover">
              <span className="text-db-micro text-db-text-secondary">
                Расскажите, что сделало бы поездку ещё лучше
              </span>

              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="db-scrollbar flex-1 resize-none bg-transparent text-db-body leading-5 text-db-text-primary outline-none placeholder:text-db-text-tertiary"
                placeholder="Необязательно"
              />
            </label>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
