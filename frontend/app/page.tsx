/**
 * Стартовая страница шаблона. Заменяется лендингом или редиректом на /login.
 *
 * Структура маршрутов задумана так:
 *   app/page.tsx          — публичная главная (эта страница)
 *   app/(auth)/login      — вход; список публичных путей в lib/routing/auth-paths.ts
 *   app/(app)/app/...     — защищённая зона, гейт в proxy.ts
 *
 * Group-сегменты `()` не влияют на URL — они разделяют layout-зоны.
 */
export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-[640px] flex-col gap-4 text-center">
        <h1 className="text-h1 text-text-primary">DonBilet</h1>
        <p className="text-body-regular text-text-secondary">
          Шаблон развёрнут. Дальше: <code>npm run init:project</code> в корне репозитория,
          затем поднимите стек по README и начните первую фичу через скилл{" "}
          <code>/feature-pattern</code>.
        </p>
      </div>
    </main>
  );
}
