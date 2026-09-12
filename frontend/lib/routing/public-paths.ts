/**
 * Карта публичных маршрутов donbilet.ru.
 *
 * Единственный источник правды о структуре публичного сайта. Используется
 * `proxy.ts` (что открыто без сессии), `sitemap.ts` и картой редиректов.
 *
 * ВАЖНО про URL. Пути намеренно совпадают с legacy: сайт живёт в поиске много
 * лет, и смена адресов — прямая потеря трафика (риск P2 в roadmap). Любое
 * изменение пути требует записи в `LEGACY_REDIRECTS` и согласования.
 *
 * Полная карта старых URL восстанавливается из логов веб-сервера — блокер B5
 * в `audit/CURRENT.md`. До его снятия список ниже собран по
 * `app-routing.module.ts` legacy-фронта (docs/04 §4.3) и может быть неполон.
 */

/** Статические публичные маршруты. */
export const PUBLIC_ROUTES = {
  home: "/",
  search: "/races",
  schedules: "/raspisanie",
  news: "/news",
  faq: "/faq",
  about: "/about-us",
  contacts: "/contacts",
  feedback: "/feedback",
  b2b: "/b2b",
  partners: "/partner-form",
  hotels: "/hotels",
  rail: "/poezda",
  avia: "/avia",
  publicOffer: "/public-offer",
  privacyPolicy: "/privacy-policy",
  personalDataConsent: "/personal-data-consent",
  support: "/support",
  insurance: "/insurance",
} as const;

/** Динамические маршруты. */
export const publicRoute = {
  /** SEO-страница направления: `/raspisanie/rostov-moskva`. */
  direction: (slug: string) => `/raspisanie/${slug}`,
  newsItem: (slug: string) => `/news/${slug}`,
} as const;

/**
 * Маршруты воронки покупки. Публичны — купить билет можно без регистрации
 * (ТЗ п. 2.10: «Оформление покупки билета не требует подтверждения email»).
 */
export const CHECKOUT_ROUTES = {
  booking: "/booking",
  seatSelection: "/seat",
  passengerInfo: "/personal-information",
  reservation: "/ticket-reservation",
  reservationConfirm: "/reservation-confirm",
  result: "/result",
  thankYou: "/thank",
} as const;

/**
 * Экраны входа. Открыты без сессии — список для `proxy.ts` живёт отдельно,
 * в `auth-paths.ts`; здесь только адреса для ссылок.
 */
export const AUTH_ROUTES = {
  login: "/login",
} as const;

/** Личный кабинет — требует сессии покупателя. */
export const ACCOUNT_ROUTES = {
  root: "/profile",
  tickets: "/profile/tickets",
  history: "/profile/history",
  messages: "/profile/messages",
  favorites: "/profile/favorites",
  passengers: "/profile/passengers",
  settings: "/profile/settings",
} as const;

const PUBLIC_PREFIXES = [
  ...Object.values(PUBLIC_ROUTES),
  ...Object.values(CHECKOUT_ROUTES),
] as readonly string[];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Доступен ли путь без сессии. */
export function isPublicSitePath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => p !== "/" && matchesPrefix(pathname, p));
}

/** Требует ли путь сессии покупателя. */
export function isAccountPath(pathname: string): boolean {
  return matchesPrefix(pathname, ACCOUNT_ROUTES.root);
}

/**
 * Каркас, в котором живёт путь: `site` — шапка с футером публичного сайта,
 * `account` — белая шапка с боковым меню кабинета и входа.
 *
 * Нужен, чтобы отличить смену страницы от смены всего шаблона: первая
 * проходит мягким `PageTransition`, вторая показывает экран загрузки.
 * Соответствует group-сегментам `app/(public)` и `app/(auth)`.
 */
export function routeShell(pathname: string): "site" | "account" {
  if (isAccountPath(pathname)) return "account";
  if (matchesPrefix(pathname, AUTH_ROUTES.login)) return "account";
  return "site";
}

/**
 * Редиректы со старых URL. Заполняется в Ф3 после получения логов веб-сервера.
 * Каждая запись — 301, иначе поисковик считает страницу новой и теряет её вес.
 */
export const LEGACY_REDIRECTS: ReadonlyArray<{ source: string; destination: string }> = [
  // Legacy-лендинги направлений жили отдельными путями вместо общего /raspisanie/:slug.
  { source: "/rostov_moskva", destination: "/raspisanie/rostov-moskva" },
  { source: "/krim", destination: "/raspisanie/krym" },
];
