import { z } from "zod";

import { publicApiClient } from "./client";
import {
  bannerSchema,
  directionTileSchema,
  faqCategorySchema,
  newsItemSchema,
  newsPageSchema,
  popularDirectionSchema,
  type Banner,
  type DirectionTile,
  type FaqCategory,
  type NewsItem,
  type NewsPage,
  type PopularDirection,
} from "../validators/content";

/**
 * Контентный домен: популярные направления, плитки, новости, баннеры, FAQ.
 *
 * Всё анонимно и кэшируемо. Эти функции вызываются преимущественно из серверных
 * компонентов при SSR публичных страниц — стор для них не заводится: zustand-стор
 * на сервере это синглтон процесса, то есть утечка состояния между запросами.
 * Правило `page → store → api` действует для интерактивного клиентского состояния;
 * SSR-контент читается напрямую из api.
 */

const popularDirectionsSchema = z.array(popularDirectionSchema);
const directionTilesSchema = z.array(directionTileSchema);
const bannersSchema = z.array(bannerSchema);
const faqSchema = z.array(faqCategorySchema);

/** Популярные направления главной. Legacy: `GET /main/popularcities`. */
export async function fetchPopularDirections(): Promise<PopularDirection[]> {
  const res = await publicApiClient.get("/content/popular-directions");
  return popularDirectionsSchema.parse(res.data);
}

/**
 * Плитки направлений с ценами на дату. Legacy: `GET /main/gettiles?departure=&date=`.
 * Без `date` бэкенд подставляет ближайшую дату с рейсами.
 */
export async function fetchDirectionTiles(
  departureCityId: number,
  date?: string,
): Promise<DirectionTile[]> {
  const res = await publicApiClient.get("/content/direction-tiles", {
    params: { departureCityId, date },
  });
  return directionTilesSchema.parse(res.data);
}

/** Баннеры слайдера. Legacy: `GET /main/getbanners`. */
export async function fetchBanners(): Promise<Banner[]> {
  const res = await publicApiClient.get("/content/banners");
  return bannersSchema.parse(res.data);
}

/**
 * Постраничный список новостей. ТЗ п. 2.12 требует пагинацию —
 * в legacy её не было, `GET /main/getnews` отдавал всё разом.
 */
export async function fetchNews(page = 1, pageSize = 12): Promise<NewsPage> {
  const res = await publicApiClient.get("/content/news", { params: { page, pageSize } });
  return newsPageSchema.parse(res.data);
}

/** Карточка новости по slug. Отдаёт `contentHtml`, в отличие от списка. */
export async function fetchNewsItem(slug: string): Promise<NewsItem> {
  const res = await publicApiClient.get(`/content/news/${slug}`);
  return newsItemSchema.parse(res.data);
}

/** Справочная, сгруппированная по категориям. Legacy: `GET /main/getfaq?section=`. */
export async function fetchFaq(): Promise<FaqCategory[]> {
  const res = await publicApiClient.get("/content/faq");
  return faqSchema.parse(res.data);
}
