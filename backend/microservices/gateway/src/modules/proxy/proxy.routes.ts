/**
 * Карта маршрутизации gateway: префикс пути → downstream-сервис.
 *
 * ЕДИНСТВЕННОЕ место, где описывается, какой сервис обслуживает какой префикс.
 * Добавили доменный сервис — добавьте сюда запись и переменную окружения с его URL.
 * Бизнес-логике здесь не место: gateway только проксирует (см. ADR-0001 §5).
 *
 * Префикс матчится по первому сегменту пути после `/api`. Для вложенных
 * префиксов (`crm/leads`) указывайте их целиком — матчинг идёт от самого
 * длинного префикса к самому короткому.
 */
export type ProxyTarget = {
  /** Логическое имя сервиса — попадает в логи и в тело 502. */
  name: string;
  /** Базовый URL downstream-сервиса. */
  baseUrl: string;
};

export type ProxyRoute = {
  /** Префикс пути без ведущего слэша, например `projects` или `crm/leads`. */
  prefix: string;
  target: ProxyTarget;
};

const AUTH_SERVICE: ProxyTarget = {
  name: 'AUTH',
  baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:5007',
};

const EXAMPLE_SERVICE: ProxyTarget = {
  name: 'EXAMPLE',
  baseUrl: process.env.EXAMPLE_SERVICE_URL || 'http://localhost:5001',
};

export const PROXY_ROUTES: ProxyRoute[] = [
  { prefix: 'auth', target: AUTH_SERVICE },
  // Эталонный домен. Удаляется вместе с example-service.
  { prefix: 'projects', target: EXAMPLE_SERVICE },
  { prefix: 'tasks', target: EXAMPLE_SERVICE },
];

/** Самый длинный совпавший префикс выигрывает: `crm/leads` важнее `crm`. */
const SORTED_ROUTES = [...PROXY_ROUTES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

export function resolveTarget(path: string): ProxyTarget | undefined {
  const normalized = path.replace(/^\/+/, '').replace(/^api\//, '');

  return SORTED_ROUTES.find(
    (route) => normalized === route.prefix || normalized.startsWith(`${route.prefix}/`),
  )?.target;
}
