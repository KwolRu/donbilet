"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Heart, Info } from "lucide-react";

import { ListToolbar } from "@/components/account/shared/list-toolbar";
import { TicketsSearching } from "@/components/account/tickets/tickets-searching";
import { useDebouncedValue } from "@app/core/hooks/useDebouncedValue";
import { FavoriteOfferRow } from "./favorite-offer-row";
import { FavoriteTripCard } from "./favorite-trip-card";
import {
  FAVORITE_SORTS,
  FAVORITE_TABS,
  MOCK_FAVORITES,
  PRICE_NOTICE,
  favoritePriceValue,
  type FavoriteDirection,
  type FavoriteSort,
  type FavoriteTab,
} from "@app/core/mocks/favorites";
import { TRANSPORT_FILTERS, type TransportFilter } from "@app/core/mocks/tickets";

/**
 * Раздел «Избранное».
 *
 * Сохранённое сгруппировано по направлениям — так в макете, и так осмысленно:
 * человек следит за маршрутом целиком, а не за отдельной датой. Внутри
 * направления две сущности, они и разведены по вкладкам:
 *   «Направления» — сохранённые варианты строкой, только цена и дата;
 *   «Билеты»      — конкретные рейсы карточкой с перевозчиком и выбором места.
 *
 * Тулбар — общий `ListToolbar`, тот же, что над «Моими билетами»: задача у
 * них одна, и разъехавшиеся копии пришлось бы чинить дважды.
 *
 * Данные моковые (`core/mocks/favorites`), удаление работает локально.
 */
export function FavoritesView() {
  const [directions, setDirections] = useState<FavoriteDirection[]>(MOCK_FAVORITES);
  const [tab, setTab] = useState<FavoriteTab>("directions");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<FavoriteSort>("new");
  const [filter, setFilter] = useState<TransportFilter>("all");
  const [searching, setSearching] = useState(false);
  const reduced = useReducedMotion();

  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    if (!searching) return;

    // Короткая пауза после того, как значение устоялось: заставка, мелькнувшая
    // на 30мс, читается как подёргивание, а не как работа.
    const timer = window.setTimeout(() => setSearching(false), 420);
    return () => window.clearTimeout(timer);
  }, [searching, debouncedQuery, filter, sort, tab]);

  /** Любое изменение подборки показывает заставку — откуда бы оно ни пришло. */
  function changeSelection(apply: () => void) {
    setSearching(true);
    apply();
  }

  const visible = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();

    return directions
      .map((direction) => {
        const offers = direction.offers.filter(
          (offer) => filter === "all" || offer.transport === filter,
        );
        const trips = direction.trips.filter(
          (trip) => filter === "all" || trip.transport === filter,
        );

        const sortedOffers = [...offers];
        if (sort === "old") sortedOffers.reverse();
        if (sort === "cheap") {
          sortedOffers.sort((a, b) => favoritePriceValue(a.price) - favoritePriceValue(b.price));
        }

        return { ...direction, offers: sortedOffers, trips };
      })
      .filter((direction) => {
        // Направление остаётся, если совпал его маршрут или в нём что-то есть.
        if (needle && !direction.title.toLowerCase().includes(needle)) return false;
        return tab === "trips" ? direction.trips.length > 0 : direction.offers.length > 0;
      });
  }, [directions, debouncedQuery, filter, sort, tab]);

  function removeOffer(directionId: number, offerId: number) {
    setDirections((current) =>
      current.map((direction) =>
        direction.id === directionId
          ? { ...direction, offers: direction.offers.filter((offer) => offer.id !== offerId) }
          : direction,
      ),
    );
  }

  function removeTrip(directionId: number, tripId: number) {
    setDirections((current) =>
      current.map((direction) =>
        direction.id === directionId
          ? { ...direction, trips: direction.trips.filter((trip) => trip.id !== tripId) }
          : direction,
      ),
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <header className="flex shrink-0 flex-col gap-2">
        <h1 className="text-db-page font-medium text-db-text-primary">Избранное</h1>

        <ListToolbar
          tabs={FAVORITE_TABS}
          tab={tab}
          onTabChange={(next) => changeSelection(() => setTab(next))}
          query={query}
          onQueryChange={(next) => changeSelection(() => setQuery(next))}
          searchLabel="Поиск по избранному"
          sorts={FAVORITE_SORTS}
          sort={sort}
          onSortChange={(next) => changeSelection(() => setSort(next))}
          filters={TRANSPORT_FILTERS}
          filter={filter}
          onFilterChange={(next) => changeSelection(() => setFilter(next))}
        />
      </header>

      {searching ? (
        <TicketsSearching />
      ) : tab === "hotels" ? (
        <EmptyState
          title="Отели пока не сохраняются"
          hint="Раздел появится вместе с подключением партнёра по бронированию."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Здесь пока пусто"
          hint={
            debouncedQuery || filter !== "all"
              ? "Ничего не нашлось. Измените запрос или снимите фильтр."
              : "Сохраняйте направления и рейсы — они будут ждать вас здесь."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((direction) => (
              <motion.section
                key={direction.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: reduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="squircle flex flex-col gap-4 rounded-db-xl bg-db-surface-default p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-[20px] leading-7 font-medium text-db-text-primary">
                    {direction.title}
                  </h2>

                  {/* Предупреждение о цене — не украшение: избранное хранит
                      вариант, а не бронь, и цена к оформлению меняется. */}
                  <span className="flex items-center gap-1 rounded-full bg-db-surface-muted px-2 py-1">
                    <Info className="size-3 shrink-0 text-db-text-secondary" strokeWidth={1.5} aria-hidden />
                    <span className="text-db-chip text-db-text-secondary">{PRICE_NOTICE}</span>
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {tab === "trips"
                      ? direction.trips.map((trip) => (
                          <motion.div
                            key={trip.id}
                            layout={!reduced}
                            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <FavoriteTripCard
                              trip={trip}
                              onRemove={() => removeTrip(direction.id, trip.id)}
                            />
                          </motion.div>
                        ))
                      : direction.offers.map((offer) => (
                          <motion.div
                            key={offer.id}
                            layout={!reduced}
                            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <FavoriteOfferRow
                              offer={offer}
                              onRemove={() => removeOffer(direction.id, offer.id)}
                            />
                          </motion.div>
                        ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Пустое состояние раздела: почему пусто и что с этим делать. */
function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="squircle flex flex-1 flex-col items-center justify-center gap-3 rounded-db-xl bg-db-surface-default p-12 text-center">
      <span className="squircle flex size-16 items-center justify-center rounded-db-md bg-db-surface-muted">
        <Heart className="size-7 text-db-text-tertiary" strokeWidth={1.5} aria-hidden />
      </span>

      <h2 className="text-db-subsection font-medium text-db-text-primary">{title}</h2>
      <p className="max-w-[420px] text-db-body text-db-text-secondary">{hint}</p>
    </div>
  );
}
