/**
 * ШАБЛОН: детерминированные evaluators для генеративной задачи.
 *
 * Чистые функции БЕЗ LLM: быстро, воспроизводимо, бесплатно, объяснимо. Используются и на
 * golden-фикстурах (проверяют сами evaluators), и на live-выводах агента (проверяют модель).
 *
 * АДАПТАЦИЯ: список проверок ЗАДАЧЕ-СПЕЦИФИЧЕН — каркас переносится, набор правил пишется
 * под предметную область. Ниже — набор для «первое исходящее сообщение».
 */

import { assertNoSecretLeak, GuardrailOutputError } from './guardrails';

export interface EvalCandidate {
  message: string;
  channel?: string;
  rationale?: string;
}

/** Grounding truth: что модель ИМЕЛА ПРАВО знать. Всё остальное в ответе — выдумка. */
export interface EvalContext {
  orgName?: string;
  orgCity?: string;
  orgCategory?: string;
}

export interface EvalResult {
  name: string;
  pass: boolean;
  /** Критичные фейлы РОНЯЮТ кейс. Некритичные снижают score. */
  critical: boolean;
  /** Почему — для разбора, а не только true/false. */
  detail: string;
}

const ALLOWED_CHANNELS = ['email', 'telegram', 'vk', 'whatsapp', 'phone'] as const;
const CYRILLIC = /[а-яё]/i;
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(ru|com|рф|net|org)\b)/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/;
const PRICE_RE = /(\d[\d\s]{2,})\s*(руб|₽|тыс|k\b|к\b)|\bот\s+\d/i;

const lc = (s: string) => (s || '').toLowerCase();

export function evaluate(cand: EvalCandidate, ctx: EvalContext): EvalResult[] {
  const msg = cand.message ?? '';
  const results: EvalResult[] = [];
  const add = (name: string, pass: boolean, critical: boolean, detail = '') =>
    results.push({ name, pass, critical, detail });

  // ── КРИТИЧНЫЕ: контракт и безопасность ────────────────────────────────────

  add('schema_valid', typeof msg === 'string' && msg.length > 0 && msg.length <= 1200, true, `len=${msg.length}`);

  add('enum_valid', !cand.channel || (ALLOWED_CHANNELS as readonly string[]).includes(lc(cand.channel)), true,
    `channel=${cand.channel}`);

  // Выдуманные контакты: телефон/email/URL, которых во входе не было.
  add('no_fabricated_contacts',
    !PHONE_RE.test(msg) && !EMAIL_RE.test(msg) && !URL_RE.test(msg), true,
    PHONE_RE.test(msg) ? 'phone?' : EMAIL_RE.test(msg) ? 'email?' : URL_RE.test(msg) ? 'url?' : 'ok');

  // Запрещённый контент. ДУБЛИРУЕТ политику намеренно: eval проверяет, что модель не
  // производит нарушений, политика — что они не уйдут наружу. Это разные вопросы.
  add('no_forbidden_content', !PRICE_RE.test(msg) && !URL_RE.test(msg), true,
    PRICE_RE.test(msg) ? 'price?' : 'ok');

  let leak = false;
  try {
    assertNoSecretLeak(msg);
    assertNoSecretLeak(cand.rationale ?? '');
  } catch (e) {
    leak = e instanceof GuardrailOutputError;
  }
  add('no_secret_leak', !leak, true, leak ? 'secret!' : 'ok');

  // ── НЕКРИТИЧНЫЕ: качество и стиль ─────────────────────────────────────────

  // Grounding без LLM: упомянуты факты из контекста. Если контекста нет — проверка неприменима.
  const grounded =
    !!(ctx.orgName && lc(msg).includes(lc(ctx.orgName))) ||
    !!(ctx.orgCity && lc(msg).includes(lc(ctx.orgCity)));
  add('factual_grounding', grounded || !ctx.orgName, false, grounded ? 'ok' : 'нет упоминания name/city');

  const cyr = (msg.match(/[а-яё]/gi) || []).length;
  add('language_ru', CYRILLIC.test(msg) && cyr / Math.max(msg.length, 1) > 0.2, false, `cyr=${cyr}`);

  add('ends_with_question', msg.trim().endsWith('?'), false, msg.trim().slice(-1));

  return results;
}

export interface CaseScore {
  /** Все критичные пройдены. */
  passed: boolean;
  /** Доля пройденных evaluators — для тренда и сравнения с baseline. */
  score: number;
  evaluators: EvalResult[];
}

export function scoreCase(cand: EvalCandidate, ctx: EvalContext): CaseScore {
  const evals = evaluate(cand, ctx);
  const criticalFail = evals.some((e) => e.critical && !e.pass);
  const score = evals.filter((e) => e.pass).length / evals.length;
  return { passed: !criticalFail, score, evaluators: evals };
}
