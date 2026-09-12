import Image from "next/image";

import dzenIcon from "@assets/svg/social/dzen.svg";
import maxIcon from "@assets/svg/social/max.svg";
import vkIcon from "@assets/svg/social/vk.svg";

/**
 * Иконки соцсетей в футере: MAX, ВКонтакте, Дзен.
 *
 * Выгружены из Figma как есть — плашка 32×32 и глиф входят в один SVG, свои
 * цвета уже внутри. Поэтому обёртка не красит их и не задаёт фон: любая
 * перерисовка здесь разойдётся с макетом.
 *
 * Telegram в актуальном макете футера нет — в списке ровно эти три.
 */

export const SOCIAL_ICONS = [
  { label: "MAX", src: maxIcon },
  { label: "ВКонтакте", src: vkIcon },
  { label: "Дзен", src: dzenIcon },
] as const;

export function SocialIcon({ src, label }: { src: typeof maxIcon; label: string }) {
  return <Image src={src} alt={label} width={32} height={32} className="size-8" />;
}
