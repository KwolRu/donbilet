"use client";

import Image from "next/image";

import {
  DOCUMENT_TYPES,
  documentLabel,
  formatBirthDate,
  shortName,
  type Passenger,
} from "@app/core/mocks/passengers";

/**
 * Карточка пассажира в списке кабинета.
 *
 * По макету: обложка 124px, круглый аватар 128 в белой оправе 8px свисает с
 * обложки, ниже фамилия с инициалами, дата рождения и чипы документов.
 *
 * Чипы показывают все четыре типа документов, а не только заполненные:
 * серый — документ добавлен, пустой с рамкой — нет. Так с одного взгляда
 * видно, чего не хватает для покупки билета, — ради этого блок и нужен.
 */
export function PassengerCard({
  passenger,
  onClick,
}: {
  passenger: Passenger;
  onClick: () => void;
}) {
  const filled = new Set(passenger.documents.map((document) => document.type));

  return (
    <button
      type="button"
      onClick={onClick}
      className="squircle group flex w-full flex-col items-start gap-1 overflow-hidden rounded-db-xl bg-db-surface-default p-2 text-left outline outline-1 -outline-offset-1 outline-db-border-subtle transition-[box-shadow,outline-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:outline-db-border-default"
    >
      <div className="relative h-48 w-full">
        <div className="squircle h-32 w-full overflow-hidden rounded-db-md">
          <Image
            src={passenger.cover}
            alt=""
            aria-hidden
            className="h-32 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="352px"
            loading="eager"
          />
        </div>

        {/* Оправа рисуется `outline` внутрь: рамка не увеличивает круг. */}
        <div className="absolute top-[59px] left-4 size-32 overflow-hidden rounded-full outline outline-8 -outline-offset-8 outline-db-surface-default">
          <Image
            src={passenger.avatar}
            alt=""
            aria-hidden
            width={128}
            height={128}
            className="size-32 object-cover"
            loading="eager"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[20px] leading-7 font-medium text-db-text-primary">
            {shortName(passenger)}
          </span>
          <span className="text-[18px] leading-6 font-medium text-db-text-secondary">
            {formatBirthDate(passenger.birthDate)}
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          {DOCUMENT_TYPES.map((document) => {
            const present = filled.has(document.value);

            return (
              <span
                key={document.value}
                className={
                  "squircle rounded-db-sm p-3 text-db-caption transition-colors duration-300 ease-out " +
                  (present
                    ? "bg-db-surface-muted text-db-text-primary"
                    : "text-db-text-tertiary outline outline-1 -outline-offset-1 outline-db-border-default")
                }
              >
                {documentLabel(document.value)}
              </span>
            );
          })}
        </div>
      </div>
    </button>
  );
}
