import { z } from "zod";

/**
 * Схемы контентного домена: новости, баннеры, популярные направления, плитки.
 *
 * Контракт gateway. На фазе Ф3 отдаётся `legacy-adapter` поверх `/main/getnews`,
 * `/main/getbanners`, `/main/popularcities`, `/main/gettiles`; на фазе Ф6 —
 * `content-service`. Форма ответа одинакова в обоих случаях.
 *
 * Изображения приходят абсолютными URL. Legacy отдавал ссылки вида
 * `/main/getimage?apikey=…&apitoken=…&imageid=` с боевым токеном в строке
 * запроса (docs/07, S2) — так делать нельзя.
 */

/** Направление для блока «Популярные направления» на главной. */
export const popularDirectionSchema = z.object({
  departureCityId: z.number().int().positive(),
  departureCityName: z.string(),
  arrivalCityId: z.number().int().positive(),
  arrivalCityName: z.string(),
  /** Минимальная цена по направлению, копейки. `null` — если рейсов нет. */
  fromPriceMinor: z.number().int().nonnegative().nullable(),
  imageUrl: z.string().nullish(),
  /** SEO-slug страницы направления: `/raspisanie/{slug}`. */
  slug: z.string().nullish(),
});

export type PopularDirection = z.infer<typeof popularDirectionSchema>;

/**
 * Плитка направления с ценой на конкретную дату.
 * Legacy: `/main/gettiles?departure=&date=`.
 */
export const directionTileSchema = z.object({
  arrivalCityId: z.number().int().positive(),
  arrivalCityName: z.string(),
  date: z.iso.date(),
  fromPriceMinor: z.number().int().nonnegative().nullable(),
  imageUrl: z.string().nullish(),
});

export type DirectionTile = z.infer<typeof directionTileSchema>;

/** Новость. Публичный список и карточка. */
export const newsItemSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string(),
  title: z.string(),
  /** Анонс для списка. Полный текст приходит только в карточке. */
  excerpt: z.string().nullish(),
  /** HTML из редактора TipTap. Только в карточке. */
  contentHtml: z.string().nullish(),
  imageUrl: z.string().nullish(),
  publishedAt: z.iso.datetime({ offset: true }),
});

export type NewsItem = z.infer<typeof newsItemSchema>;

/** Постраничный список — ТЗ п. 2.12 требует пагинацию. */
export const newsPageSchema = z.object({
  items: z.array(newsItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type NewsPage = z.infer<typeof newsPageSchema>;

/** Баннер слайдера на главной. */
export const bannerSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().nullish(),
  subtitle: z.string().nullish(),
  imageUrl: z.string(),
  /** Мобильная версия картинки; если пусто — используется `imageUrl`. */
  mobileImageUrl: z.string().nullish(),
  targetUrl: z.string().nullish(),
});

export type Banner = z.infer<typeof bannerSchema>;

/**
 * Вопрос справочной. ТЗ п. 2.13: группировка по категориям,
 * порядок отображения задаётся оператором в CRM.
 */
export const faqItemSchema = z.object({
  id: z.number().int().positive(),
  question: z.string(),
  answerHtml: z.string(),
  sortOrder: z.number().int(),
});

export const faqCategorySchema = z.object({
  id: z.number().int().positive(),
  slug: z.string(),
  title: z.string(),
  sortOrder: z.number().int(),
  items: z.array(faqItemSchema),
});

export type FaqCategory = z.infer<typeof faqCategorySchema>;
