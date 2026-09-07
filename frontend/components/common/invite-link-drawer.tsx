"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { NoticeBlock } from "@/components/ui/notice-block";
import { EmailTagInput } from "@/components/ui/email-tag-input";
import { SidePanel } from "@/components/layout-panels/side-panel";
import { CopyLinkField } from "@/components/common/copy-link-field";

type InviteLinkData = { inviteLink: string; acceptedCount: number };

type Props = {
  open: boolean;
  title: string;
  description?: string;
  /** Текст под ссылкой (например, «Отправьте эту ссылку преподавателям»). */
  hint?: string;
  onClose: () => void;
  loadLink: () => Promise<InviteLinkData>;
  revokeLink: () => Promise<InviteLinkData>;
  /**
   * Отправка приглашений на email. Когда задана — в дравере появляется секция
   * с полем-бейджами адресатов. Возвращает количество отправленных писем.
   */
  sendEmailInvites?: (emails: string[]) => Promise<number>;
  /**
   * Адреса, которым приглашение уже отправляли. Показываются заблокированными
   * бейджами; повторно пригласить их нельзя. Вызывается при открытии дравера.
   */
  loadSentInvites?: () => Promise<string[]>;
  /** Контент над ссылкой (например, выбор роли для per-role ссылки). */
  topContent?: ReactNode;
  /** Смена значения перезагружает ссылку (например, при выборе другой роли). */
  reloadKey?: string | number;
};

/**
 * Дравер постоянной ссылки-приглашения на роль. Ссылка многоразовая и без срока:
 * по ней регистрируются участники (роль фиксирована). «Отозвать и обновить» —
 * генерирует новый токен, старая ссылка перестаёт работать.
 */
export function InviteLinkDrawer({
  open,
  title,
  description,
  hint = "Ссылка постоянная и многоразовая — делитесь ей с участниками. Роль назначается автоматически.",
  onClose,
  loadLink,
  revokeLink,
  sendEmailInvites,
  loadSentInvites,
  topContent,
  reloadKey,
}: Props) {
  const [link, setLink] = useState("");
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [emails, setEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [lockedEmails, setLockedEmails] = useState<string[]>([]);
  const loadLinkRef = useRef(loadLink);
  const loadSentInvitesRef = useRef(loadSentInvites);

  useEffect(() => {
    loadLinkRef.current = loadLink;
  }, [loadLink]);

  useEffect(() => {
    loadSentInvitesRef.current = loadSentInvites;
  }, [loadSentInvites]);

  // Уже приглашённые адреса подтягиваем при открытии: список общий на школу,
  // поэтому он должен переживать перезагрузку страницы и смену менеджера.
  useEffect(() => {
    if (!open || !loadSentInvitesRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const sent = await loadSentInvitesRef.current!();
        if (!cancelled) setLockedEmails(sent);
      } catch {
        if (!cancelled) setLockedEmails([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  const handleClose = () => {
    setEmails([]);
    setSendError(null);
    setSentCount(null);
    setSending(false);
    onClose();
  };

  const handleSend = async () => {
    if (!sendEmailInvites || emails.length === 0) return;
    setSending(true);
    setSendError(null);
    setSentCount(null);
    try {
      const count = await sendEmailInvites(emails);
      setSentCount(count);
      // Отправленные адреса переезжают в заблокированные — повторно их не пригласить.
      setLockedEmails((prev) => [...prev, ...emails.filter((email) => !prev.includes(email))]);
      setEmails([]);
    } catch {
      setSendError("Не удалось отправить приглашения");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadLinkRef.current();
        if (!cancelled) {
          setLink(data.inviteLink);
          setAcceptedCount(data.acceptedCount);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить ссылку");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, retryKey, reloadKey]);

  const absoluteLink =
    link && link.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${link}`
      : link;

  const handleRevoke = async () => {
    setRevoking(true);
    setError(null);
    try {
      const data = await revokeLink();
      setLink(data.inviteLink);
      setAcceptedCount(data.acceptedCount);
      // Ссылка сменилась — сервер обнулил журнал приглашений: чистим и черновик,
      // и уже отправленные (locked) адреса, и статусы отправки. Поле полностью пустое.
      setEmails([]);
      setLockedEmails([]);
      setSendError(null);
      setSentCount(null);
    } catch {
      setError("Не удалось обновить ссылку");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <SidePanel
      open={open}
      title={title}
      description={description}
      onClose={handleClose}
      footer={
        <Button type="button" className="w-full" onClick={handleClose}>
          Готово
        </Button>
      }
    >
      <div className="space-y-4">
        {topContent}

        {error ? (
          <div className="flex items-center justify-between gap-3" role="alert">
            <span className="text-caption-sm text-text-error">{error}</span>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Повторить
            </Button>
          </div>
        ) : null}

        <CopyLinkField
          label="Ссылка-приглашение"
          value={loading ? "Загрузка…" : absoluteLink}
          disabled={loading}
        />

        <NoticeBlock
          variant="info"
          text={`${hint} Зарегистрировано по ссылке: ${acceptedCount}.`}
        />

        {sendEmailInvites ? (
          <div className="space-y-3 border-t border-border-subtle pt-4">
            <span className="text-caption-sm text-text-primary">
              Или отправьте приглашение на email
            </span>
            <EmailTagInput
              emails={emails}
              onChange={setEmails}
              lockedEmails={lockedEmails}
              lockedHint="Приглашение уже отправлено"
            />
            {sendError ? (
              <span className="block text-caption-sm text-text-error" role="alert">
                {sendError}
              </span>
            ) : null}
            {sentCount !== null ? (
              <span className="block text-caption-sm text-text-success">
                Приглашения отправлены: {sentCount}
              </span>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={sending || emails.length === 0}
              onClick={() => void handleSend()}
            >
              {sending ? "Отправляем…" : "Отправить приглашения"}
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={revoking || loading}
          onClick={() => void handleRevoke()}
        >
          {revoking ? "Обновляем…" : "Отозвать и обновить ссылку"}
        </Button>
      </div>
    </SidePanel>
  );
}
