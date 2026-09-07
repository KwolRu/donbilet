#!/usr/bin/env node
/**
 * Валидатор архитектурных инвариантов (platform-architecture + ai-layer-architecture).
 *
 * Статический скан репозитория. Ловит нарушения, которые дёшево поймать текстом и дорого —
 * на ревью: физические model ID в коде, прямые вызовы LLM-SDK мимо шлюза, доступ агента к
 * бизнес-БД, доверие входящим tenant-заголовкам, секреты в репозитории, дубли контрактов,
 * правку сгенерированных файлов, запросы без tenant-фильтра.
 *
 * ЗАПУСК:
 *   node check-invariants.mjs                      # текстовый отчёт по текущей директории
 *   node check-invariants.mjs --root ./backend     # другой корень
 *   node check-invariants.mjs --json               # машинный вывод (для CI)
 *   node check-invariants.mjs --only I-3,I-5       # только выбранные правила
 *   node check-invariants.mjs --strict             # warning тоже роняет прогон
 *
 * КОНФИГУРАЦИЯ (необязательна): `.invariants.json` в корне —
 *   {
 *     "tenantField": "workspaceId",
 *     "gatewayDirs": ["microservices/gateway"],
 *     "aiFacadeFiles": ["mastra-runtime.ts", "runtime-facade.ts"],
 *     "secretsLoaderFiles": ["ai-secrets.ts", "vault-client.ts"],
 *     "contractsDir": "microservices/shared/src",
 *     "generatedFiles": ["prisma/schema.prisma"],
 *     "ignore": ["**\/legacy\/**"]
 *   }
 *
 * ПОДАВЛЕНИЕ: строка с комментарием `invariant-ok: <причина>` игнорируется.
 * Причина обязательна — молчаливое подавление ничем не лучше нарушения.
 *
 * ЗАВЕДОМО ЭВРИСТИКА. Скрипт не заменяет ревью: он ловит массовые механические нарушения.
 * False positive подавляется комментарием; false negative — повод дописать правило.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, basename } from 'node:path';

// ─────────────────────────── аргументы и конфиг ───────────────────────────

const argv = process.argv.slice(2);
// Поддерживаются обе формы: `--root=path` и `--root path`.
const arg = (n, d) => {
  const eq = argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

const ROOT = String(arg('root', '.'));
const AS_JSON = !!arg('json', false);
const STRICT = !!arg('strict', false);
const ONLY = arg('only', null) ? String(arg('only')).split(',').map((s) => s.trim()) : null;

const cfgPath = join(ROOT, '.invariants.json');
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};

const CFG = {
  tenantField: cfg.tenantField ?? 'workspaceId',
  gatewayDirs: cfg.gatewayDirs ?? ['gateway'],
  aiFacadeFiles: cfg.aiFacadeFiles ?? ['mastra-runtime.ts', 'runtime-facade.ts', 'llm-gateway.ts'],
  secretsLoaderFiles: cfg.secretsLoaderFiles ?? ['ai-secrets.ts', 'vault-client.ts', 'secrets.ts'],
  contractsDir: cfg.contractsDir ?? 'shared',
  generatedFiles: cfg.generatedFiles ?? ['prisma/schema.prisma'],
  /** Платформенные (не тенантные) модели — не шумят в I-2. */
  platformModels: (cfg.platformModels ?? []).map((s) => s.toLowerCase()),
  ignore: cfg.ignore ?? [],
};

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo',
  'generated', '.venv', '__pycache__', 'vendor',
]);

const CODE_EXT = /\.(ts|tsx|js|mjs|cjs|jsx)$/;

// ─────────────────────────── обход файлов ───────────────────────────

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walk(ROOT).filter((f) => !CFG.ignore.some((p) => f.includes(p.replace(/\*/g, ''))));
const codeFiles = allFiles.filter((f) => CODE_EXT.test(f));

const rel = (f) => relative(ROOT, f).split(sep).join('/');
const isTest = (f) =>
  /\.(spec|test)\.[tj]sx?$/.test(f) || /(^|\/)(test|tests|__tests__|e2e)\//.test(rel(f));
/** Фикстуры и golden-датасеты содержат НАМЕРЕННО «плохие» значения — их не проверяем. */
const isFixture = (f) => /(golden|fixture|fixtures|mock|mocks|sample|seed-data)/i.test(rel(f));
const isComment = (line) => /^\s*(\/\/|\*|\/\*|#)/.test(line);
const inDirs = (f, dirs) => dirs.some((d) => rel(f).includes(`${d}/`) || rel(f).includes(`/${d}/`));
const isFacade = (f) => CFG.aiFacadeFiles.includes(basename(f));

// ─────────────────────────── находки ───────────────────────────

const findings = [];
const report = (rule, severity, file, line, text, hint) =>
  findings.push({ rule, severity, file: rel(file), line, text: text.trim().slice(0, 160), hint });

const enabled = (rule) => !ONLY || ONLY.includes(rule);

/** Построчный скан с учётом подавления `invariant-ok:`. */
function scan(files, fn) {
  for (const f of files) {
    let src;
    try {
      src = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const lines = src.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/invariant-ok\s*:/.test(line)) return;
      fn(f, line, i + 1, lines, src);
    });
  }
}

// ═══════════════ I-3/AI-1. Физические model ID в коде ═══════════════
// Бизнес-код обязан знать только логический алиас.
const PHYSICAL_MODEL = /['"`](?:openrouter\/|openai\/|anthropic\/|google\/|deepseek\/|qwen\/|meta-llama\/)?(?:gpt-[\w.]+|claude-[\w.-]+|gemini-[\w.-]+|deepseek-[\w.-]+|llama-?[\d]|mistral-[\w.-]+|o[1-4]-[\w]+)['"`]/i;

if (enabled('AI-1'))
  scan(codeFiles, (f, line, n) => {
    // Конфиг шлюза и его тесты — единственное легальное место.
    if (/litellm|gateway-config|models\.config/i.test(rel(f))) return;
    if (isTest(f)) return;
    if (PHYSICAL_MODEL.test(line)) {
      report('AI-1', 'error', f, n, line,
        'Физический model ID в коде. Использовать логический алиас шлюза; физический ID — только в конфиге шлюза.');
    }
  });

// ═══════════════ AI-2. Прямой вызов LLM-SDK мимо шлюза ═══════════════
const LLM_SDK = /from\s+['"](openai|@anthropic-ai\/[\w-]+|@google\/gen(erative)?ai|cohere-ai|@mistralai\/[\w-]+|ollama)['"]/;

if (enabled('AI-2'))
  scan(codeFiles, (f, line, n) => {
    if (isFacade(f) || isTest(f)) return;
    if (LLM_SDK.test(line)) {
      report('AI-2', 'error', f, n, line,
        'Прямой импорт provider-SDK. Все вызовы модели (включая эмбеддинги) — через шлюз.');
    }
  });

// ═══════════════ AI-3. Фреймворк агента протёк в домен ═══════════════
const AGENT_FRAMEWORK = /from\s+['"](@mastra\/[\w/-]+|langchain[\w/-]*|@langchain\/[\w/-]+|llamaindex|@ai-sdk\/[\w-]+)['"]/;

if (enabled('AI-3'))
  scan(codeFiles, (f, line, n) => {
    if (isFacade(f) || isTest(f)) return;
    if (AGENT_FRAMEWORK.test(line)) {
      report('AI-3', 'error', f, n, line,
        `Импорт фреймворка агента вне фасада (${CFG.aiFacadeFiles.join(', ')}). Домен работает с ToolDescriptor.`);
    }
  });

// ═══════════════ AI-4. Агент ходит в бизнес-БД напрямую ═══════════════
// Признак файла-инструмента АГЕНТА — объявление ToolDescriptor, а не имя файла: сервис-
// ВЛАДЕЛЕЦ данных (governed endpoint) обязан ходить в ORM, и это не нарушение.
if (enabled('AI-4'))
  scan(codeFiles, (f, line, n, lines, src) => {
    // Файл должен СОЗДАВАТЬ ToolDescriptor, а не просто упоминать тип.
    if (isTest(f) || !/\)\s*:\s*ToolDescriptor\b|:\s*ToolDescriptor\s*=/.test(src)) return;
    if (/\b(prisma|db|knex|drizzle)\s*\.\s*\w+\s*\.\s*(find|create|update|delete|upsert|query)/i.test(line)) {
      report('AI-4', 'error', f, n, line,
        'Инструмент агента обращается к ORM напрямую. Путь: tool → governed endpoint → политика → владелец данных.');
    }
  });

// ═══════════════ I-1. Доверие входящему tenant-заголовку ═══════════════
const TENANT_HEADER = /headers\s*\[\s*['"]x-(workspace|tenant|school)-(id|slug)['"]\s*\]|@Headers\(\s*['"]x-(workspace|tenant|school)-(id|slug)['"]/i;

if (enabled('I-1'))
  scan(codeFiles, (f, line, n, lines) => {
    if (isTest(f)) return;
    if (!TENANT_HEADER.test(line)) return;
    // ЗАПИСЬ в заголовок (затирание или простановка из проверенного claim'а) — легальна.
    // Нарушение — ЧТЕНИЕ входящего значения как источника истины.
    if (/headers\s*\[[^\]]+\]\s*=/.test(line)) return;
    if (/delete\s|=\s*undefined|=\s*''/.test(line)) return;
    // Файл сам верифицирует токен — значит заголовок используется как подсказка, не как истина.
    const around = lines.slice(Math.max(0, n - 6), n + 6).join('\n');
    if (/\b(verify|jwtVerify|validateToken|claims|jwks)\b/i.test(around)) return;
    report('I-1', 'error', f, n, line,
      'Tenant читается из входящего заголовка без верификации. Источник — проверенный claim токена. ' +
      'Заголовок, проставленный шлюзом, безопасен ТОЛЬКО если сервис недостижим напрямую — это надо доказать.');
  });

// ═══════════════ I-2. Запрос к tenant-данным без фильтра ═══════════════
if (enabled('I-2'))
  scan(codeFiles, (f, line, n, lines) => {
    if (isTest(f)) return;
    const m = line.match(/\b(prisma|this\.prisma|tx|db)\s*\.\s*(\w+)\s*\.\s*(findMany|findFirst|updateMany|deleteMany|aggregate|count)\s*\(/);
    if (!m) return;
    if (CFG.platformModels.includes(m[2].toLowerCase())) return; // платформенная таблица без tenant
    // Смотрим блок вызова (до 12 строк) на наличие tenant-поля.
    const block = lines.slice(n - 1, n + 11).join('\n');
    const closes = block.indexOf('});');
    const scope = closes > -1 ? block.slice(0, closes) : block;
    if (new RegExp(`\\b${CFG.tenantField}\\b`, 'i').test(scope)) return;
    // Платформенные таблицы без tenant — частый легальный случай, поэтому warning.
    report('I-2', 'warning', f, n, line,
      `Запрос ${m[2]}.${m[3]} без явного фильтра по ${CFG.tenantField}. Проверить: платформенная таблица или пропущенный фильтр.`);
  });

// ═══════════════ I-5. Секреты в репозитории ═══════════════
const SECRET_LITERAL = [
  /\b(sk-[A-Za-z0-9_-]{16,})/,
  /\b(sk-or-v1-[A-Za-z0-9]{16,})/,
  /\bghp_[A-Za-z0-9]{20,}/,
  /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-+/]{20,}['"]/i,
];

if (enabled('I-5'))
  scan(allFiles.filter((f) => /\.(ts|js|mjs|json|ya?ml|env\.example|md)$/.test(f)), (f, line, n) => {
    if (/\.env\.example$/.test(f)) return;
    // Фикстуры и тесты содержат НАМЕРЕННО поддельные ключи (adversarial-кейсы).
    if (isFixture(f) || isTest(f)) return;
    if (/process\.env|os\.environ|\$\{|<REDACTED>|xxx|example|placeholder|your[-_]/i.test(line)) return;
    for (const re of SECRET_LITERAL) {
      if (re.test(line)) {
        report('I-5', 'error', f, n, '<строка скрыта: возможный секрет>',
          'Похоже на секрет в репозитории. Перенести в хранилище/окружение и ротировать ключ (он уже в истории git).');
        return;
      }
    }
  });

// ═══════════════ I-6. Бизнес-логика в шлюзе ═══════════════
if (enabled('I-6'))
  scan(codeFiles.filter((f) => inDirs(f, CFG.gatewayDirs)), (f, line, n) => {
    if (isTest(f)) return;
    if (/from\s+['"].*(prisma|@prisma\/client)/.test(line) || /\bprisma\s*\.\s*\w+\s*\.\s*(find|create|update|delete)/.test(line)) {
      report('I-6', 'error', f, n, line,
        'Шлюз обращается к БД. Шлюз только маршрутизирует; доменные операции — в доменном сервисе.');
    }
  });

// ═══════════════ I-7. Дубли контрактов вне общего модуля ═══════════════
if (enabled('I-7')) {
  const protos = allFiles.filter((f) => f.endsWith('.proto'));
  const outside = protos.filter((f) => !rel(f).includes(`${CFG.contractsDir}/`));
  for (const f of outside) {
    report('I-7', 'error', f, 1, basename(f),
      `Контракт вне общего модуля (${CFG.contractsDir}). Копии контрактов расходятся молча.`);
  }
}

// ═══════════════ I-9. Правка генерируемого файла ═══════════════
if (enabled('I-9'))
  for (const g of CFG.generatedFiles) {
    const p = join(ROOT, g);
    if (!existsSync(p)) continue;
    const head = readFileSync(p, 'utf8').split(/\r?\n/).slice(0, 8).join('\n');
    if (!/(do not edit|не редакт|generated|автогенер)/i.test(head)) {
      report('I-9', 'warning', p, 1, g,
        'Генерируемый файл без предупреждающего заголовка — его будут править руками. Добавить «НЕ РЕДАКТИРОВАТЬ».');
    }
  }

// ═══════════════ AI-5. Промпт в коде вместо реестра ═══════════════
// Консервативно: только ДЛИННЫЙ строковый литерал с признаками системной инструкции.
// Комментарии и seed-файлы промптов (легальное место для дефолтов) не считаются.
// `\b` не работает с кириллицей — граница слова задаётся явно.
const SYSTEM_PROMPT_HINT = /(?:^|[^а-яёА-ЯЁ])(Ты\s+[а-яё]|Твоя\s+задача|Ты\s+—)|You\s+are\s+an?\s|Your\s+task\s+is/;

if (enabled('AI-5'))
  scan(codeFiles, (f, line, n) => {
    if (isTest(f) || isComment(line) || isFixture(f)) return;
    // Seed-значения промптов легально живут в constants/seed/bootstrap — это дефолты
    // для посева реестра, а не рантайм-источник.
    if (/(constants|seed|defaults|bootstrap)/i.test(basename(f))) return;
    if (!/['"`]/.test(line) || line.trim().length < 60) return;
    if (!SYSTEM_PROMPT_HINT.test(line)) return;
    report('AI-5', 'warning', f, n, line,
      'Похоже на системный промпт в коде. Промпты — версионированные записи реестра, иначе правка = деплой.');
  });

// ═══════════════ AI-6. Журнал пишет алиас вместо физической модели ═══════════════
if (enabled('AI-6'))
  scan(codeFiles, (f, line, n) => {
    if (isTest(f)) return;
    if (/\bmodel\s*:\s*modelAlias\b/.test(line)) {
      report('AI-6', 'error', f, n, line,
        'В журнал пишется алиас вместо физической модели. После fallback станет неизвестно, кто ответил.');
    }
  });

// ═══════════════ AI-7. Телеметрия вызова в переменной модуля ═══════════════
if (enabled('AI-7'))
  scan(codeFiles.filter((f) => isFacade(f)), (f, line, n) => {
    if (/^\s*let\s+(last|current)?(physical)?[Mm]odel\b|^\s*let\s+lastCost\b/.test(line)) {
      report('AI-7', 'error', f, n, line,
        'Телеметрия вызова в переменной модуля: параллельные запросы перепутают атрибуцию. Использовать AsyncLocalStorage.');
    }
  });

// ═══════════════ вывод ═══════════════

const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warning');

if (AS_JSON) {
  console.log(JSON.stringify({
    root: ROOT,
    scannedFiles: codeFiles.length,
    summary: { errors: errors.length, warnings: warnings.length },
    findings,
  }, null, 2));
} else {
  const RULES = {
    'I-1': 'tenant из проверенного claim\'а',
    'I-2': 'фильтр по tenant в каждом запросе',
    'I-5': 'секреты только из хранилища',
    'I-6': 'шлюз только маршрутизирует',
    'I-7': 'контракты в одном месте',
    'I-9': 'генерируемое не правится руками',
    'AI-1': 'только логические алиасы моделей',
    'AI-2': 'нет вызовов LLM мимо шлюза',
    'AI-3': 'фреймворк агента за фасадом',
    'AI-4': 'агент не ходит в бизнес-БД',
    'AI-5': 'промпты в реестре, не в коде',
    'AI-6': 'журнал хранит физическую модель',
    'AI-7': 'телеметрия в AsyncLocalStorage',
  };
  console.log(`\nПроверка инвариантов: ${codeFiles.length} файлов в ${ROOT}\n`);
  if (!findings.length) {
    console.log('  Нарушений не найдено.\n');
  } else {
    const byRule = findings.reduce((a, f) => ((a[f.rule] ??= []).push(f), a), {});
    for (const [rule, list] of Object.entries(byRule)) {
      const sev = list.some((f) => f.severity === 'error') ? 'ERROR  ' : 'WARNING';
      console.log(`${sev} ${rule} — ${RULES[rule] ?? ''} (${list.length})`);
      for (const f of list.slice(0, 12)) {
        console.log(`   ${f.file}:${f.line}  ${f.text}`);
      }
      if (list.length > 12) console.log(`   … ещё ${list.length - 12}`);
      console.log(`   → ${list[0].hint}\n`);
    }
  }
  console.log(`Итого: ${errors.length} error, ${warnings.length} warning`);
  console.log('Подавление ложного срабатывания: комментарий `invariant-ok: <причина>` в строке.\n');
}

process.exit(errors.length > 0 || (STRICT && warnings.length > 0) ? 1 : 0);
