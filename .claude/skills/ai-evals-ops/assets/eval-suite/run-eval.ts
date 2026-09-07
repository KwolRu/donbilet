/**
 * ШАБЛОН: eval-harness (CLI). Пишет evidence-JSON — доказательство прогона, а не «вроде ок».
 *
 * Режимы:
 *   fixtures — прогон evaluators на зафиксированных выходах. Бесплатно, в CI на каждый коммит.
 *              Проверяет САМИ EVALUATORS: ловят ли они нарушения.
 *   live     — прогон реального агента, оценка его вывода. Деньги + время. Перед релизом и по ночам.
 *
 * Запуск:
 *   npx ts-node run-eval.ts --mode=fixtures
 *   npx ts-node run-eval.ts --mode=live --workspace=<id> --limit=5 --out=audit/evidence/ai-eval.json
 *
 * АДАПТАЦИЯ: подставить вызов своей AI-задачи в runLive(); путь evidence — под свой репозиторий.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { GOLDEN_FIXTURES, LIVE_EVAL_INPUTS } from './golden';
import { scoreCase, type EvalCandidate, type EvalContext } from './evaluators';

interface CaseReport {
  id: string;
  kind: string;
  passed: boolean;
  score: number;
  /** Совпало ли ожидание «какой evaluator должен упасть». */
  expectationMet: boolean;
  evaluators: Array<{ name: string; pass: boolean; critical: boolean; detail: string }>;
  meta?: Record<string, unknown>;
}

interface Evidence {
  task: string;
  mode: 'fixtures' | 'live';
  startedAt: string;
  finishedAt: string;
  modelAlias?: string;
  physicalModels?: string[];
  promptVersion?: number;
  cases: CaseReport[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    avgScore: number;
    costUsd?: number;
    /** Провал прогона как такового (пустые данные, недостижимый сервис). */
    invalid?: string;
  };
}

const arg = (name: string, def?: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;

// ═══════════════════════════ FIXTURES ═══════════════════════════

function runFixtures(): Evidence {
  const startedAt = new Date().toISOString();

  // ПРАВИЛО ПУСТЫХ ДАННЫХ: прогон обязан падать, если проверять нечего.
  // «14/14» на пустой выборке — это 0/0, а не успех.
  if (GOLDEN_FIXTURES.length === 0) {
    throw new Error('eval: пустой golden-датасет — прогон недействителен');
  }

  const cases: CaseReport[] = GOLDEN_FIXTURES.map((g) => {
    const s = scoreCase(g.cand, g.ctx);
    const failedNames = s.evaluators.filter((e) => !e.pass).map((e) => e.name);

    // Совпадает ли ожидание. Для adversarial проверяем ИМЯ сработавшего evaluator'а:
    // кейс, упавший по другой причине, ничего не доказывает.
    const passMatches = s.passed === g.expectPass;
    const failMatches = !g.expectFail || failedNames.includes(g.expectFail);

    return {
      id: g.id,
      kind: g.kind,
      passed: s.passed,
      score: Number(s.score.toFixed(3)),
      expectationMet: passMatches && failMatches,
      evaluators: s.evaluators,
      meta: { expectPass: g.expectPass, expectFail: g.expectFail, actualFailed: failedNames },
    };
  });

  return finalize('fixtures', startedAt, cases);
}

// ═══════════════════════════ LIVE ═══════════════════════════

async function runLive(): Promise<Evidence> {
  const startedAt = new Date().toISOString();
  const workspaceId = arg('workspace');
  if (!workspaceId) throw new Error('eval live: требуется --workspace=<id>');

  // TODO: подставить реальную выборку сущностей проекта.
  const entities = await loadEntities(workspaceId, Number(arg('limit', '3')));

  // ПРАВИЛО ПУСТЫХ ДАННЫХ для live: нет сущностей — нет прогона.
  if (entities.length === 0) {
    throw new Error('eval live: не найдено ни одной сущности — прогон недействителен');
  }

  const cases: CaseReport[] = [];
  const physicalModels = new Set<string>();
  let costUsd = 0;
  let modelAlias: string | undefined;
  let promptVersion: number | undefined;

  for (const entity of entities) {
    for (const input of LIVE_EVAL_INPUTS) {
      // TODO: заменить на вызов своей AI-задачи (через фасад ExecuteTask).
      const res = await executeAiTask({
        taskType: 'FIRST_MESSAGE_GENERATION',
        workspaceId,
        // Идемпотентный ключ включает прогон — иначе повторный eval вернёт кэш и ничего не проверит.
        idempotencyKey: `eval:${startedAt}:${entity.id}:${input.id}`,
        input: { organizationId: entity.id, channel: input.channel, contextHint: input.contextHint },
      });

      modelAlias ??= res.modelAlias;
      promptVersion ??= res.promptVersion;
      if (res.physicalModel) physicalModels.add(res.physicalModel);
      costUsd += res.usage?.costUsd ?? 0;

      const cand: EvalCandidate = { message: res.result.message, channel: res.result.channel };
      const ctx: EvalContext = { orgName: entity.name, orgCity: entity.city, orgCategory: entity.category };
      const s = scoreCase(cand, ctx);

      cases.push({
        id: `${input.id}:${entity.id}`,
        kind: 'live',
        passed: s.passed,
        score: Number(s.score.toFixed(3)),
        expectationMet: s.passed, // для live ожидание = «должно проходить»
        evaluators: s.evaluators,
        meta: { executionId: res.executionId, physicalModel: res.physicalModel, reused: res.reused },
      });
    }
  }

  const ev = finalize('live', startedAt, cases);
  ev.modelAlias = modelAlias;
  ev.promptVersion = promptVersion;
  ev.physicalModels = [...physicalModels];
  ev.summary.costUsd = Number(costUsd.toFixed(6));
  return ev;
}

// ═══════════════════════════ ОБЩЕЕ ═══════════════════════════

function finalize(mode: 'fixtures' | 'live', startedAt: string, cases: CaseReport[]): Evidence {
  const passed = cases.filter((c) => c.expectationMet).length;
  const avgScore = cases.reduce((a, c) => a + c.score, 0) / Math.max(cases.length, 1);
  return {
    task: 'FIRST_MESSAGE_GENERATION',
    mode,
    startedAt,
    finishedAt: new Date().toISOString(),
    cases,
    summary: {
      total: cases.length,
      passed,
      failed: cases.length - passed,
      avgScore: Number(avgScore.toFixed(3)),
    },
  };
}

async function main() {
  const mode = (arg('mode', 'fixtures') as 'fixtures' | 'live');
  const evidence = mode === 'live' ? await runLive() : runFixtures();

  const out = arg('out');
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(evidence, null, 2), 'utf8');
  }

  const { total, passed, failed, avgScore } = evidence.summary;
  console.log(`[eval:${evidence.mode}] ${passed}/${total} ok, avgScore=${avgScore}` +
    (evidence.summary.costUsd !== undefined ? `, cost=$${evidence.summary.costUsd}` : ''));
  for (const c of evidence.cases.filter((c) => !c.expectationMet)) {
    console.log(`  FAIL ${c.id}: ${c.evaluators.filter((e) => !e.pass).map((e) => `${e.name}(${e.detail})`).join(', ')}`);
  }

  // Ненулевой код выхода — чтобы CI падал, а не «сообщал».
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`[eval] прогон недействителен: ${(e as Error).message}`);
  process.exit(2); // 2 = прогон не состоялся; отличать от 1 = есть провалившиеся кейсы
});

// ── Заглушки, которые надо заменить на проектные ─────────────────────────────
declare function loadEntities(workspaceId: string, limit: number): Promise<Array<{ id: string; name: string; city?: string; category?: string }>>;
declare function executeAiTask(req: any): Promise<any>;
