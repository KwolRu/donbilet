// Модель одного рейса для UI. Поля берутся 1:1 из боевого WSv2 (см. donbilet-api.ts),
// но уже нормализованы для карточки результата.
export type BusResult = {
  raceName: string;
  carrier: string;
  depTime: string; // ЧЧ:ММ
  arrTime: string; // ЧЧ:ММ
  depDate: string; // ДД.ММ.ГГГГ
  arrDate: string; // ДД.ММ.ГГГГ
  tripTime: string; // "8:30"
  stationDepName: string;
  stationArrName: string;
  places: string;
  placesColor: string;
  cost: number | null;
  canBook: boolean;
  scheduleID: number;
};

export type SearchResponse = {
  results: BusResult[];
  nextDate: string | null;
  minCost: string | null;
};
