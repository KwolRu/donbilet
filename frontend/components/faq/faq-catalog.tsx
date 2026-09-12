"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { FaqAccordion } from "@/components/landing/faq-accordion";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import type { FaqCategory } from "@app/core/mocks/faq";

/**
 * Справочная: категории вкладками и список вопросов под ними.
 *
 * Вкладки — общий `SegmentedTabs`; вид задаётся классами, потому что в
 * шаблоне он серо-белый, а здесь по макету активная вкладка жёлтая. Свой
 * компонент заводить не за чем: поведение (в том числе оптимистичное
 * переключение) там уже правильное.
 *
 * `key` на аккордеоне — намеренно: при смене категории список вопросов
 * меняется целиком, и раскрытым должен оказаться первый вопрос новой
 * категории, а не тот же номер из прошлой.
 */
export function FaqCatalog({ categories }: { categories: FaqCategory[] }) {
  const [active, setActive] = useState(categories[0]?.value ?? "");
  const reduced = useReducedMotion();

  const current = categories.find((category) => category.value === active) ?? categories[0];

  return (
    <div className="flex w-full flex-col gap-5">
      <SegmentedTabs
        tabs={categories.map(({ value, label }) => ({ value, label }))}
        value={active}
        onChange={setActive}
        /*
         * Высота контрола 40px: белая подложка с полем 4 и кнопки 32.
         * Подложка обязательна — без неё вкладки висят прямо на сером фоне
         * страницы и перестают читаться как один переключатель.
         */
        containerClassName="squircle gap-1 rounded-db-sm border-0 bg-db-surface-default p-1"
        buttonClassName="squircle h-8 rounded-db-xs px-4 text-db-button"
        activeButtonClassName="bg-db-surface-base text-db-text-primary"
        inactiveButtonClassName="text-db-text-secondary hover:bg-db-surface-muted"
      />

      <div className="squircle w-full rounded-db-2xl bg-db-surface-default p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.value}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <FaqAccordion key={current.value} items={current.items} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
