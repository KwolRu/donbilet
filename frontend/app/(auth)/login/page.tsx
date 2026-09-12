import type { Metadata } from "next";

import { LoginCard } from "@/components/auth/login-card";

export const metadata: Metadata = {
  title: "Вход — ДонБилет",
  description: "Войдите в профиль ДонБилет, чтобы видеть свои билеты и данные пассажиров.",
  robots: { index: false, follow: false },
};

/**
 * Вход в личный кабинет.
 *
 * Регистрации отдельной страницей нет: новый профиль создаётся тем же кодом,
 * просто после него добавляется шаг с согласиями — так в макете `authorization`.
 */
export default function LoginPage() {
  /*
   * Белая подложка на всю рабочую область, форма — по её центру. Заголовка
   * над подложкой здесь нет (в отличие от остальных страниц кабинета), поэтому
   * карточку рисует сама страница: в макете экран входа — это белое поле с
   * единственным блоком формы посередине.
   *
   * Отступ 32px от шапки и меню даёт `p-8` рабочей области в layout.
   */
  return (
    <div className="squircle flex flex-1 items-center justify-center rounded-db-xl bg-db-surface-default">
      <LoginCard />
    </div>
  );
}
