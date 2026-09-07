"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/layout-panels/side-panel";
import { EmailTagInput } from "@/components/ui/email-tag-input";
import { DrawerActionOutcome } from "@/components/common/drawer-action-outcome";
import { CopyLinkField } from "@/components/common/copy-link-field";

type FooterVariant = "single" | "dual";

type OutcomePhase = "form" | "success" | "error";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  inviteLink: string;
  /** When this value changes while the panel is open, the current draft is cancelled and a new one is created. */
  draftResetKey?: string;
  onCreateDraft: () => Promise<{ draftId: string; inviteLink: string }>;
  onCancelDraft: (draftId: string) => Promise<void>;
  onSendInvites: (payload: { draftId: string; emails: string[] }) => Promise<void>;
  onClose: () => void;
  footerVariant?: FooterVariant;
  primaryButtonLabel?: string;
  primaryLoadingLabel?: string;
  secondaryButtonLabel?: string;
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
};

export function InviteByEmailDrawer({
  open,
  title,
  description,
  inviteLink: initialInviteLink,
  draftResetKey = "",
  onCreateDraft,
  onCancelDraft,
  onSendInvites,
  onClose,
  footerVariant = "single",
  primaryButtonLabel = "Пригласить по почте",
  primaryLoadingLabel = "Отправляем...",
  secondaryButtonLabel = "Отмена",
  successTitle = "Приглашения отправлены",
  successDescription = "Мы отправили письма выбранным участникам. Ссылка для регистрации будет действовать 7 дней.",
  errorTitle = "Приглашения не отправлены",
  errorDescription = "Проверьте адреса почты и попробуйте снова.",
}: Props) {
  const [emails, setEmails] = useState<string[]>([]);
  /** Сбрасывает локальное поле ввода в `EmailTagInput` при открытии и при `draftResetKey`. */
  const [emailFieldKey, setEmailFieldKey] = useState(0);
  const [draftId, setDraftId] = useState("");
  const [inviteLink, setInviteLink] = useState(initialInviteLink);
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [outcomePhase, setOutcomePhase] = useState<OutcomePhase>("form");
  const [inviteFormKey, setInviteFormKey] = useState(0);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const draftIdRef = useRef("");
  // Колбэки держим в ref'ах, чтобы их пересоздание у родителя не перезапускало
  // эффект создания черновика. Обновляем в эффекте: запись в ref во время
  // рендера ломается при Strict Mode / повторных рендерах.
  const createDraftRef = useRef(onCreateDraft);
  const cancelDraftRef = useRef(onCancelDraft);

  useEffect(() => {
    createDraftRef.current = onCreateDraft;
    cancelDraftRef.current = onCancelDraft;
  }, [onCreateDraft, onCancelDraft]);

  const canSend = emails.length > 0 && Boolean(draftId);

  /** Бэкенд отдаёт относительный путь /invite/<token>; показываем полный URL. */
  const absoluteInviteLink =
    inviteLink && inviteLink.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${inviteLink}`
      : inviteLink;

  // Сброс состояния при закрытии панели — во время рендера, чтобы при повторном
  // открытии не мелькнул экран результата от прошлой отправки.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setOutcomePhase("form");
      setInviteFormKey(0);
      setLastErrorMessage(null);
    }
  }

  // Идентификатор черновика живёт в ref — сбрасываем его после коммита.
  useEffect(() => {
    if (open) return;
    draftIdRef.current = "";
  }, [open]);

  useEffect(() => {
    if (!open || outcomePhase !== "form") return;

    let cancelled = false;

    const run = async () => {
      const previousId = draftIdRef.current;
      if (previousId) {
        try {
          await cancelDraftRef.current(previousId);
        } catch {
          /* ignore cancel errors */
        }
        draftIdRef.current = "";
      }

      setIsSent(false);
      setEmails([]);
      setEmailFieldKey((key) => key + 1);
      setSendError(null);
      setDraftId("");
      setInviteLink(initialInviteLink);

      try {
        const response = await createDraftRef.current();
        if (cancelled) return;
        draftIdRef.current = response.draftId;
        setDraftId(response.draftId);
        setInviteLink(response.inviteLink);
      } catch (err) {
        console.error("InviteByEmailDrawer: create draft failed", err);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, outcomePhase, draftResetKey, initialInviteLink, inviteFormKey]);

  const handleClose = async () => {
    const id = draftIdRef.current || draftId;
    if (id && !isSent) {
      await cancelDraftRef.current(id);
    }
    draftIdRef.current = "";
    onClose();
  };

  const finishOutcomeAndClose = async () => {
    const id = draftIdRef.current || draftId;
    if (id && !isSent) {
      try {
        await cancelDraftRef.current(id);
      } catch {
        /* ignore */
      }
    }
    draftIdRef.current = "";
    setOutcomePhase("form");
    setIsSent(false);
    onClose();
  };

  const goBackToInviteForm = () => {
    setOutcomePhase("form");
    setIsSent(false);
    setLastErrorMessage(null);
    setInviteFormKey((k) => k + 1);
  };

  const runSend = async () => {
    const id = draftIdRef.current || draftId;
    if (!id || !emails.length) return;
    try {
      setIsSending(true);
      setSendError(null);
      await onSendInvites({ draftId: id, emails });
      setIsSent(true);
      setOutcomePhase("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось отправить приглашения";
      setSendError(message);
      setLastErrorMessage(message);
      setOutcomePhase("error");
    } finally {
      setIsSending(false);
    }
  };

  const panelTitle =
    outcomePhase === "success" ? successTitle : outcomePhase === "error" ? errorTitle : title;
  const panelDescription =
    outcomePhase === "success"
      ? successDescription
      : outcomePhase === "error"
        ? lastErrorMessage ?? errorDescription
        : description;

  const footerSingle = (
    <div className="space-y-3">
      <Button
        variant="primary"
        className="w-full"
        disabled={!canSend || isSending}
        onClick={() => void runSend()}
      >
        {isSending ? primaryLoadingLabel : primaryButtonLabel}
      </Button>
    </div>
  );

  const footerDual = (
    <div className="flex w-full items-stretch gap-4">
      <Button type="button" variant="linear" className="flex-1" onClick={() => void handleClose()}>
        {secondaryButtonLabel}
      </Button>
      <Button
        type="button"
        variant="primary"
        className="flex-1"
        disabled={isSending || !canSend}
        onClick={() => void runSend()}
      >
        {isSending ? primaryLoadingLabel : primaryButtonLabel}
      </Button>
    </div>
  );

  const footerOutcome = (
    <div className="flex w-full flex-col gap-3">
      <Button type="button" className="w-full" onClick={() => void finishOutcomeAndClose()}>
        Готово
      </Button>
      <Button type="button" variant="secondary" className="w-full" onClick={() => goBackToInviteForm()}>
        Пригласить ещё
      </Button>
    </div>
  );

  return (
    <SidePanel
      open={open}
      title={panelTitle}
      description={panelDescription}
      onClose={handleClose}
      footer={
        outcomePhase === "form"
          ? footerVariant === "dual"
            ? footerDual
            : footerSingle
          : footerOutcome
      }
    >
      {outcomePhase === "form" ? (
        <div className="space-y-4">
          {sendError ? <span className="text-caption-sm text-text-error">{sendError}</span> : null}
          <CopyLinkField
            label="Ссылка-приглашение"
            value={absoluteInviteLink}
          />

          <label className="flex flex-col gap-2">
            <span className="text-caption-sm text-text-secondary">
              Электронная почта участников
            </span>
            <EmailTagInput key={emailFieldKey} emails={emails} onChange={setEmails} />
          </label>
        </div>
      ) : (
        <DrawerActionOutcome variant={outcomePhase === "success" ? "success" : "error"} />
      )}
    </SidePanel>
  );
}
