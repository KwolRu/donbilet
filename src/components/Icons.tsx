import type { SVGProps } from "react";

// UI-иконки из дизайна — набор lucide (в Figma: lucide/bus, lucide/plane,
// lucide/train-front, lucide/hotel, lucide/map-pin, lucide/arrow-left-right,
// lucide/chevron-down, lucide/calendar, lucide/arrow-left/right/up-right).
export {
  Bus as BusIcon,
  Plane as PlaneIcon,
  TrainFront as TrainIcon,
  Hotel as HotelIcon,
  MapPin as PinIcon,
  Calendar as CalendarIcon,
  ChevronDown as ChevronDownIcon,
  ArrowLeftRight as SwapIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUpRight as ArrowUpRightIcon,
} from "lucide-react";

// Бренд-иконки соцсетей — в lucide отсутствуют, оставляем кастомные SVG.
export function VkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M13.5 17c-5.2 0-8.4-3.6-8.5-9.5h2.7c.1 4.3 2 6.1 3.4 6.5v-6.5h2.6v3.8c1.4-.2 2.9-1.9 3.4-3.8h2.5c-.4 2.3-2.1 4-3.3 4.7 1.2.6 3.1 2.1 3.8 4.8h-2.8c-.6-1.8-2-3.2-3.6-3.3v3.3h-.2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function OkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.5 13.5c1 .9 2.2 1.4 3.5 1.4s2.5-.5 3.5-1.4M11 15.5l-2.5 3M13 15.5l2.5 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M21 4L3 11.5l5.5 1.8m12.5-9.3L17 20l-6-4.5m10-11.5L8.5 13.3m0 0L8 18l2.7-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
