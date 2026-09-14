import popular1 from "@assets/images/landing/popular/image.png";
import popular2 from "@assets/images/landing/popular/image copy.png";
import popular3 from "@assets/images/landing/popular/image copy 2.png";
import popular4 from "@assets/images/landing/popular/image copy 3.png";
import benefit1 from "@assets/images/landing/third/image.png";
import benefit2 from "@assets/images/landing/third/image copy.png";
import benefit3 from "@assets/images/landing/third/image copy 2.png";
import benefit4 from "@assets/images/landing/third/image copy 3.png";
import type { StaticImageData } from "next/image";

/**
 * Мок-данные главной страницы.
 *
 * Функции повторяют сигнатуры из `app/core/api/*` — когда появится рабочий
 * стенд API ДонБилет (блокер B1), секции переключаются на реальные вызовы
 * заменой импорта, разметку трогать не придётся.
 *
 * Тексты и цифры взяты из макета. Это витрина, а не реальные данные:
 * перед выкаткой на прод их должен подтвердить заказчик.
 */

// ─── Hero ─────────────────────────────────────────────────────────────────────

export type HeroStat = { value: string; label: string; icon: "trophy" | "star" | "users" | "ticket" };

export const HERO_STATS: HeroStat[] = [
  { value: "18 лет", label: " в путешествиях", icon: "trophy" },
  { value: "4.6", label: " — рейтинг приложения", icon: "star" },
  { value: "40 000+", label: " клиентов", icon: "users" },
  { value: "12 000+", label: " билетов/месяц", icon: "ticket" },
];

export type MockCity = { id: number; name: string; region: string };

/**
 * Города для селектов «Откуда»/«Куда». Форма как у `City` из validators/transport.
 *
 * Подпись региона — полная иерархия «страна, регион[, район]», как в макете и в
 * ответе API DonBilet. Она нужна, чтобы различать одноимённые населённые пункты:
 * Москва есть и в Московской, и в Кировской области.
 */
export const MOCK_CITIES: MockCity[] = [
  { id: 1160663, name: "Ростов-на-Дону", region: "Российская Федерация, Ростовская область" },
  { id: 1084807, name: "Санкт-Петербург", region: "Российская Федерация, Санкт-Петербург" },
  { id: 1212147, name: "Владивосток", region: "Российская Федерация, Приморский край" },
  { id: 1000101, name: "Москва", region: "Российская Федерация, Москва" },
  {
    id: 1000108,
    name: "Москва",
    region: "Российская Федерация, Кировская область, Верхошижемский район",
  },
  {
    id: 1000109,
    name: "Новая Москва",
    region: "Российская Федерация, Приморский край, Шкотовский район",
  },
  { id: 1000102, name: "Таганрог", region: "Российская Федерация, Ростовская область" },
  { id: 1000103, name: "Батайск", region: "Российская Федерация, Ростовская область" },
  {
    id: 1000104,
    name: "Базковская",
    region: "Российская Федерация, Ростовская область, Шолоховский район",
  },
  { id: 1000105, name: "Краснодар", region: "Российская Федерация, Краснодарский край" },
  { id: 1000106, name: "Новосибирск", region: "Российская Федерация, Новосибирская область" },
  { id: 1000107, name: "Сочи", region: "Российская Федерация, Краснодарский край" },
];

// ─── Популярные направления ───────────────────────────────────────────────────

export type MockDirection = {
  id: number;
  departureCityId: number;
  arrivalCityId: number;
  from: string;
  to: string;
  durationLabel: string;
  priceLabel: string;
  image: StaticImageData;
};

/**
 * В макете все четыре карточки — один и тот же повторённый компонент.
 * Здесь маршруты разные: одинаковые данные маскируют ошибки вёрстки
 * (обрезку длинных названий, перенос в две строки) и мешают сверке.
 */
export const MOCK_DIRECTIONS: MockDirection[] = [
  {
    id: 1,
    departureCityId: 1160663,
    arrivalCityId: 1084807,
    from: "Ростов-на-Дону",
    to: "Санкт-Петербург",
    durationLabel: "от 24 ч 10 м в пути",
    priceLabel: "от 6 870 ₽",
    image: popular1,
  },
  {
    id: 2,
    departureCityId: 1160663,
    arrivalCityId: 1000101,
    from: "Ростов-на-Дону",
    to: "Москва",
    durationLabel: "от 15 ч 40 м в пути",
    priceLabel: "от 3 450 ₽",
    image: popular2,
  },
  {
    id: 3,
    departureCityId: 1160663,
    arrivalCityId: 1000105,
    from: "Ростов-на-Дону",
    to: "Краснодар",
    durationLabel: "от 5 ч 35 м в пути",
    priceLabel: "от 1 290 ₽",
    image: popular3,
  },
  {
    id: 4,
    departureCityId: 1000102,
    arrivalCityId: 1000107,
    from: "Таганрог",
    to: "Сочи",
    durationLabel: "от 11 ч 20 м в пути",
    priceLabel: "от 2 780 ₽",
    image: popular4,
  },
];

// ─── Преимущества ─────────────────────────────────────────────────────────────

export type MockBenefit = { id: number; title: string; text: string; image: StaticImageData };

export const MOCK_BENEFITS: MockBenefit[] = [
  {
    id: 1,
    title: "Всё для поездки в одном месте",
    text: "Автобусы, поезда, авиабилеты и отели — ищите и бронируйте в одном сервисе",
    image: benefit1,
  },
  {
    id: 2,
    title: "18 лет в путешествиях",
    text: "Помогаем людям планировать поездки и покупать билеты уже более 18 лет",
    image: benefit2,
  },
  {
    id: 3,
    title: "Билеты по всему миру",
    text: "Маршруты по России, странам СНГ и популярным направлениям за рубежом",
    image: benefit3,
  },
  {
    id: 4,
    title: "Реальная поддержка",
    text: "Оперативно отвечаем на вопросы и помогаем на каждом этапе поездки",
    image: benefit4,
  },
];

/*
 * Новости и справочная переехали в собственные моки: их данные нужны не
 * только главной, но и страницам `/news` и `/faq`.
 *
 *   `mocks/news.ts` — архив статей и три свежие для секции;
 *   `mocks/faq.ts`  — вопросы по категориям и выборка для секции.
 */
