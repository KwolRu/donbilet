/** Форматирование денежных сумм. На backend всё в копейках (Int). */

/** 199900 → "1 999 ₽" (без копеек, если они нулевые — иначе с копейками). */
export function formatKopecks(kopecks: number): string {
  const rubles = kopecks / 100
  const hasFraction = kopecks % 100 !== 0
  return `${rubles.toLocaleString("ru-RU", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })} ₽`
}

/** Рубли (число/строка) → копейки. "1999" | 1999 → 199900. */
export function rublesToKopecks(rubles: number | string): number {
  const value = typeof rubles === "string" ? Number.parseFloat(rubles.replace(/\s/g, "")) : rubles
  return Math.round((Number.isFinite(value) ? value : 0) * 100)
}

/** Копейки → рубли (число). */
export function kopecksToRubles(kopecks: number): number {
  return kopecks / 100
}
