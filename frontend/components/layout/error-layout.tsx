import { Logo } from "./logo";

/**
 * Layout страниц ошибок (404, 500, сбой рендера).
 *
 * Намеренно отдельный от `(public)/layout.tsx`: на странице ошибки шапка с
 * навигацией и большой футер только мешают — пользователю нужен один выход.
 * Здесь только логотип-ссылка на главную, сообщение по центру и копирайт.
 *
 * Второе основание для отдельного шелла — `app/global-error.tsx`: он заменяет
 * собой root layout и рендерит собственные `<html>/<body>`, поэтому не может
 * опереться ни на один layout приложения. Этот компонент не тянет провайдеры,
 * store и модалки, поэтому одинаково работает и там, и в обычном `not-found`.
 */
export function ErrorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-db-surface-muted">
      <header className="flex items-center px-8 py-4">
        <Logo variant="dark" />
      </header>

      <main className="flex flex-1 items-center justify-center px-8 py-10">{children}</main>

      <footer className="px-8 py-6 text-center text-db-caption text-db-text-secondary">
        © 2018–2026 ДонБилет. Все права защищены.
      </footer>
    </div>
  );
}
