/**
 * ШАБЛОН: сложение уверенности из признаков с потолками и порогом.
 *
 * ПРИНЦИПЫ:
 *  - потолок на ОСЬ: иначе одна ось с несколькими свидетельствами перевешивает все прочие;
 *  - потолок на вклад МОДЕЛИ: она не должна в одиночку переводить факт через порог;
 *  - АСИММЕТРИЯ: положительное суждение повышает уверенность, отрицательное не понижает
 *    автоматически — отрицательный вывод модели о редком случае менее надёжен;
 *  - рядом со статусом хранится РАЗБИВКА: без неё на вопрос «почему 42» ответа нет.
 */

export type Axis =
  | 'phone_match'
  | 'domain_in_profile'
  | 'name_on_page'
  | 'address_on_page'
  | 'cross_link'
  | 'llm_judgement';

interface AxisConfig {
  /** Вклад одного сработавшего свидетельства этой оси. */
  weight: number;
  /** Потолок суммарного вклада оси. */
  cap: number;
}

export const AXES: Record<Axis, AxisConfig> = {
  phone_match: { weight: 40, cap: 40 },
  domain_in_profile: { weight: 35, cap: 35 },
  name_on_page: { weight: 20, cap: 20 },
  address_on_page: { weight: 15, cap: 15 },
  cross_link: { weight: 30, cap: 30 },
  // Отдельная ось с потолком — вклад модели ограничен намеренно.
  llm_judgement: { weight: 25, cap: 25 },
};

/** Порог подбирается на РАЗМЕЧЕННОЙ выборке, а не берётся «50 по умолчанию». */
export const CONFIDENCE_THRESHOLD = 60;

export interface Signal {
  axis: Axis;
  /** Сработал ли признак. Для llm_judgement: true только при ПОЛОЖИТЕЛЬНОМ суждении. */
  present: boolean;
  /** Доля вклада [0..1] — для признаков с градацией (например confidence модели). */
  strength?: number;
  detail?: string;
}

export interface ConfidenceResult {
  score: number;
  passed: boolean;
  /** Разбивка по осям — обязательна для объяснимости. */
  breakdown: Array<{ axis: Axis; contributed: number; detail?: string }>;
}

export function computeConfidence(signals: Signal[]): ConfidenceResult {
  const perAxis = new Map<Axis, number>();
  const breakdown: ConfidenceResult['breakdown'] = [];

  for (const s of signals) {
    if (!s.present) continue;
    const cfg = AXES[s.axis];
    if (!cfg) continue;

    const raw = cfg.weight * (s.strength ?? 1);
    const already = perAxis.get(s.axis) ?? 0;
    const contributed = Math.max(0, Math.min(raw, cfg.cap - already)); // потолок оси
    if (contributed === 0) continue;

    perAxis.set(s.axis, already + contributed);
    breakdown.push({ axis: s.axis, contributed: Number(contributed.toFixed(2)), detail: s.detail });
  }

  const score = Math.min(100, [...perAxis.values()].reduce((a, b) => a + b, 0));
  return { score: Number(score.toFixed(2)), passed: score >= CONFIDENCE_THRESHOLD, breakdown };
}

/**
 * Преобразование суждения модели в сигнал.
 *
 * АСИММЕТРИЯ: `belongs === false` НЕ даёт отрицательного вклада — оно просто не добавляет
 * положительного. Отрицательный вклад означал бы, что одна неуверенная реплика модели
 * способна опровергнуть совпавший телефон. Асимметрию фиксировать в ADR, иначе её сочтут багом.
 */
export function llmSignal(judgement: { belongs: boolean; confidence?: number; reasons?: string[] }): Signal {
  return {
    axis: 'llm_judgement',
    present: judgement.belongs === true,
    strength: clamp01(judgement.confidence ?? 1),
    detail: judgement.reasons?.slice(0, 2).join('; '),
  };
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}
