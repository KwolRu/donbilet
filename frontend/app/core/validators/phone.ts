import { z } from "zod";

export const RUSSIAN_PHONE_ERROR = "Введите телефон в формате +7 (999) 123-45-67";

function nationalDigits(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (/^\s*\+7/.test(value)) return digits.slice(1, 11);
  if ((digits.startsWith("7") || digits.startsWith("8")) && digits.length > 0) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
}

/**
 * Converts a complete Russian phone to the canonical value used by the API.
 * Returns null for empty, partial, foreign, or alphabetic input.
 */
export function normalizeRussianPhone(value: string): string | null {
  if (/[A-Za-zА-Яа-яЁё]/.test(value)) return null;

  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length !== 11 || (digits[0] !== "7" && digits[0] !== "8")) return null;
  return `+7${digits.slice(1)}`;
}

/** Canonical progressive value emitted by PhoneInput while the user types. */
export function toRussianPhoneInputValue(value: string): string {
  const digits = nationalDigits(value);
  if (digits.length === 0) {
    return /[78]/.test(value) ? "+7" : "";
  }
  return `+7${digits}`;
}

/** Progressive visual mask for canonical, pasted, and partially typed values. */
export function formatRussianPhone(value: string): string {
  if (!value.trim()) return "";

  const digits = nationalDigits(value);
  let formatted = "+7";
  if (!digits) return formatted;

  formatted += ` (${digits.slice(0, 3)}`;
  if (digits.length >= 3) formatted += ")";
  if (digits.length > 3) formatted += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) formatted += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) formatted += `-${digits.slice(8, 10)}`;
  return formatted;
}

const requiredRussianPhoneSchema = z
  .string()
  .trim()
  .transform((value) => normalizeRussianPhone(value) ?? value)
  .pipe(z.string().regex(/^\+7\d{10}$/, RUSSIAN_PHONE_ERROR));

export const russianPhoneSchema = requiredRussianPhoneSchema;

export const optionalRussianPhoneSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? "")
  .transform((value) => (value === "" ? "" : (normalizeRussianPhone(value) ?? value)))
  .pipe(z.union([z.literal(""), z.string().regex(/^\+7\d{10}$/, RUSSIAN_PHONE_ERROR)]));

