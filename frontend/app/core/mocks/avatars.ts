import type { StaticImageData } from "next/image";

import avatar01 from "@assets/images/account/avatars/avatar-01.png";
import avatar02 from "@assets/images/account/avatars/avatar-02.png";
import avatar03 from "@assets/images/account/avatars/avatar-03.png";
import avatar04 from "@assets/images/account/avatars/avatar-04.png";
import avatar05 from "@assets/images/account/avatars/avatar-05.png";
import avatar06 from "@assets/images/account/avatars/avatar-06.png";
import avatar07 from "@assets/images/account/avatars/avatar-07.png";
import avatar08 from "@assets/images/account/avatars/avatar-08.png";
import avatar09 from "@assets/images/account/avatars/avatar-09.png";
import avatar10 from "@assets/images/account/avatars/avatar-10.png";
import avatar11 from "@assets/images/account/avatars/avatar-11.png";
import avatar12 from "@assets/images/account/avatars/avatar-12.png";
import avatar13 from "@assets/images/account/avatars/avatar-13.png";
import avatar14 from "@assets/images/account/avatars/avatar-14.png";
import avatar15 from "@assets/images/account/avatars/avatar-15.png";
import avatar16 from "@assets/images/account/avatars/avatar-16.png";
import avatar17 from "@assets/images/account/avatars/avatar-17.png";
import avatar18 from "@assets/images/account/avatars/avatar-18.png";
import avatar19 from "@assets/images/account/avatars/avatar-19.png";
import avatar20 from "@assets/images/account/avatars/avatar-20.png";

/**
 * Аватарки из макета — компонент `avatar`, 20 вариантов.
 *
 * Выгружены из Figma и ужаты до 256×256: в интерфейсе они показываются
 * кружком 40–96px, а исходники весили по 2 МБ.
 *
 * Пока аватар выбирает не пользователь, а мок: витрине нужны разные лица,
 * иначе список пассажиров выглядит как один человек в десяти документах.
 * С появлением API (Ф5) набор останется — из него пользователь и выбирает.
 */
export const MOCK_AVATARS: StaticImageData[] = [
  avatar01,
  avatar02,
  avatar03,
  avatar04,
  avatar05,
  avatar06,
  avatar07,
  avatar08,
  avatar09,
  avatar10,
  avatar11,
  avatar12,
  avatar13,
  avatar14,
  avatar15,
  avatar16,
  avatar17,
  avatar18,
  avatar19,
  avatar20,
];

/**
 * Аватар по номеру записи. Детерминированно: один и тот же пассажир не
 * должен менять лицо между перерисовками.
 */
export function avatarFor(index: number): StaticImageData {
  return MOCK_AVATARS[Math.abs(index) % MOCK_AVATARS.length];
}
