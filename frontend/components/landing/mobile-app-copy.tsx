import { CopyAppLink } from "./copy-app-link";

/**
 * Текстовый блок «Установите приложение».
 *
 * Один и тот же текст показывается в секции главной и в модальном окне
 * «Скачать приложение» из шапки — поэтому он вынесен сюда, а не продублирован.
 * Различается только обрамление: раскладка, размеры иллюстрации и положение QR.
 */
export function MobileAppCopy() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-db-section font-medium text-db-text-primary">
        Установите приложение
        <br />с информацией о ваших билетах
      </h2>

      <span className="inline-flex w-fit items-center justify-center rounded-full bg-db-surface-base px-4 pb-1 text-db-section font-medium text-db-text-primary">
        даже без интернета
      </span>

      <p className="text-db-prose text-db-text-secondary">
        Отсканируйте QR-код камерой телефона, чтобы скачать приложение, или{" "}
        <CopyAppLink>нажмите сюда</CopyAppLink>, чтобы скопировать ссылку
      </p>
    </div>
  );
}
