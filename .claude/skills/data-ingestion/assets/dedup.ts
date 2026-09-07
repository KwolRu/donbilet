/**
 * ШАБЛОН: дедуп через каскад блокинга + триграммное сходство.
 *
 * ЧИСТЫЕ ФУНКЦИИ — тестируются на реальных парах без БД. Поиск кандидатов в базе делает
 * индекс (pg_trgm + GIN), классификацию пары — эти функции. Так одна и та же логика
 * работает и в запросе, и в тестах.
 *
 * ТРИ ИСХОДА, не два: между порогами — ручной разбор. Попытка развести всё одним порогом
 * даёт либо ложные склейки (необратимая потеря), либо видимый мусор.
 */

// ── Триграммы: тот же принцип, что pg_trgm ───────────────────────────────────

export function trigrams(s: string): Set<string> {
  const t = `  ${s.trim().toLowerCase()} `;
  const set = new Set<string>();
  if (t.trim().length === 0) return set;
  for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3));
  return set;
}

/** Jaccard по триграммам — аналог similarity() в [0..1]. */
export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const g of ta) if (tb.has(g)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Нормализация названия ПЕРЕД сравнением: иначе «ООО Ромашка» и «Ромашка» разойдутся. */
const LEGAL_FORMS = /\b(ооо|оао|зао|ип|пао|ao|llc|ltd|inc|gmbh)\b/gi;
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(LEGAL_FORMS, ' ')
    .replace(/[«»"'`]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Каскад блокинга ──────────────────────────────────────────────────────────

export interface DedupCandidate {
  id?: string;
  nameNormalized: string;
  phones: string[];
  domains: string[];
  city?: string | null;
  addressNormalized?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export type DedupReason = 'phone' | 'domain' | 'name_geo' | 'address_name';
export type DedupVerdict = 'duplicate' | 'different' | 'needs_review';

export interface DedupDecision {
  verdict: DedupVerdict;
  reason?: DedupReason;
  similarity: number;
  detail: string;
}

export const DEDUP_THRESHOLDS = {
  duplicate: 0.85,
  different: 0.55,
  geoRadiusM: 300,
} as const;

/**
 * Общие домены конструкторов и номера агрегаторов НЕ являются признаком одной компании.
 * Список пополняется из разбора ложных склеек — это и есть его единственный источник роста.
 */
export const SHARED_DOMAINS = new Set(['wixsite.com', 'tilda.ws', 'business.site', 'taplink.cc']);
export const SHARED_PHONES = new Set<string>([]); // номера колл-центров/агрегаторов

export function classifyPair(a: DedupCandidate, b: DedupCandidate): DedupDecision {
  const similarity = trigramSimilarity(a.nameNormalized, b.nameNormalized);

  // 1. Телефон — самый надёжный признак, кроме общих номеров.
  const phone = a.phones.find((p) => b.phones.includes(p) && !SHARED_PHONES.has(p));
  if (phone) return { verdict: 'duplicate', reason: 'phone', similarity, detail: `phone=${phone}` };

  // 2. Домен — надёжен, кроме конструкторов сайтов.
  const domain = a.domains.find((d) => b.domains.includes(d) && !isSharedDomain(d));
  if (domain) return { verdict: 'duplicate', reason: 'domain', similarity, detail: `domain=${domain}` };

  // 3. Гео + название. Сети в одном ТЦ дают ложные срабатывания — отсюда порог по названию.
  if (withinRadius(a, b, DEDUP_THRESHOLDS.geoRadiusM)) {
    if (similarity >= DEDUP_THRESHOLDS.duplicate)
      return { verdict: 'duplicate', reason: 'name_geo', similarity, detail: 'гео+название' };
    if (similarity > DEDUP_THRESHOLDS.different)
      return { verdict: 'needs_review', reason: 'name_geo', similarity, detail: 'гео совпало, название спорно' };
  }

  // 4. Адрес + название. БЦ с сотней арендаторов — та же оговорка.
  if (a.addressNormalized && a.addressNormalized === b.addressNormalized) {
    if (similarity >= DEDUP_THRESHOLDS.duplicate)
      return { verdict: 'duplicate', reason: 'address_name', similarity, detail: 'адрес+название' };
    if (similarity > DEDUP_THRESHOLDS.different)
      return { verdict: 'needs_review', reason: 'address_name', similarity, detail: 'адрес совпал, название спорно' };
  }

  // Зона неопределённости по одному названию — в ручной разбор, а не «решим порогом».
  if (similarity >= DEDUP_THRESHOLDS.duplicate) {
    return { verdict: 'needs_review', similarity, detail: 'только название, без подтверждающего признака' };
  }
  return { verdict: 'different', similarity, detail: 'нет совпадений' };
}

function isSharedDomain(d: string): boolean {
  return [...SHARED_DOMAINS].some((s) => d === s || d.endsWith(`.${s}`));
}

function withinRadius(a: DedupCandidate, b: DedupCandidate, meters: number): boolean {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) {
    return !!a.city && a.city === b.city; // деградация до города, если координат нет
  }
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h)) <= meters;
}
