import { MonitorSmartphone } from "lucide-react";

/**
 * Полноэкранная заглушка «доступно только на компьютере».
 * Видна на мобильной и планшетной ширине (< laptop, 1024px) и скрыта на
 * ноутбуке/десктопе (`laptop:hidden`). Перекрывает приложение сплошным фоном.
 */
export function DeviceUnavailable() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-white px-6 text-center laptop:hidden">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface-base-tertiary">
        <MonitorSmartphone className="h-8 w-8 text-icon-primary" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold leading-7 text-text-primary">
        Доступно только на компьютере
      </h1>
      <p className="max-w-sm text-base font-normal leading-6 text-text-secondary">
        Мобильная и планшетная версии пока недоступны. Откройте приложение на компьютере или ноутбуке —
        так все разделы работают корректно.
      </p>
    </div>
  );
}
