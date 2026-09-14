"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, X } from "lucide-react";

import { ListToolbar } from "@/components/account/shared/list-toolbar";
import { useDebouncedValue } from "@app/core/hooks/useDebouncedValue";
import { TicketsEmpty } from "./tickets-empty";
import { TicketsSearching } from "./tickets-searching";
import { RateTripPanel } from "./rate-trip-panel";
import { RefundPanel } from "./refund-panel";
import { TicketCard } from "./ticket-card";
import { TicketRow } from "./ticket-row";
import {
  MOCK_COMPLETED_TICKETS,
  MOCK_UPCOMING_TICKETS,
  TICKET_SORTS,
  TRANSPORT_FILTERS,
  type Ticket,
  type TicketSort,
  type TransportFilter,
} from "@app/core/mocks/tickets";

/**
 * Раздел «Мои билеты».
 *
 * Две вкладки — предстоящие и завершённые, и это разные списки, а не фильтр
 * одного: у предстоящих поездок в корешке деньги и возврат, у завершённых —
 * оценка и «повторить». Поэтому и вёрстка разная: предстоящие идут карточками,
 * завершённые — строками, из которых раскрывается карточка.
 *
 * Данные моковые (`core/mocks/tickets`) и живут в состоянии страницы: оценка
 * сохраняется локально. До появления API (Ф5) этого хватает, чтобы пройти
 * весь путь — от списка до возврата.
 */

type Tab = "upcoming" | "completed";

const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "Предстоящие" },
  { value: "completed", label: "Завершённые" },
];

export function TicketsView() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TicketSort>("new");
  const [filter, setFilter] = useState<TransportFilter>("all");
  const [completed, setCompleted] = useState<Ticket[]>(MOCK_COMPLETED_TICKETS);
  /*
   * Какая завершённая поездка раскрыта карточкой. По умолчанию — первая, как
   * в макете: свежая поездка нужна чаще прочих. Теперь её можно и свернуть —
   * стрелка в корешке делает именно это, а не открывает форму отзыва.
   */
  const [expandedId, setExpandedId] = useState<number | null>(
    MOCK_COMPLETED_TICKETS[0]?.id ?? null,
  );
  const reduced = useReducedMotion();

  const [refunding, setRefunding] = useState<Ticket | null>(null);
  const [rating, setRating] = useState<Ticket | null>(null);

  const source = tab === "upcoming" ? MOCK_UPCOMING_TICKETS : completed;

  /*
   * Запрос уходит в фильтрацию с задержкой: без неё список перестраивается на
   * каждый символ, и текст «Краснодар» успевает пять раз показать пустоту по
   * дороге к результату. Фильтр и сортировка проходят тем же путём — заставка
   * должна вести себя одинаково, откуда бы ни пришло изменение.
   */
  const debouncedQuery = useDebouncedValue(query);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searching) return;

    // Короткая пауза после того, как значение устоялось: заставка, мелькнувшая
    // на 30мс, читается как подёргивание, а не как работа.
    const timer = window.setTimeout(() => setSearching(false), 420);
    return () => window.clearTimeout(timer);
  }, [searching, debouncedQuery, filter, sort, tab]);

  const visible = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();

    const filtered = source.filter((ticket) => {
      if (filter !== "all" && ticket.transport !== filter) return false;
      if (!needle) return true;

      // Ищем по тому, что видно в карточке: маршрут и номера. По документам
      // пассажиров искать нельзя — их незачем светить в общем поиске.
      return [
        ticket.departure.city,
        ticket.arrival.city,
        ticket.number,
        ticket.raceNumber,
      ].some((field) => field.toLowerCase().includes(needle));
    });

    const sorted = [...filtered];
    if (sort === "old") sorted.reverse();
    if (sort === "price") {
      sorted.sort((a, b) => priceValue(b.total) - priceValue(a.total));
    }

    return sorted;
  }, [source, filter, debouncedQuery, sort]);

  function applyRating(value: number) {
    if (!rating) return;

    setCompleted((current) =>
      current.map((ticket) => (ticket.id === rating.id ? { ...ticket, rating: value } : ticket)),
    );
    setRating(null);
  }

  /** Любое изменение подборки показывает заставку — откуда бы оно ни пришло. */
  function changeSelection(apply: () => void) {
    setSearching(true);
    apply();
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-db-page font-medium text-db-text-primary">Мои билеты</h1>

        <ListToolbar
          tabs={TABS}
          tab={tab}
          onTabChange={(next) => changeSelection(() => setTab(next))}
          query={query}
          onQueryChange={(next) => changeSelection(() => setQuery(next))}
          searchLabel="Поиск по билетам"
          sorts={TICKET_SORTS}
          sort={sort}
          onSortChange={(next) => changeSelection(() => setSort(next))}
          filters={TRANSPORT_FILTERS}
          filter={filter}
          onFilterChange={(next) => changeSelection(() => setFilter(next))}
        />

      </header>

      {searching ? (
        <TicketsSearching />
      ) : visible.length === 0 ? (
        <TicketsEmpty
          query={debouncedQuery}
          filterLabel={
            filter === "all"
              ? null
              : (TRANSPORT_FILTERS.find((item) => item.value === filter)?.label ?? null)
          }
          onReset={() =>
            changeSelection(() => {
              setQuery("");
              setFilter("all");
            })
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {/*
           * `layout` на элементах списка: когда строка разворачивается в
           * карточку, соседи доезжают на новое место, а не перескакивают.
           * `AnimatePresence` с `popLayout` доигрывает то же самое при смене
           * вкладки и фильтра.
           */}
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((ticket) => (
              <motion.li
                key={`${tab}-${ticket.id}`}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: reduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === "upcoming" ? (
                  <TicketCard
                    ticket={ticket}
                    onRefund={() => setRefunding(ticket)}
                    onRate={() => setRating(ticket)}
                  />
                ) : expandedId === ticket.id ? (
                  <TicketCard
                    ticket={ticket}
                    variant="completed"
                    defaultExpanded
                    onRefund={() => setRefunding(ticket)}
                    onRate={() => setRating(ticket)}
                    onCollapse={() => setExpandedId(null)}
                  />
                ) : (
                  <TicketRow
                    ticket={ticket}
                    onRate={() => setRating(ticket)}
                    onExpand={() => setExpandedId(ticket.id)}
                  />
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <RefundPanel open={refunding !== null} ticket={refunding} onClose={() => setRefunding(null)} />

      <RateTripPanel
        open={rating !== null}
        route={rating ? `${rating.departure.city} - ${rating.arrival.city}` : ""}
        date={rating?.departure.date ?? ""}
        initialRating={rating?.rating ?? null}
        onClose={() => setRating(null)}
        onSubmit={applyRating}
      />
    </div>
  );
}

/** «6 870 ₽» → 6870. Нужно только для сортировки по цене. */
function priceValue(total: string): number {
  return Number(total.replace(/[^\d]/g, "")) || 0;
}
