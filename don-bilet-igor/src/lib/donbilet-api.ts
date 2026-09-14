// Клиент боевого API Донбилета (WSv2).
//
// Эндпоинт и ключи взяты из переданного фронтенда (environment.prod.ts) — они
// и так уходят в браузер в открытом виде на текущем сайте. Здесь мы дергаем API
// ТОЛЬКО с сервера (route handlers), ключи в браузер не отдаем.
//
// Проверено вживую: /departures, /arrivals, /search возвращают реальное
// расписание (см. 02_АУДИТ и Postman-коллекцию DonBilet V2).

const BASE = process.env.DONBILET_API_BASE ?? "https://donbilet.ru/WSv2";
const API_KEY = process.env.DONBILET_API_KEY ?? "dbv2";
const API_TOKEN = process.env.DONBILET_API_TOKEN ?? "DE1CA22B854CF19195D82F526D53BAD6";

export type City = {
  cityID: number;
  name: string;
  regionName: string;
  countryName: string;
};

// Один рейс из выдачи /search (поля — как в реальном JSON боевого API).
export type Race = {
  raceName: string;
  raceNum: string;
  raceID: number;
  scheduleID: number;

  depCity: string;
  arrCity: string;
  depDate: string; // ДД.ММ.ГГГГ
  arrDate: string; // ДД.ММ.ГГГГ
  depTime: string; // ЧЧ:ММ
  arrTime: string; // ЧЧ:ММ
  tripTime: string; // Ч:ММ в пути

  stationDepName: string;
  stationDepAddr: string;
  stationDepID: number;
  stationArrName: string;
  stationArrAddr: string;
  stationArrID: number;

  Carrier: string;
  cost: string; // "2800.00"
  baggageCost: string;
  canBuyBaggage: boolean;
  places: string; // кол-во свободных мест
  placesColor: string; // цвет индикатора занятости (#00FF00 и т.п.)

  isBook: "Y" | "N"; // доступна ли онлайн-бронь
  isDetails: "Y" | "N";
  isPrintTicket: boolean;

  sortDepTime: number;
  sortTime: number;
};

export type SearchResult = {
  races: Race[];
  topRaces: Race[];
  /** Следующая дата с рейсами, если на запрошенную ничего нет. */
  nextDate: string | null;
  /** Минимальная цена по выдаче (строкой, как отдает API). */
  minCost: string | null;
};

// ---- Личный кабинет (авторизация по сессионной куке JSESSIONID) ----

export type Ticket = {
  ticketID: number;
  uuid: string;
  orderName: string;
  orderType: string;
  raceName: string;
  raceNum: string;
  depCity: string;
  arrCity: string;
  depStation: string;
  arrStation: string;
  depDateTime: string; // ISO с таймзоной
  arrDateTime: string;
  place: string;
  fName: string;
  lName: string;
  sName: string;
  bDay: string;
  sex: string;
  docTypeName: string;
  docNum: string;
  citizenshipName: string;
  categoryName: string;
  pasTarif: number;
  bagTarif: number;
  agentTarif: number;
  discount: number;
  totalTarif: number;
  isRefundable: "Y" | "N";
};

export type UserInfo = { phone: string; email: string };
export type LkMessage = { header: string; text: string };

/**
 * Боевой сервер Донбилета нестабилен: часть запросов обрывается по таймауту
 * (fetch reject) или отдаёт 5xx. Повторяем несколько раз с небольшой паузой.
 */
async function fetchRetry(input: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, { ...init, signal: AbortSignal.timeout(15000) });
      if (res.status >= 500) {
        lastErr = new Error(`upstream ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw lastErr ?? new Error("upstream unavailable");
}

// Авторизованная сессия ЛК: JSESSIONID (кука) + crfs-токен (заголовок X-Crfs-token).
// Донбилет требует ОБА на каждый /lk/* запрос, иначе 403 «Сессия устарела».
export type Session = { jsessionid: string; token: string };

/**
 * Логин в ЛК. Возвращает {jsessionid, token} или null, если логин не удался.
 * JSESSIONID берётся из Set-Cookie, token — из тела ответа (это же X-Crfs-token).
 */
export async function login(loginName: string, credData: string): Promise<Session | null> {
  const url = withKeys(new URL(`${BASE}/authenticate/login`));
  const res = await fetchRetry(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginName, credData }),
    cache: "no-store",
    redirect: "manual",
  });
  if (res.status >= 400) return null;
  const setCookie = res.headers.get("set-cookie") ?? "";
  const jsessionid = /JSESSIONID=([^;]+)/i.exec(setCookie)?.[1];
  const body = (await res.json().catch(() => null)) as { statusCode?: string; token?: string } | null;
  const token = body?.token ?? res.headers.get("x-crfs-token") ?? undefined;
  if (!jsessionid || !token || body?.statusCode !== "ACCEPTED") return null;
  return { jsessionid, token };
}

function authHeaders(s: Session): Record<string, string> {
  return { Cookie: `JSESSIONID=${s.jsessionid}`, "X-Crfs-token": s.token };
}

/** Регистрация пользователя. POST /main/register {email, phone, password}. */
export async function register(
  email: string,
  phone: string,
  password: string,
): Promise<{ ok: boolean; status: number; message: string }> {
  const url = withKeys(new URL(`${BASE}/main/register`));
  const res = await fetchRetry(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, phone, password }),
    cache: "no-store",
  });
  const message = await res.text().catch(() => "");
  // Бэкенд отдаёт HTTP 200 даже при ошибке, а сам статус кладёт в тело:
  // {"error":"User exists"}. Поэтому наличие поля error трактуем как отказ.
  let bodyError: string | null = null;
  try {
    const parsed = JSON.parse(message) as { error?: string };
    if (parsed && typeof parsed.error === "string") bodyError = parsed.error;
  } catch {
    /* не JSON — оставляем как есть */
  }
  if (bodyError) {
    const ru = /exist/i.test(bodyError) ? "Пользователь с таким email уже зарегистрирован." : bodyError;
    return { ok: false, status: res.status === 200 ? 409 : res.status, message: ru };
  }
  return { ok: res.ok, status: res.status, message };
}

async function lkCall<T>(path: string, session: Session, params: Record<string, string> = {}): Promise<T> {
  const url = withKeys(new URL(`${BASE}/${path}`));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: authHeaders(session), cache: "no-store" });
  if (res.status === 401 || res.status === 403) throw new LkAuthError();
  if (!res.ok) throw new Error(`WSv2 ${path} вернул ${res.status}`);
  return (await res.json()) as T;
}

export class LkAuthError extends Error {
  constructor() {
    super("Требуется авторизация");
    this.name = "LkAuthError";
  }
}

export const getMyTickets = (s: Session) => lkCall<Ticket[]>("lk/mytickets", s);
export const getMyHistory = (s: Session) => lkCall<Ticket[]>("lk/myhistory", s);
export const getMessages = (s: Session) => lkCall<LkMessage[]>("lk/messages", s);
export const getUserInfo = (s: Session) => lkCall<UserInfo>("lk/userinfo", s);

export async function editUserInfo(session: Session, data: Partial<UserInfo> & { credData?: string }): Promise<boolean> {
  const url = withKeys(new URL(`${BASE}/lk/edit`));
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(session) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new LkAuthError();
  return res.ok;
}

/** PDF билета. Отдаётся по ticketid + uuid (без сессии). Возвращает бинарь и content-type. */
export async function getTicketPdf(ticketId: number, uuid: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const url = withKeys(new URL(`${BASE}/main/getticket`));
  url.searchParams.set("ticketid", String(ticketId));
  url.searchParams.set("uuid", uuid);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  return { body: await res.arrayBuffer(), contentType: res.headers.get("content-type") ?? "application/pdf" };
}

export async function startReturn(session: Session, ticketId: number): Promise<boolean> {
  const url = withKeys(new URL(`${BASE}/lk/startreturn`));
  url.searchParams.set("ticketid", String(ticketId));
  const res = await fetch(url.toString(), { headers: authHeaders(session), cache: "no-store" });
  if (res.status === 401 || res.status === 403) throw new LkAuthError();
  return res.ok;
}

function withKeys(url: URL): URL {
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("apitoken", API_TOKEN);
  return url;
}

async function call<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = withKeys(new URL(`${BASE}/${path}`));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    // Расписание меняется редко — короткий кеш снижает нагрузку на боевой сервер,
    // который, по данным аудита, нестабилен под нагрузкой.
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`WSv2 ${path} вернул ${res.status}`);
  }
  return (await res.json()) as T;
}

// Справочники отдаются блоками с городами внутри `points`:
// [{ "points": [ {cityID, name, ...}, ... ] }, ...]. Разворачиваем в плоский список.
type CityBlock = { points?: City[] };

function flattenCities(blocks: CityBlock[]): City[] {
  const out: City[] = [];
  for (const b of blocks) if (Array.isArray(b?.points)) out.push(...b.points);
  return out.filter((c) => c && typeof c.name === "string");
}

export async function getDepartures(): Promise<City[]> {
  return flattenCities(await call<CityBlock[]>("departures"));
}

export async function getArrivals(departureCityId: number): Promise<City[]> {
  return flattenCities(await call<CityBlock[]>("arrivals", { departure: String(departureCityId) }));
}

type RawSearchBlock =
  | { topraces?: Race[]; races?: Race[] }
  | { nextdate?: string; mincost?: string };

/**
 * Поиск рейсов. Дата в формате ДД.ММ.ГГГГ.
 * Боевой API отдает массив из двух блоков: [{topraces, races}, {nextdate, mincost}].
 */
export async function searchRaces(
  departureCityId: number,
  arrivalCityId: number,
  date: string,
): Promise<SearchResult> {
  const raw = await call<RawSearchBlock[]>("search", {
    departure: String(departureCityId),
    arrival: String(arrivalCityId),
    date,
  });

  const first = (raw[0] ?? {}) as { topraces?: Race[]; races?: Race[] };
  const second = (raw[1] ?? {}) as { nextdate?: string; mincost?: string };

  return {
    races: first.races ?? [],
    topRaces: first.topraces ?? [],
    nextDate: second.nextdate ?? null,
    minCost: second.mincost ?? null,
  };
}

// ================= Флоу покупки (без авторизации, по uuid/orderid) =================
// Цепочка: start/ticket → reserve/getpass → reserve/ctzn → reserve/addpass → reserve/buy.
// Проверено вживую на боевом WSv2 (формы ответов см. в комментариях к типам).

export type StartOrder = {
  seatlimit: number;
  isFreePlaces: "Y" | "N";
  orderid: number;
  free: number;
  uuid: string;
};

export type DocType = { id: string; name: string; mask: string };
export type InsuranceOption = { id: number; name: string; price: number };
// Место в салоне. type 0 — проход/пустая ячейка (id "-"), 1 — свободно, 2 — занято.
export type Place = { number: string; id: string; price: number; type: number; x: number; y: number; level: number };

// reserve/getpass — сводка заказа + опции страховки + типы документов.
export type OrderInfo = {
  orderID: number;
  uuid: string;
  orderName: string;
  sessionID: string;
  orderType: string;
  depCity: string;
  arrCity: string;
  depStation: string;
  arrStation: string;
  depDate: string;
  arrDate: string;
  depTime: string;
  arrTime: string;
  depDateTime: string;
  arrDateTime: string;
  carrier: string | null;
  passcount: number;
  price: number;
  totalCost: number;
  insuranceTotal: number;
  isInsurance: "Y" | "N";
  isFreePlaces: "Y" | "N";
  baggagePrice: number;
  email: string | null;
  phone: string | null;
  insurance: InsuranceOption[];
  docTypes: DocType[];
  places: Place[];
  arrayX: number;
  arrayY: number;
  levels: number;
};

// Данные пассажира для reserve/addpass.
export type PassengerInput = {
  fName: string;
  lName: string;
  sName: string;
  bDay: string; // ДД.ММ.ГГГГ
  sex: "m" | "f";
  citizenshipISO: number;
  citizenshipName: string;
  docNum: string;
  docTypeID: string;
  docType: string;
  baggage: number;
  placeNum: string;
  placeID: string;
  place: string;
  passangerID: string;
};

export type AddPassPayload = {
  sessionID: string;
  email: string;
  phone: string;
  coupon: string | null;
  orderID: number;
  passangers: PassengerInput[];
  insuranceID?: number;
  isSubscribe: boolean;
  isSaveLogin: boolean;
  isConfirmPolicy: boolean; // реальное согласие (в старом коде было захардкожено true)
  isConfirmPersonalData: boolean;
};

export type BuyResult = {
  total: number;
  orderID: number;
  sessionID: string;
  merchantSessionID: string | null;
  merchantOrderID: string;
  merchantURL: string; // Payler Pay endpoint
  orderName: string;
};

function first<T>(arr: T[] | T): T {
  return Array.isArray(arr) ? arr[0] : arr;
}

/** Начать покупку по расписанию. Создаёт заказ (orderid+uuid), бронь на 20 минут. */
export async function startTicket(scheduleId: number, person: number): Promise<StartOrder | null> {
  const url = withKeys(new URL(`${BASE}/start/ticket`));
  url.searchParams.set("scheduleid", String(scheduleId));
  url.searchParams.set("person", String(person));
  const res = await fetchRetry(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as StartOrder[];
  const o = first(data);
  return o?.orderid ? o : null;
}

/** Сводка заказа: цены, страховка, типы документов. */
export async function getOrderInfo(uuid: string, orderId: number): Promise<OrderInfo | null> {
  const url = withKeys(new URL(`${BASE}/reserve/getpass`));
  url.searchParams.set("uuid", uuid);
  url.searchParams.set("orderid", String(orderId));
  const res = await fetchRetry(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  return first(await res.json()) as OrderInfo;
}

/** Список гражданств (iso + name). */
export async function getCitizenships(): Promise<{ iso: number; name: string }[]> {
  const url = withKeys(new URL(`${BASE}/reserve/ctzn`));
  const res = await fetchRetry(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const blocks = (await res.json()) as { citizenship?: { iso: number; name: string }[] }[];
  const out: { iso: number; name: string }[] = [];
  for (const b of blocks) if (Array.isArray(b?.citizenship)) out.push(...b.citizenship);
  return out;
}

/**
 * Сохранить данные пассажиров и контакты.
 * Старый фронт перед addpass вызывает addpasslog (best-effort лог) — повторяем.
 * Возвращает {ok, status, message}: важно различать «онлайн-бронь отключена»
 * (422 на боевом при isBook=N по всем рейсам) от прочих ошибок.
 */
export async function addPassengers(
  uuid: string,
  payload: AddPassPayload,
): Promise<{ ok: boolean; status: number; message: string }> {
  const logUrl = withKeys(new URL(`${BASE}/reserve/addpasslog`));
  logUrl.searchParams.set("uuid", uuid);
  try {
    await fetchRetry(logUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    /* лог не критичен */
  }

  const url = withKeys(new URL(`${BASE}/reserve/addpass`));
  url.searchParams.set("uuid", uuid);
  const res = await fetchRetry(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const message = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, message };
}

/** Инициировать оплату — вернуть handoff на Payler. */
export async function buyOrder(orderId: number): Promise<BuyResult | null> {
  const url = withKeys(new URL(`${BASE}/reserve/buy`));
  url.searchParams.set("orderid", String(orderId));
  const res = await fetchRetry(url.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) return null;
  return first(await res.json()) as BuyResult;
}

// ================= Рейсы с пересадкой (ТЗ п.27) =================
// MVP: комбинируем два прямых рейса через пересадочные хабы (крупные города).
// Обе ноги ищутся боевым /search; пары формируются, если между прибытием
// первой ноги и отправлением второй есть запас (≥ MIN_TRANSFER_MIN минут).
// Полный граф хабов — оптимизация на будущее; здесь ограниченный набор хабов
// ради предсказуемого числа запросов к нестабильному боевому серверу.

export type TransferLeg = {
  raceName: string;
  carrier: string;
  depCity: string;
  arrCity: string;
  depStation: string;
  arrStation: string;
  depDate: string;
  arrDate: string;
  depTime: string;
  arrTime: string;
  tripTime: string;
  cost: number | null;
  scheduleID: number;
};

export type TransferOption = {
  hub: string;
  legs: [TransferLeg, TransferLeg];
  transferMinutes: number;
  totalCost: number | null;
};

// Крупные пересадочные города (резолвятся в cityID по справочнику departures).
const HUB_NAMES = ["Москва", "Ростов-на-Дону", "Воронеж", "Краснодар", "Волгоград", "Саратов", "Самара"];
const MIN_TRANSFER_MIN = 45;
const MAX_TRANSFER_MIN = 14 * 60;

function toLeg(r: Race): TransferLeg {
  const n = Number.parseFloat(r.cost);
  return {
    raceName: r.raceName,
    carrier: r.Carrier,
    depCity: r.depCity,
    arrCity: r.arrCity,
    depStation: r.stationDepName,
    arrStation: r.stationArrName,
    depDate: r.depDate,
    arrDate: r.arrDate,
    depTime: r.depTime,
    arrTime: r.arrTime,
    tripTime: r.tripTime,
    cost: Number.isFinite(n) && n > 0 ? Math.round(n) : null,
    scheduleID: r.scheduleID,
  };
}

// "ДД.ММ.ГГГГ" + "ЧЧ:ММ" → timestamp (мс).
function toTs(date: string, time: string): number | null {
  const dm = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return null;
  return new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]), Number(tm[1]), Number(tm[2])).getTime();
}

async function resolveHubIds(depId: number, arrId: number): Promise<{ id: number; name: string }[]> {
  const deps = await getDepartures();
  const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, "е");
  const out: { id: number; name: string }[] = [];
  for (const name of HUB_NAMES) {
    const city = deps.find((c) => norm(c.name) === norm(name));
    if (city && city.cityID !== depId && city.cityID !== arrId) out.push({ id: city.cityID, name: city.name });
  }
  return out;
}

/** Поиск маршрутов с одной пересадкой. date — ДД.ММ.ГГГГ. */
export async function searchConnections(depId: number, arrId: number, date: string): Promise<TransferOption[]> {
  const hubs = await resolveHubIds(depId, arrId);
  const options: TransferOption[] = [];

  await Promise.all(
    hubs.map(async (hub) => {
      try {
        const [leg1, leg2] = await Promise.all([
          searchRaces(depId, hub.id, date),
          searchRaces(hub.id, arrId, date),
        ]);
        for (const r1 of leg1.races) {
          const arr1 = toTs(r1.arrDate, r1.arrTime);
          for (const r2 of leg2.races) {
            const dep2 = toTs(r2.depDate, r2.depTime);
            if (arr1 == null || dep2 == null) continue;
            const gapMin = (dep2 - arr1) / 60000;
            if (gapMin < MIN_TRANSFER_MIN || gapMin > MAX_TRANSFER_MIN) continue;
            const l1 = toLeg(r1);
            const l2 = toLeg(r2);
            options.push({
              hub: hub.name,
              legs: [l1, l2],
              transferMinutes: Math.round(gapMin),
              totalCost: l1.cost != null && l2.cost != null ? l1.cost + l2.cost : null,
            });
          }
        }
      } catch {
        /* хаб недоступен — пропускаем */
      }
    }),
  );

  options.sort((a, b) => (a.totalCost ?? Infinity) - (b.totalCost ?? Infinity));
  return options.slice(0, 20);
}
