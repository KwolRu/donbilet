/**
 * Русские склонения числительных: «1 задача / 2 задачи / 5 задач».
 *
 * Часть опционального RU-слоя шаблона (см. README, раздел «Русская локаль»).
 * Не нужен — удалите вместе с `core/data/russian-*` и `validators/phone.ts`.
 */
const russianPluralRules = new Intl.PluralRules("ru-RU");

export function selectRussianPlural(
  count: number,
  forms: { one: string; few: string; many: string },
): string {
  const category = russianPluralRules.select(Math.abs(count));

  if (category === "one") return forms.one;
  if (category === "few") return forms.few;
  return forms.many;
}

/** Пример использования: подпись количества в списках и тулбарах. */
export function formatTaskCount(count: number): string {
  const noun = selectRussianPlural(count, {
    one: "задача",
    few: "задачи",
    many: "задач",
  });

  return `${count} ${noun}`;
}
