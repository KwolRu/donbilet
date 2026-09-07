"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { ToastBanner } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { useNotificationStore, type NotificationKind } from "@app/core/store/notifications";

/**
 * Единая точка отрисовки тостов. Монтируется один раз в layout защищённой зоны.
 * Что показать — решает стор (`useNotificationStore`), компонент только рисует.
 */
const ICONS: Record<NotificationKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const ICON_CLASSES: Record<NotificationKind, string> = {
  info: "text-icon-secondary",
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error",
};

export function GlobalToastContainer() {
  const current = useNotificationStore((s) => s.current);
  const visible = useNotificationStore((s) => s.visible);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const router = useRouter();

  const handleOpenTarget = useCallback(() => {
    if (!current?.targetHref) return;
    // Сначала закрываем: после перехода стор жив, и тост остался бы на экране.
    dismiss();
    router.push(current.targetHref);
  }, [current, router, dismiss]);

  if (!current || !visible) return null;

  const Icon = ICONS[current.kind];

  return (
    <ToastBanner
      onClose={dismiss}
      autoHideDuration={current.autoHideMs ?? 5000}
      keyId={current.id}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_CLASSES[current.kind]}`} />
          <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
            <p className="truncate text-base font-medium leading-5 text-text-primary">
              {current.title}
            </p>
            {current.subtitle ? (
              <p className="line-clamp-2 text-sm font-normal leading-5 text-text-secondary">
                {current.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {current.targetHref ? (
          <div className="pl-7">
            <Button variant="secondary" size="small" onClick={handleOpenTarget}>
              {current.actionLabel || "Открыть"}
            </Button>
          </div>
        ) : null}
      </div>
    </ToastBanner>
  );
}
