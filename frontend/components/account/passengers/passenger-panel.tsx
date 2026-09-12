"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Trash2, X } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { DbCheckbox } from "@/components/ui/db-checkbox";
import {
  DbDateField,
  DbFieldGroup,
  DbSelectField,
  DbTextField,
} from "@/components/ui/db-form-fields";
import { SidePanel } from "@/components/layout-panels/side-panel";
import {
  CITIZENSHIP_OPTIONS,
  DOCUMENT_TYPES,
  GENDER_OPTIONS,
  PASSENGERS_LIMIT,
  documentLabel,
  fullName,
  type DocumentType,
  type Gender,
  type Passenger,
  type PassengerDocument,
} from "@app/core/mocks/passengers";

/**
 * Панель пассажира: создание и правка в одной форме.
 *
 * Три состояния, все три из макета:
 *   лимит   — вместо формы предупреждение, что больше 10 пассажиров нельзя;
 *   новый   — пустая форма и одна кнопка «Сохранить»;
 *   правка  — заполненная форма, сверху ещё «Удалить пассажира».
 *
 * Черновик живёт в панели и уезжает вместе с ней: пока пользователь не нажал
 * «Сохранить», в списке ничего не меняется. `key` на панели в списке сбрасывает
 * это состояние при смене пассажира — иначе в форму соседа попали бы чужие
 * правки.
 */

type Draft = {
  lastName: string;
  firstName: string;
  middleName: string;
  noMiddleName: boolean;
  gender: Gender | null;
  birthDate: Date | null;
  citizenship: string | null;
  documents: PassengerDocument[];
};

const EMPTY_DRAFT: Draft = {
  lastName: "",
  firstName: "",
  middleName: "",
  noMiddleName: false,
  gender: null,
  birthDate: null,
  citizenship: "RU",
  documents: [],
};

function draftFrom(passenger: Passenger | null): Draft {
  if (!passenger) return EMPTY_DRAFT;

  return {
    lastName: passenger.lastName,
    firstName: passenger.firstName,
    middleName: passenger.middleName,
    noMiddleName: passenger.middleName === "",
    gender: passenger.gender,
    birthDate: new Date(passenger.birthDate),
    citizenship: passenger.citizenship,
    documents: passenger.documents,
  };
}

export function PassengerPanel({
  open,
  passenger,
  limitReached,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  /** `null` — создание нового пассажира. */
  passenger: Passenger | null;
  /** Открыть форму нельзя: в аккаунте уже максимум пассажиров. */
  limitReached: boolean;
  onClose: () => void;
  onSave: (draft: Draft) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(passenger));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /*
   * Счётчик открытий. Панель не размонтируется (её каркас нужен для анимации
   * ухода), поэтому поля внутри сохраняли бы своё состояние между показами —
   * например открытый список гражданства всплывал бы поверх следующей формы.
   * Ключ на форме перемонтирует её при каждом открытии.
   */
  const [instance, setInstance] = useState(0);
  const reduced = useReducedMotion();

  /*
   * Сброс черновика при открытии — во время рендера, а не в эффекте: так React
   * успевает перерисовать форму до показа, без лишнего кадра со старыми
   * данными и без каскада рендеров, на который ругается компилятор.
   */
  const signature = `${open}:${passenger?.id ?? "new"}`;
  const [prevSignature, setPrevSignature] = useState(signature);

  if (signature !== prevSignature) {
    setPrevSignature(signature);

    if (open) {
      setDraft(draftFrom(passenger));
      setConfirmingDelete(false);
      setInstance((current) => current + 1);
    }
  }

  function patch(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function addDocument() {
    const used = new Set(draft.documents.map((document) => document.type));
    const free = DOCUMENT_TYPES.find((type) => !used.has(type.value));
    if (!free) return;

    patch({ documents: [...draft.documents, { type: free.value, number: "" }] });
  }

  function patchDocument(index: number, next: Partial<PassengerDocument>) {
    patch({
      documents: draft.documents.map((document, position) =>
        position === index ? { ...document, ...next } : document,
      ),
    });
  }

  function removeDocument(index: number) {
    patch({ documents: draft.documents.filter((_, position) => position !== index) });
  }

  const title = limitReached
    ? "Новый пассажир"
    : passenger
      ? fullName(passenger)
      : "Новый пассажир";

  const allDocumentsAdded = draft.documents.length >= DOCUMENT_TYPES.length;

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      className="!p-0"
      header={
        <div className="flex flex-col items-end gap-4 px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="transition-[opacity,transform] duration-300 ease-out hover:rotate-90 hover:opacity-60"
          >
            <X className="size-6 text-db-text-primary" strokeWidth={2} aria-hidden />
          </button>

          <h2 className="w-full text-db-subsection font-medium text-db-text-primary">{title}</h2>
        </div>
      }
      footer={
        <div className="relative flex flex-col gap-3 px-6 pt-0 pb-6">
          {limitReached ? (
            <DbButton variant="primary" size="large" fullWidth onClick={onClose}>
              Понятно
            </DbButton>
          ) : (
            <>
              {passenger && (
                <DbButton
                  variant="lianer"
                  size="large"
                  fullWidth
                  onClick={() => setConfirmingDelete(true)}
                >
                  Удалить пассажира
                </DbButton>
              )}

              <DbButton variant="primary" size="large" fullWidth onClick={() => onSave(draft)}>
                Сохранить
              </DbButton>
            </>
          )}

          {/*
           * Подтверждение всплывает над кнопками, у нижнего края панели:
           * так оно всегда на виду, независимо от того, куда прокручена форма,
           * и не спорит по слоям с раскрытыми списками внутри неё.
           */}
          <AnimatePresence>
            {confirmingDelete && (
              <motion.div
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="squircle absolute bottom-full left-6 z-40 mb-3 flex w-[calc(100%-48px)] flex-col gap-4 rounded-db-md bg-db-surface-default p-4 shadow-[0_0_36px_rgba(0,0,0,0.12)]"
              >
                <p className="text-[20px] leading-7 font-medium text-db-text-primary">
                  Вы уверены, что хотите удалить пассажира?
                </p>

                <div className="flex flex-col gap-3">
                  <DbButton
                    variant="tertiary"
                    size="small"
                    fullWidth
                    className="p-4"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Отменить
                  </DbButton>
                  <DbButton
                    variant="secondary"
                    size="small"
                    fullWidth
                    className="p-4"
                    onClick={() => {
                      setConfirmingDelete(false);
                      onDelete();
                    }}
                  >
                    Удалить
                  </DbButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
    >
      <div key={instance} className="relative flex flex-col gap-4 px-6 pb-2">
        {limitReached ? (
          <div className="squircle flex flex-col gap-2 rounded-db-sm bg-db-surface-elevated p-3">
            <p className="text-[16px] leading-5 font-medium text-db-text-primary">
              Достигнут лимит пассажиров
            </p>
            <p className="text-db-caption leading-5 text-db-text-secondary">
              В аккаунте можно сохранить не более {PASSENGERS_LIMIT} пассажиров. Чтобы добавить
              нового, удалите одного из сохранённых.
            </p>
          </div>
        ) : (
          <>
            <DbFieldGroup title="Личные данные">
              <DbTextField
                label="Фамилия"
                value={draft.lastName}
                onChange={(next) => patch({ lastName: next })}
              />
              <DbTextField
                label="Имя"
                value={draft.firstName}
                onChange={(next) => patch({ firstName: next })}
              />
              <DbTextField
                label="Отчество"
                value={draft.middleName}
                disabled={draft.noMiddleName}
                onChange={(next) => patch({ middleName: next })}
              />

              {/* Галочка не просто помечает — она и очищает поле, иначе в заявку
                  уйдёт отчество, которого пассажир не заявлял. */}
              <DbCheckbox
                checked={draft.noMiddleName}
                onChange={(next) => patch({ noMiddleName: next, middleName: next ? "" : draft.middleName })}
              >
                Нет отчества
              </DbCheckbox>

              <div className="flex items-start gap-3">
                <DbSelectField
                  label="Пол"
                  value={draft.gender}
                  options={[...GENDER_OPTIONS]}
                  onChange={(next) => patch({ gender: next as Gender })}
                />
                <DbDateField
                  label="Дата рождения"
                  value={draft.birthDate}
                  max={new Date()}
                  onChange={(next) => patch({ birthDate: next })}
                />
              </div>

              <DbSelectField
                label="Гражданство"
                value={draft.citizenship}
                options={[...CITIZENSHIP_OPTIONS]}
                searchable
                onChange={(next) => patch({ citizenship: next })}
              />
            </DbFieldGroup>

            {draft.documents.map((document, index) => (
              <DbFieldGroup
                key={index}
                title={documentLabel(document.type)}
                action={
                  <button
                    type="button"
                    onClick={() => removeDocument(index)}
                    aria-label={`Удалить документ: ${documentLabel(document.type)}`}
                    className="transition-[color,transform] duration-300 ease-out hover:text-db-icon-error active:scale-90"
                  >
                    <Trash2 className="size-4 text-db-text-tertiary" strokeWidth={1.5} aria-hidden />
                  </button>
                }
              >
                <DbSelectField
                  label="Тип документа"
                  value={document.type}
                  options={[...DOCUMENT_TYPES]}
                  onChange={(next) => patchDocument(index, { type: next as DocumentType })}
                />
                <DbTextField
                  label="Серия и номер"
                  value={document.number}
                  onChange={(next) => patchDocument(index, { number: next })}
                />
              </DbFieldGroup>
            ))}

            <DbButton
              variant="tertiary"
              size="small"
              fullWidth
              className="p-4"
              disabled={allDocumentsAdded}
              onClick={addDocument}
            >
              {allDocumentsAdded ? "Все документы добавлены" : "Добавить документ"}
            </DbButton>
          </>
        )}

      </div>
    </SidePanel>
  );
}

export type { Draft as PassengerDraft };
