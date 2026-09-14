import Image from "next/image";
import { Bus, Plane, TrainFront } from "lucide-react";

import busArt from "@assets/images/landing/Hero/Bus.png";
import trainArt from "@assets/images/account/tickets/train.png";
import type { TransportKind } from "@app/core/mocks/tickets";

/**
 * Иллюстрация транспорта в углу карточки билета — 148×85 по макету.
 *
 * Автобус берётся из ассетов hero, поезд выгружен отдельно. Самолёта в
 * макете пока нет — вместо него иконка на сером поле того же размера.
 * Подменять его чужой картинкой нельзя: вид транспорта здесь несёт смысл,
 * а не украшает.
 */

const ART: Partial<Record<TransportKind, typeof busArt>> = {
  bus: busArt,
  train: trainArt,
};

const FALLBACK_ICON: Record<TransportKind, typeof Bus> = {
  bus: Bus,
  train: TrainFront,
  plane: Plane,
};

const LABEL: Record<TransportKind, string> = {
  bus: "Автобус",
  train: "Поезд",
  plane: "Самолёт",
};

export function TransportArt({ transport }: { transport: TransportKind }) {
  const art = ART[transport];

  if (art) {
    return (
      <Image
        src={art}
        alt={LABEL[transport]}
        width={148}
        height={85}
        className="h-[85px] w-[148px] object-contain"
      />
    );
  }

  const Icon = FALLBACK_ICON[transport];

  return (
    <div
      className="squircle flex h-[85px] w-[148px] items-center justify-center rounded-db-sm bg-db-surface-muted"
      role="img"
      aria-label={LABEL[transport]}
    >
      <Icon className="size-10 text-db-text-tertiary" strokeWidth={1.5} aria-hidden />
    </div>
  );
}

/** Тот же вид транспорта, но значком 40×40 — для строки завершённой поездки. */
export function TransportBadge({ transport }: { transport: TransportKind }) {
  const Icon = FALLBACK_ICON[transport];

  return (
    <span
      className="squircle flex size-10 shrink-0 items-center justify-center rounded-db-sm bg-db-surface-default outline outline-1 -outline-offset-1 outline-db-border-subtle"
      role="img"
      aria-label={LABEL[transport]}
    >
      <Icon className="size-5 text-db-text-primary" strokeWidth={1.5} aria-hidden />
    </span>
  );
}
