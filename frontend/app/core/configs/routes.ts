/**
 * Человекочитаемые названия маршрутов.
 *
 * Один источник правды для хлебных крошек, заголовков страниц ошибок и любых
 * мест, где путь показывается пользователю. Добавили раздел — добавьте строку
 * сюда, иначе крошка просто не отрисуется.
 */
export const ROUTE_LABELS: Record<string, string> = {
  "/app": "Главная",
  "/app/projects": "Проекты",
  "/app/tasks": "Задачи",
  "/app/settings": "Настройки",
};

/** Подпись маршрута для текстов вида «на странице «...» возникла ошибка». */
export function getRouteLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];

  // Для вложенного пути поднимаемся до ближайшего известного предка.
  const segments = pathname.split("/").filter(Boolean);
  for (let i = segments.length - 1; i > 0; i--) {
    const parent = "/" + segments.slice(0, i).join("/");
    if (ROUTE_LABELS[parent]) return ROUTE_LABELS[parent];
  }

  return "этой странице";
}
