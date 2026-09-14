"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Heart, LayoutGrid, List, SlidersHorizontal } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { DbFilterChip } from "@/components/ui/db-filter-chip";
import { DbSelectField } from "@/components/ui/db-form-fields";
import { TicketsSearching } from "@/components/account/tickets/tickets-searching";
import { selectRussianPlural } from "@app/core/utils/russian-plural";
import { FiltersPanel } from "./filters-panel";
import { HotelsStrip } from "./hotels-strip";
import { PriceStrip } from "./price-strip";
import { SearchBar } from "./search-bar";
import { TripCard } from "./trip-card";
import { TripCompactCard } from "./trip-compact-card";
import type { RacesSearchQuery } from "@/lib/routing/trip-search-url";
import {
  FOUND_TRIPS,
  MOCK_TRIPS,
  PAGE_SIZES,
  QUICK_FILTERS,
  SEARCH_SORTS,
  tripPriceValue,
  type QuickFilter,
  type SearchSort,
  type SearchTrip,
  type TransportTab,
} from "@app/core/mocks/search";

/**
 * Страница результатов поиска.
 *
 * Порядок блоков из макета и он же порядок решений: чем ехать (плитки
 * транспорта) → когда (календарь цен) → что отобрать (фильтры) → чем
 * отличаются рейсы (выдача). Подборка жилья вклинивается после третьей
 * карточки — там, где человек уже понял, во что обойдётся дорога.
 *
 * Выдача показывается двумя видами: карточкой с перевозчиком и удобствами и
 * компактной строкой. Это не косметика — второй вид нужен, когда рейсов
 * много и важно сравнить время с ценой.
 *
 * Данные моковые (`core/mocks/search`): до появления API (блокер B1) этого
 * хватает, чтобы пройти весь путь — от выбора даты до кнопки «Выбрать место».
 */

/** Через сколько карточек вставляется подборка жилья. */
const HOTELS_AFTER = 3;

type ViewMode = "cards" | "rows";

export function SearchResultsView({ initialSearch = {} }: { initialSearch?: RacesSearchQuery }) {
  const [transport, setTransport] = useState<TransportTab["value"]>(
    initialSearch.transport ?? "bus",
  );
  const [dateColumn, setDateColumn] = useState("5");
  const [sort, setSort] = useState<SearchSort>("cheap");
  const [pageSize, setPageSize] = useState("20");
  const [view, setView] = useState<ViewMode>("cards");
  /*
   * Быстрый фильтр ровно один: чипы отвечают на разные вопросы об одном и том
   * же рейсе и вместе почти всегда дают пустую выдачу. Выбор ведёт себя как
   * переключатель — нажатие на выбранный снимает его.
   *
   * Ничего не выбрано, пока не нажали: выдача сразу после поиска должна
   * показывать всё найденное, иначе человек видит отфильтрованный список,
   * ничего не нажав.
   */
  const [quick, setQuick] = useState<QuickFilter | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [trips, setTrips] = useState<SearchTrip[]>(MOCK_TRIPS);
  const [visible, setVisible] = useState(6);
  const [searching, setSearching] = useState(false);
  /*
   * Догрузка отвечает не мгновенно: короткая пауза с подписью «Загружаем…»
   * честнее мгновенной вставки — с живым API ответ и правда займёт время,
   * и интерфейс не должен вести себя по-разному до и после подключения.
   */
  const [loadingMore, setLoadingMore] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!searching) return;

    // Пауза после смены условий: заставка, мелькнувшая на 30мс, читается как
    // подёргивание, а не как работа.
    const timer = window.setTimeout(() => setSearching(false), 420);
    return () => window.clearTimeout(timer);
  }, [searching, quick, sort, dateColumn, transport]);

  /** Любое изменение подборки показывает заставку — откуда бы оно ни пришло. */
  function changeSelection(apply: () => void) {
    setSearching(true);
    apply();
  }

  function toggleQuick(value: QuickFilter) {
    changeSelection(() => setQuick((current) => (current === value ? null : value)));
  }

  const filtered = useMemo(() => {
    const result = trips.filter((trip) => {
      if (quick === "baggage" && !trip.baggage) return false;
      if (quick === "no-transfer" && trip.transfers > 0) return false;
      if (quick === "direct" && !trip.direct) return false;
      return true;
    });

    const sorted = [...result];
    if (sort === "cheap") sorted.sort((a, b) => tripPriceValue(a.price) - tripPriceValue(b.price));
    if (sort === "early") sorted.sort((a, b) => a.departure.time.localeCompare(b.departure.time));
    if (sort === "fast") sorted.sort((a, b) => a.seatsLeft - b.seatsLeft);

    return sorted;
  }, [trips, quick, sort]);

  const shown = filtered.slice(0, visible);
  const rest = filtered.length - shown.length;

  function loadMore() {
    setLoadingMore(true);
    window.setTimeout(() => {
      setVisible((current) => current + Number(pageSize));
      setLoadingMore(false);
    }, 320);
  }

  function toggleFavorite(id: number) {
    setTrips((current) =>
      current.map((trip) => (trip.id === id ? { ...trip, favorite: !trip.favorite } : trip)),
    );
  }

  return (
    /*
     * Страница прокручивается целиком, как остальные публичные: своя область
     * прокрутки внутри выдачи отрезала бы футер и ломала привычное поведение
     * колеса.
     */
    <div className="flex w-full flex-col">
      <SearchBar
        initialSearch={initialSearch}
        transport={transport}
        onTransportChange={(next) => changeSelection(() => setTransport(next))}
      />

      {/* 32px от плиток транспорта до календаря цен — расстояние из макета. */}
      <div className="mx-auto flex w-[1220px] flex-col gap-6 pt-8 pb-6">
        <PriceStrip
          value={dateColumn}
          onChange={(column) => changeSelection(() => setDateColumn(column.id))}
        />

        <span className="h-px w-full bg-db-border-default" aria-hidden />

        {/* Ряд фильтров: сортировка, подробные фильтры, быстрые чипы. */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DbSelectField
              label="Сортировка"
              hideLabel
              compact
              className="w-[212px]"
              value={sort}
              options={SEARCH_SORTS.map((item) => ({ value: item.value, label: item.label }))}
              onChange={(next) => changeSelection(() => setSort(next as SearchSort))}
            />

            <DbButton
              variant="lianer"
              leftIcon={<SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />}
              onClick={() => setFiltersOpen(true)}
            >
              Фильтр
            </DbButton>

            <div className="flex items-center gap-2">
              {QUICK_FILTERS.map((filter) => (
                <DbFilterChip
                  key={filter.value}
                  selected={quick === filter.value}
                  onClick={() => toggleQuick(filter.value)}
                >
                  {filter.label}
                </DbFilterChip>
              ))}

              {/* «Очистить» появляется, только когда есть что очищать. */}
              <AnimatePresence initial={false}>
                {quick !== null && (
                  <motion.div
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <DbFilterChip
                      alwaysShowClear
                      onClick={() => changeSelection(() => setQuick(null))}
                    >
                      Очистить
                    </DbFilterChip>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <DbButton
            variant="lianer"
            className="whitespace-nowrap"
            leftIcon={
              /* Сохранённый поиск — красное сердце: то же действие и тот же
                 знак, что у избранного в карточке рейса. */
              <Heart
                className={
                  "size-4 transition-colors duration-300 ease-db " +
                  (saved ? "fill-db-icon-error text-db-icon-error" : "")
                }
                strokeWidth={1.5}
                aria-hidden
              />
            }
            onClick={() => setSaved((current) => !current)}
          >
            {saved ? "Поиск сохранён" : "Сохранить поиск"}
          </DbButton>
        </div>

        <div className="flex flex-col gap-4">
          {/* Счётчик и вид выдачи. */}
          <div className="flex items-center justify-between gap-4">
            {/* Число по факту, а не константа: иначе фильтр меняет список,
                а счётчик остаётся прежним — и кажется, что он не сработал. */}
            <span className="text-db-item font-medium text-db-text-primary">
              Найдено {filtered.length} {selectRussianPlural(filtered.length, {
                one: "рейс",
                few: "рейса",
                many: "рейсов",
              })}
            </span>

            <div className="flex items-center gap-3">
              <DbSelectField
                label="Сколько показывать"
                hideLabel
                compact
                className="w-[196px]"
                value={pageSize}
                options={PAGE_SIZES.map((item) => ({ value: item.value, label: item.label }))}
                onChange={setPageSize}
              />

              <div className="squircle flex items-center rounded-db-sm bg-db-surface-default p-1 outline outline-1 -outline-offset-1 outline-db-border-subtle">
                <ViewButton
                  active={view === "cards"}
                  label="Карточками"
                  reduced={Boolean(reduced)}
                  onClick={() => setView("cards")}
                  icon={<LayoutGrid className="size-4" strokeWidth={1.5} aria-hidden />}
                />
                <ViewButton
                  active={view === "rows"}
                  label="Списком"
                  reduced={Boolean(reduced)}
                  onClick={() => setView("rows")}
                  icon={<List className="size-4" strokeWidth={1.5} aria-hidden />}
                />
              </div>
            </div>
          </div>

          {searching ? (
            <TicketsSearching />
          ) : shown.length === 0 ? (
            <div className="squircle flex flex-col items-center gap-3 rounded-db-xl bg-db-surface-default p-12 text-center">
              <h2 className="text-db-subsection font-medium text-db-text-primary">
                Под эти условия рейсов нет
              </h2>
              <p className="max-w-[420px] text-db-body text-db-text-secondary">
                Снимите часть фильтров — например «Только прямые» — или посмотрите соседние даты.
              </p>
              <DbButton variant="lianer" onClick={() => changeSelection(() => setQuick(null))}>
                Очистить фильтры
              </DbButton>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence initial={false} mode="popLayout">
                {shown.map((trip, index) => (
                  <motion.div
                    key={`${view}-${trip.id}`}
                    layout={!reduced}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{
                      duration: reduced ? 0 : 0.26,
                      ease: [0.22, 1, 0.36, 1],
                      /*
                       * Каскад: каждая следующая карточка стартует на 40мс
                       * позже. Волна читается как «список собирается», тогда
                       * как одновременное появление десятка карточек — как
                       * вспышка. Потолок в 6 шагов: дальше задержка начинает
                       * ощущаться задержкой.
                       */
                      delay: reduced ? 0 : Math.min(index, 5) * 0.04,
                    }}
                    className="flex flex-col gap-4"
                  >
                    {view === "cards" ? (
                      <TripCard trip={trip} onToggleFavorite={() => toggleFavorite(trip.id)} />
                    ) : (
                      <TripCompactCard trip={trip} />
                    )}

                    {/* Подборка жилья — после третьей карточки, как в макете. */}
                    {/* Секция жилья отбита сильнее карточек: 24px вместо
                        16px в ряду — она не часть выдачи, а вставка в неё.
                        Колонка уже даёт 16px, добавляем по 8px с каждой
                        стороны. */}
                    {index === HOTELS_AFTER - 1 && (
                      <HotelsStrip cityIn="во Владивостоке" className="my-2" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/*
               * Догрузка — та же кнопка, что под новостями: одинаковое
               * действие должно выглядеть одинаково по всему сайту.
               */}
              {rest > 0 && (
                <DbButton
                  variant="secondary"
                  fullWidth
                  className="h-12 p-4"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore
                    ? "Загружаем…"
                    : `Показать ещё ${Math.min(rest, Number(pageSize))} билетов`}
                </DbButton>
              )}
            </div>
          )}
        </div>
      </div>

      <FiltersPanel
        open={filtersOpen}
        foundCount={FOUND_TRIPS}
        onClose={() => setFiltersOpen(false)}
        onApply={() => {
          setFiltersOpen(false);
          setSearching(true);
        }}
        onReset={() => changeSelection(() => setQuick(null))}
      />
    </div>
  );
}

/** Кнопка переключения вида выдачи: активная — с жёлтой подложкой. */
function ViewButton({
  active,
  label,
  icon,
  onClick,
  reduced,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  /** Тот же флаг, что у всей страницы: анимацию решает один источник. */
  reduced: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={
        "squircle relative flex size-8 items-center justify-center rounded-db-xs text-db-text-primary " +
        "transition-[transform,background-color] duration-300 ease-db active:scale-90 " +
        (active ? "" : "hover:bg-db-surface-muted")
      }
    >
      {/* Подложка переезжает между кнопками, а не гаснет и зажигается: так
          переключатель читается как один элемент с двумя положениями. */}
      {active && (
        <motion.span
          layoutId={reduced ? undefined : "search-view-mode"}
          transition={{ duration: reduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="squircle absolute inset-0 rounded-db-xs bg-db-surface-base"
          aria-hidden
        />
      )}

      <span className="relative flex">{icon}</span>
    </button>
  );
}
