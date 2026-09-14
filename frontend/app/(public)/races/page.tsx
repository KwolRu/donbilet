import type { Metadata } from "next";

import { SearchResultsView } from "@/components/search/search-results-view";

export const metadata: Metadata = {
  title: "Поиск автобусных билетов — ДонБилет",
  description:
    "Расписание рейсов, цены по датам и свободные места. Выбирайте рейс и оформляйте билет онлайн.",
};

/**
 * Выдача поиска. Адрес `/races` совпадает с legacy — сайт много лет в
 * поисковой выдаче, и менять путь нельзя (см. `lib/routing/public-paths.ts`).
 */
export default function SearchPage() {
  return <SearchResultsView />;
}
