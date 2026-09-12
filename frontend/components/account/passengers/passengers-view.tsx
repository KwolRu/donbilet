"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { DbButton } from "@/components/ui/db-button";
import { PassengerCard } from "./passenger-card";
import { PassengerPanel, type PassengerDraft } from "./passenger-panel";
import {
  MOCK_PASSENGERS,
  PASSENGERS_LIMIT,
  type Passenger,
} from "@app/core/mocks/passengers";

/**
 * Раздел «Пассажиры» личного кабинета.
 *
 * Список сохранённых пассажиров карточками по четыре в ряд и панель
 * создания/правки справа. Данные моковые (`core/mocks/passengers`) и живут в
 * состоянии страницы: сохранение и удаление работают локально, до появления
 * API (Ф5) этого достаточно, чтобы проверить весь путь.
 *
 * Сетка на `grid`: в макете ряды нарисованы вручную, потому что в Figma нет
 * переноса, — здесь хвост из одной-двух карточек встаёт сам.
 */

/** ISO-дата для хранения: `toISOString` увёл бы дату на день назад в UTC+3. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function PassengersView() {
  const [passengers, setPassengers] = useState<Passenger[]>(MOCK_PASSENGERS);
  const [editing, setEditing] = useState<Passenger | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const reduced = useReducedMotion();

  /** Открыта ли панель на «новом» пассажире, когда мест уже нет. */
  const limitReached = panelOpen && editing === null && passengers.length >= PASSENGERS_LIMIT;

  function openNew() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openExisting(passenger: Passenger) {
    setEditing(passenger);
    setPanelOpen(true);
  }

  function save(draft: PassengerDraft) {
    const base = {
      lastName: draft.lastName.trim(),
      firstName: draft.firstName.trim(),
      middleName: draft.noMiddleName ? "" : draft.middleName.trim(),
      gender: draft.gender ?? "male",
      birthDate: draft.birthDate ? toIsoDate(draft.birthDate) : "",
      citizenship: draft.citizenship ?? "RU",
      documents: draft.documents.filter((document) => document.number.trim() !== ""),
    };

    setPassengers((current) => {
      if (editing) {
        return current.map((item) => (item.id === editing.id ? { ...item, ...base } : item));
      }

      const nextId = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const sample = current[0];

      return [
        ...current,
        // Аватар и обложка придут с бэкенда; пока берём те же, что у остальных.
        { ...base, id: nextId, avatar: sample.avatar, cover: sample.cover },
      ];
    });

    setPanelOpen(false);
  }

  function remove() {
    if (!editing) return;
    setPassengers((current) => current.filter((item) => item.id !== editing.id));
    setPanelOpen(false);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-db-subsection font-medium text-db-text-primary">Пассажиры</h1>

        {/* Тот же вид, что «Изменить» в профиле: действие в заголовке — без плашки. */}
        <DbButton
          variant="plain"
          size="small"
          leftIcon={<Plus className="size-4" strokeWidth={1.5} aria-hidden />}
          onClick={openNew}
        >
          Добавить
        </DbButton>
      </header>

      {/*
       * Белая карточка вокруг списка: рабочая область серая, карточку рисует
       * страница. Поля 9px и низ без ограничения — как у профиля.
       */}
      <div className="squircle flex flex-1 flex-col rounded-db-xl bg-db-surface-default px-[9px] pt-[9px]">
        <ul className="grid grid-cols-4 items-stretch gap-4">
          {/*
           * `AnimatePresence` с `popLayout`: удалённая карточка уходит, а
           * остальные доезжают на её место — без этого сетка перестраивается
           * скачком.
           */}
          <AnimatePresence initial={false} mode="popLayout">
            {passengers.map((passenger) => (
              <motion.li
                key={passenger.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex"
              >
                <PassengerCard passenger={passenger} onClick={() => openExisting(passenger)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <PassengerPanel
        open={panelOpen}
        passenger={editing}
        limitReached={limitReached}
        onClose={() => setPanelOpen(false)}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
}
