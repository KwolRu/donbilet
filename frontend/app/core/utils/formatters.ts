export function formatPhoneRu(value: string): string {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  if (normalized.length !== 11 || !normalized.startsWith("7")) return value;
  const p1 = normalized.slice(1, 4);
  const p2 = normalized.slice(4, 7);
  const p3 = normalized.slice(7, 9);
  const p4 = normalized.slice(9, 11);
  return `+7 ${p1} ${p2}-${p3}-${p4}`;
}

/**
 * Сокращает ФИО до формата «Фамилия И.О.».
 * «Александрова Елизавета Ильинична» → «Александрова Е.И.»
 * «Иванов Иван» → «Иванов И.»
 * «Мадонна» → «Мадонна»
 */
export function formatFullNameShort(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const [surname, ...rest] = parts;
  const initials = rest.map((part) => `${part.charAt(0).toUpperCase()}.`).join("");
  return initials ? `${surname} ${initials}` : surname;
}

export function makeAgeLineWithBirthDate(birthDateRu: string): string {
  const [day, month, year] = birthDateRu.split(".").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return "Не указано";
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return `${age} лет (${birthDateRu})`;
}
