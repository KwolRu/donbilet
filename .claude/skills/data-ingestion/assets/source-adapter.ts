/**
 * ШАБЛОН: контракт адаптера источника данных.
 *
 * ИНВАРИАНТ: бизнес-код знает ВОЗМОЖНОСТЬ, а не вендора. Слаг источника в конвейере —
 * ошибка ревью. Различия провайдеров (формат координат, семантика радиуса, поведение
 * пагинации) живут ВНУТРИ адаптера.
 *
 * АДАПТАЦИЯ: заменить поля RawRecord и SearchInput под свою предметную область.
 */

// ── Область поиска: типизированная структура, а не строка ────────────────────
// radius и polygon ведут себя по-разному у разных источников, и строка это скрывает.
export type AreaSpec =
  | { type: 'city'; city: string; country?: string }
  | { type: 'district'; city: string; district: string }
  | { type: 'radius'; centerLat: number; centerLon: number; radiusM: number }
  | { type: 'polygon'; polygon: Array<[number, number]> };

export interface SearchInput {
  area: AreaSpec;
  category: string;
  limit?: number;
  cursor?: string;
}

/** Сырая запись источника. Хранится КАК ЕСТЬ рядом с нормализованной. */
export interface RawRecord {
  externalId: string;
  name?: string;
  phones?: string[];
  website?: string;
  address?: string;
  lat?: number;
  lon?: number;
  categories?: string[];
  /** Всё остальное, что прислал источник — не выбрасывать. */
  raw: unknown;
}

/**
 * Возможности источника. ОБЯЗАТЕЛЕН: без него в конвейере заводится
 * `if (source === 'x')`, и абстракция протекает обратно.
 */
export interface SourceCapabilities {
  search: boolean;
  details: boolean;
  contacts: boolean;
  reviews: boolean;
  supportsPagination: boolean;
  /** Требует явного разрешения на трату (policy context.allow_paid). */
  paid: boolean;
  maxRadiusM?: number;
  /** Регионы/категории, где источник реально полезен — для выбора. */
  coverage?: { countries?: string[]; categories?: string[] };
}

/** Классификация ошибки провайдера: разные классы → разные операционные реакции. */
export type ProviderErrorClass =
  | 'rate_limit'       // 429 → backoff
  | 'quota_or_auth'    // 401/403 → сменить ключ, пометить источник degraded
  | 'provider_failure' // 5xx → ретрай, при устойчивости — другой источник
  | 'timeout'          // сеть → ретрай
  | 'unknown';

export function classifyProviderError(err: unknown): ProviderErrorClass {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/(^|\D)429(\D|$)|rate.?limit|too many/.test(m)) return 'rate_limit';
  if (/(^|\D)40[13](\D|$)|unauthorized|forbidden|quota|api.?key/.test(m)) return 'quota_or_auth';
  if (/(^|\D)5\d\d(\D|$)|internal server|bad gateway|service unavailable/.test(m)) return 'provider_failure';
  if (/abort|timed?.?out|timeout|etimedout|econnrefused|network|fetch failed/.test(m)) return 'timeout';
  return 'unknown';
}

export interface SearchResult {
  records: RawRecord[];
  /** Курсор источника — сохраняется вместе с прогоном для продолжения после сбоя. */
  cursor?: string;
  /**
   * Хэш формы ответа. Несовместимое изменение внешнего API ловится НА ГРАНИЦЕ,
   * а не через неделю в виде странных данных. При расхождении — остановить источник.
   */
  schemaHash: string;
}

export interface SourceAdapter {
  readonly slug: string;
  capabilities(): SourceCapabilities;
  search(input: SearchInput): Promise<SearchResult>;
  details?(externalId: string): Promise<RawRecord>;
  /** Дешёвая проверка живости — НЕ полноценный поиск. */
  health(): Promise<{ ok: boolean; latencyMs?: number; reason?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Пример реализации. Обратить внимание: наружу не протекает ни один вендорский термин.
// ─────────────────────────────────────────────────────────────────────────────

export class ExampleAdapter implements SourceAdapter {
  readonly slug = 'example';

  constructor(private readonly apiKey: string) {
    // Fail-closed: без ключа адаптер не создаётся, а не «работает как-нибудь»
    // и выясняет это на первом же лиде.
    if (!apiKey) throw new Error('example: API key не сконфигурирован');
  }

  capabilities(): SourceCapabilities {
    return {
      search: true,
      details: true,
      contacts: false,
      reviews: false,
      supportsPagination: true,
      paid: false,
      maxRadiusM: 50_000,
      coverage: { countries: ['RU'] },
    };
  }

  async search(input: SearchInput): Promise<SearchResult> {
    // Приведение НАШЕЙ области к параметрам вендора — здесь и только здесь.
    const params = this.toVendorParams(input);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(`https://api.example.com/search?${params}`, {
        headers: { authorization: `Bearer ${this.apiKey}` },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`example HTTP ${res.status}`);
      const body = (await res.json()) as { items: unknown[]; next?: string };

      return {
        records: body.items.map((i) => this.toRawRecord(i)),
        cursor: body.next,
        schemaHash: this.schemaHash(body),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async health() {
    const started = Date.now();
    try {
      const res = await fetch('https://api.example.com/ping', { signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - started };
    } catch (e) {
      return { ok: false, reason: classifyProviderError(e) };
    }
  }

  // ── приватное: всё вендор-специфичное ─────────────────────────────────────
  private toVendorParams(_input: SearchInput): string {
    // radius → их формат, category → их таксономия, cursor → их пагинация
    return '';
  }
  private toRawRecord(item: unknown): RawRecord {
    return { externalId: String((item as { id: unknown }).id), raw: item };
  }
  private schemaHash(_body: unknown): string {
    // Хэш ключей верхнего уровня + типов — устойчив к данным, чувствителен к форме.
    return 'sha256:…';
  }
}
