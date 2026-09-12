import Image from "next/image";
import Link from "next/link";

import logoDark from "@assets/images/landing/Logo.png";
import logoLight from "@assets/images/landing/Logo-white.png";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

/**
 * Логотип ДонБилет.
 *
 * Два варианта из макета:
 *   dark  — тёмная надпись, для светлой шапки;
 *   light — белая надпись, для тёмного футера.
 *
 * Жёлтый шеврон и фигурка внутри него в обоих вариантах одинаковые — меняется
 * только цвет слова «ДонБилет». Светлый вариант получен из `Logo.png`
 * перекраской пикселей правее шеврона; если дизайнер пришлёт исходный
 * `Logo-white`, замените файл — компонент менять не придётся.
 *
 * Размер в макете — 143×40.
 */

type LogoProps = {
  variant?: "dark" | "light";
  /** Обернуть в ссылку на главную. На самой главной обычно не нужно. */
  asLink?: boolean;
  /** Ширина в px; высота считается по пропорции макета. */
  width?: number;
  className?: string;
};

const WIDTH = 143;
const HEIGHT = 40;

export function Logo({ variant = "dark", asLink = true, width = WIDTH, className }: LogoProps) {
  // Высота выводится из ширины: инлайновый style иначе перебьёт любые классы размера.
  const height = Math.round((width * HEIGHT) / WIDTH);

  const image = (
    <Image
      src={variant === "light" ? logoLight : logoDark}
      alt="ДонБилет"
      width={width}
      height={height}
      priority
      className={className}
      style={{ width, height }}
    />
  );

  if (!asLink) return image;

  return (
    <Link href={PUBLIC_ROUTES.home} aria-label="ДонБилет — на главную">
      {image}
    </Link>
  );
}
