/**
 * ШАБЛОН: бюджетный гейт AI-задач.
 *
 * ПРИНЦИПЫ:
 *  - Проверка ПЕРЕД тратой. Постфактум-контроль — это отчёт, а не лимит.
 *  - Вызывается ПОСЛЕ идемпотентности: повтор завершённой задачи денег не тратит, и упирать
 *    его в лимит нельзя — клиент не сможет забрать собственный результат.
 *  - Источник расхода — ЖУРНАЛ ВЫПОЛНЕНИЙ (SUM cost_usd), а не собственный счётчик:
 *    один источник правды, переживающий рестарты.
 *  - Исчерпание → 402 с цифрами, не 500 и не 429: ретрай не поможет, поможет пополнение.
 *
 * АДАПТАЦИЯ: ORM, имя tenant-поля, источник лимитов (таблица настроек / план тарифа).
 */

import { Injectable } from '@nestjs/common';

export type BudgetPeriod = 'day' | 'month';

export class AiBudgetExceededError extends Error {
  constructor(
    public readonly period: BudgetPeriod,
    public readonly spentUsd: number,
    public readonly limitUsd: number,
  ) {
    super(`AI-бюджет исчерпан (${period}): потрачено $${spentUsd.toFixed(4)} из $${limitUsd.toFixed(2)}`);
    this.name = 'AiBudgetExceededError';
  }
}

interface BudgetLimits {
  dailyLimitUsd?: number;
  monthlyLimitUsd?: number;
}

@Injectable()
export class AiBudgetService {
  constructor(private readonly prisma: PrismaService) {} // TODO: ORM проекта

  /** Гейт перед тратой. Бросает AiBudgetExceededError → маппер превращает в 402. */
  async assertWithinBudget(workspaceId: string): Promise<void> {
    const limits = await this.limits(workspaceId);
    if (!limits.dailyLimitUsd && !limits.monthlyLimitUsd) return; // лимиты не заданы — не мешаем

    const [spentToday, spentMonth] = await Promise.all([
      this.spent(workspaceId, 'day'),
      this.spent(workspaceId, 'month'),
    ]);

    if (limits.dailyLimitUsd && spentToday >= limits.dailyLimitUsd) {
      throw new AiBudgetExceededError('day', spentToday, limits.dailyLimitUsd);
    }
    if (limits.monthlyLimitUsd && spentMonth >= limits.monthlyLimitUsd) {
      throw new AiBudgetExceededError('month', spentMonth, limits.monthlyLimitUsd);
    }
  }

  /** Публичная сводка для UI: GET /api/ai/budget. */
  async summary(workspaceId: string) {
    const limits = await this.limits(workspaceId);
    const [day, month] = await Promise.all([this.spent(workspaceId, 'day'), this.spent(workspaceId, 'month')]);
    return {
      day: { spentUsd: round(day), limitUsd: limits.dailyLimitUsd ?? null, share: share(day, limits.dailyLimitUsd) },
      month: { spentUsd: round(month), limitUsd: limits.monthlyLimitUsd ?? null, share: share(month, limits.monthlyLimitUsd) },
    };
  }

  /** Расход за период — по журналу выполнений. Учитываются ВСЕ статусы:
   *  провалившаяся задача тоже могла потратить деньги до падения. */
  private async spent(workspaceId: string, period: BudgetPeriod): Promise<number> {
    const from = period === 'day' ? startOfDay() : startOfMonth();
    const agg = await this.prisma.aiTaskExecution.aggregate({
      where: { workspaceId, createdAt: { gte: from } },
      _sum: { costUsd: true },
    });
    return Number(agg._sum.costUsd ?? 0);
  }

  private async limits(workspaceId: string): Promise<BudgetLimits> {
    // TODO: источник лимитов проекта (настройки воркспейса / тарифный план).
    const s = await this.prisma.workspaceSettings.findUnique({ where: { workspaceId } });
    return {
      dailyLimitUsd: s?.aiDailyLimitUsd ?? numEnv('AI_DAILY_LIMIT_USD'),
      monthlyLimitUsd: s?.aiMonthlyLimitUsd ?? numEnv('AI_MONTHLY_LIMIT_USD'),
    };
  }
}

// ── Утилиты ─────────────────────────────────────────────────────────────────
// ВНИМАНИЕ: границы суток считаются в часовом поясе, который согласован с отчётностью.
// UTC-полночь и локальная полночь дают разные суммы — расхождение всплывёт при разборе счёта.
function startOfDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function numEnv(k: string): number | undefined {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}
const round = (n: number) => Number(n.toFixed(6));
const share = (spent: number, limit?: number) => (limit ? Number((spent / limit).toFixed(3)) : null);
