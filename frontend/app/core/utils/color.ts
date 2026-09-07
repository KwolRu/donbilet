/** Работа с цветом для пикеров и бейджей: hex ⇄ rgba ⇄ css-строка. */
export type Rgba = { r: number; g: number; b: number; a: number };

const FALLBACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

function clampChannel(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function hexToRgba(hex: string): Rgba {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3 || normalized.length === 4
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized;

  if (expanded.length !== 6 && expanded.length !== 8) return FALLBACK;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1;

  return { r: clampChannel(r), g: clampChannel(g), b: clampChannel(b), a: clampAlpha(a) };
}

export function rgbaToHex({ r, g, b }: Rgba): string {
  const toHex = (value: number) => clampChannel(value).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbaToCssColor({ r, g, b, a }: Rgba): string {
  const alpha = clampAlpha(a);
  if (alpha >= 1) return rgbaToHex({ r, g, b, a: 1 });
  return `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${Number(alpha.toFixed(3))})`;
}

/** Разбирает и `#rrggbb`, и `rgb()/rgba()`. Мусор превращается в чёрный. */
export function colorToRgba(color: string): Rgba {
  const value = color?.trim();
  if (!value) return FALLBACK;

  if (value.startsWith("#")) return hexToRgba(value);

  const match = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return FALLBACK;

  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3) return FALLBACK;

  return {
    r: clampChannel(parts[0]),
    g: clampChannel(parts[1]),
    b: clampChannel(parts[2]),
    a: parts.length > 3 ? clampAlpha(parts[3]) : 1,
  };
}
