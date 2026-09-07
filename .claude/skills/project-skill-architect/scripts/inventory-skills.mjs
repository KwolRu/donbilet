#!/usr/bin/env node
/**
 * Инвентаризация агентских скиллов: глобальных и проектных.
 *
 * Даёт воспроизводимое evidence для отчёта project-skill-architect:
 *   - какие каталоги реально являются скиллами (есть SKILL.md), а какие нет;
 *   - качество frontmatter: name, description, заглушки и TODO;
 *   - побайтовые дубли между размещениями и одноимённые скиллы с разным содержимым;
 *   - битые ссылки на references/*;
 *   - пустые каталоги внутри скилла.
 *
 * ГАРАНТИИ:
 *   - только чтение: скрипт ничего не создаёт, не меняет и не удаляет;
 *   - содержимое файлов НЕ печатается — наружу идут только имена, длины и хеши;
 *   - файлы, способные содержать секреты (.env*, *.pem, *.key, *.p12, *.pfx),
 *     не читаются и не хешируются вовсе;
 *   - тяжёлые и генерируемые деревья исключаются (node_modules, dist, .git, coverage, …).
 *
 * ЗАПУСК:
 *   node inventory-skills.mjs --project <путь-к-репозиторию>
 *   node inventory-skills.mjs --project <путь> --json
 *   node inventory-skills.mjs --project <путь> --global <путь-к-глобальным-скиллам>
 *   node inventory-skills.mjs --self-test        # проверка чистых функций, без ФС
 *
 * Код выхода: 0 — проблем нет; 1 — есть находки (дубли, заглушки, битые ссылки); 2 — ошибка.
 */

import { readFileSync, readdirSync, statSync, existsSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename, relative, sep } from 'node:path';
import { homedir } from 'node:os';

// ─────────────────────────── аргументы ───────────────────────────

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const arg = (n, d) => {
  const eq = argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : d;
};

// Каталоги, которые никогда не являются частью скилла.
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.turbo',
  'coverage', '.cache', '__pycache__', '.venv', 'venv', 'vendor', 'target',
  'generated', '.pytest_cache', '.mypy_cache',
]);

// Файлы, которые не читаются и не хешируются: могут содержать секреты.
const SECRET_LIKE = /(^\.env($|\.)|\.(pem|key|p12|pfx|jks|keystore)$|(^|[._-])secrets?\.(json|ya?ml)$)/i;

// ─────────────────── чистые функции (покрыты --self-test) ───────────────────

/** Разобрать YAML-frontmatter поверхностно: нужны только name/description. */
export function parseFrontmatter(text) {
  if (typeof text !== 'string') return { present: false };
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { present: false };
  const body = m[1];
  const field = (key) => {
    // Поддерживаются четыре формы:
    //   key: value            — значение на той же строке
    //   key: "value"          — в кавычках
    //   key: >- \n  строки    — с индикатором свёртки
    //   key: \n  строки       — БЕЗ индикатора (обычный YAML-перенос) ← встречается
    //                           в сторонних скиллах и раньше терялся
    const re = new RegExp(`^${key}:[ \\t]*(>-|>|\\|-|\\|)?[ \\t]*(.*)$`, 'm');
    const hit = body.match(re);
    if (!hit) return undefined;

    const sameLine = hit[2].trim();
    const needsContinuation = !!hit[1] || sameLine === '';
    if (!needsContinuation) return sameLine.replace(/^["']|["']$/g, '');

    const idx = body.indexOf(hit[0]) + hit[0].length;
    const out = sameLine ? [sameLine] : [];
    for (const line of body.slice(idx).split(/\r?\n/)) {
      if (line.trim() === '') continue;
      if (/^\S/.test(line)) break; // следующий ключ верхнего уровня
      out.push(line.trim());
    }
    return out.join(' ').trim().replace(/^["']|["']$/g, '');
  };
  return { present: true, name: field('name'), description: field('description') };
}

/**
 * Признаки незавершённого каркаса.
 *
 * Код-фрагменты и inline-код вырезаются: скилл, который ОБЪЯСНЯЕТ, что `TODO` оставлять
 * нельзя, сам заглушкой не является. Без этого любой методический текст ловит сам себя.
 */
export function detectStubs(text) {
  if (typeof text !== 'string') return [];
  const prose = text
    .replace(/```[\s\S]*?```/g, ' ')   // блоки кода
    .replace(/`[^`\n]*`/g, ' ');       // inline-код
  const found = [];
  if (/\bTODO\b/.test(prose)) found.push('TODO');
  if (/\[TODO[: \]]/i.test(prose)) found.push('TODO-placeholder');
  if (/\bFIXME\b/.test(prose)) found.push('FIXME');
  if (/<[A-Z_]{3,}>/.test(prose)) found.push('angle-placeholder');
  return [...new Set(found)];
}

/**
 * Оценка description.
 *
 * `blocking` — то, из-за чего скилл не будет выбираться корректно (отсутствует, заглушка).
 * `advisory` — стилевые замечания (нет явного отрицания, длина). Для сторонних скиллов
 * это норма, поэтому такие замечания не роняют прогон.
 */
export function gradeDescription(desc) {
  const blocking = [];
  const advisory = [];
  const d = (desc ?? '').trim();
  if (!d) blocking.push('отсутствует');
  else if (/^\[?TODO/i.test(d)) blocking.push('заглушка');
  else {
    if (d.length < 60) blocking.push('слишком короткое: триггеров нет');
    if (d.length > 1600) advisory.push('очень длинное — триггер размывается');
    if (!hasNegation(d)) advisory.push('нет явного отрицания («НЕ использовать для…»)');
  }
  return { ok: blocking.length === 0, blocking, advisory, problems: [...blocking, ...advisory] };
}

/**
 * Явная граница применения в description.
 *
 * ВНИМАНИЕ: `\b` в JS работает по ASCII и с кириллицей не даёт границы слова
 * («…НЕ про evals» не совпадёт с `про\b`). Поэтому граница задаётся явным
 * lookahead «дальше не кириллическая буква».
 */
export function hasNegation(d) {
  if (typeof d !== 'string') return false;
  const ru = /(?:^|[^а-яёА-ЯЁ])(?:НЕ|не)\s+(?:использовать|применять|про|для|вызывать)(?![а-яёА-ЯЁ])/;
  const en = /\b(?:do not use|don't use|not for|do not apply)\b/i;
  return ru.test(d) || en.test(d);
}

/** Ссылки на локальные .md внутри скилла — для проверки битых путей. */
export function extractLocalMdLinks(text) {
  if (typeof text !== 'string') return [];
  const out = new Set();
  // markdown-ссылки и инлайн-код вида `references/foo.md`
  for (const m of text.matchAll(/\]\(([^)]+\.md)\)/g)) out.add(m[1]);
  for (const m of text.matchAll(/`((?:references|assets|scripts)\/[^`]+\.md)`/g)) out.add(m[1]);
  return [...out].filter((p) => !/^https?:|^#|^\//.test(p));
}

// ─────────────────────────── файловая часть ───────────────────────────

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => {
      if (SKIP_DIRS.has(e.name)) return false;
      if (e.isDirectory()) return true;
      // junction/symlink на каталог — тоже скилл
      if (e.isSymbolicLink()) {
        try {
          return statSync(join(dir, e.name)).isDirectory();
        } catch {
          return false;
        }
      }
      return false;
    })
    .map((e) => join(dir, e.name));
}

function walkFiles(dir, out = [], depth = 0) {
  if (depth > 8) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    let isDir = e.isDirectory();
    if (e.isSymbolicLink()) {
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        continue;
      }
    }
    if (isDir) walkFiles(full, out, depth + 1);
    else out.push(full);
  }
  return out;
}

function emptyDirs(root) {
  const out = [];
  const visit = (dir, depth = 0) => {
    if (depth > 4) return;
    for (const d of listDirs(dir)) {
      const files = walkFiles(d);
      if (files.length === 0) out.push(relative(root, d).split(sep).join('/'));
      else visit(d, depth + 1);
    }
  };
  visit(root);
  return out;
}

function hashFile(path) {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

/** Собрать сведения об одном каталоге-кандидате. */
function inspectSkill(dir, location) {
  const name = basename(dir);
  const skillMd = join(dir, 'SKILL.md');
  const isSkill = existsSync(skillMd);

  const files = walkFiles(dir).filter((f) => !SECRET_LIKE.test(basename(f)));
  const skippedSecretLike = walkFiles(dir).length - files.length;

  const info = {
    name,
    location,
    path: dir,
    isSkill,
    isLink: safeIsLink(dir),
    fileCount: files.length,
    skippedSecretLike,
    frontmatter: { present: false },
    descriptionGrade: null,
    stubs: [],
    skillMdLines: 0,
    brokenLinks: [],
    emptyDirs: emptyDirs(dir),
    contentHash: null,
    skillMdHash: null,
  };

  if (!isSkill) return info;

  let text = '';
  try {
    text = readFileSync(skillMd, 'utf8');
  } catch {
    return info;
  }

  info.skillMdLines = text.split(/\r?\n/).length;
  info.skillMdHash = hashFile(skillMd);
  info.frontmatter = parseFrontmatter(text);
  info.descriptionGrade = gradeDescription(info.frontmatter.description);
  info.stubs = detectStubs(text);

  // Битые ссылки: из SKILL.md и из самих references.
  const linkSources = [skillMd, ...files.filter((f) => f.endsWith('.md') && f !== skillMd)];
  const broken = new Set();
  for (const src of linkSources) {
    let t = '';
    try {
      t = readFileSync(src, 'utf8');
    } catch {
      continue;
    }
    for (const link of extractLocalMdLinks(t)) {
      const candidates = [join(dir, link), join(src, '..', link)];
      if (!candidates.some((c) => existsSync(c))) broken.add(`${basename(src)} → ${link}`);
    }
    if (src !== skillMd) info.stubs.push(...detectStubs(t));
  }
  info.stubs = [...new Set(info.stubs)];
  info.brokenLinks = [...broken];

  // Хеш содержимого каталога: имена + хеши, отсортировано. Содержимое не печатается.
  const parts = files
    .map((f) => `${relative(dir, f).split(sep).join('/')}:${hashFile(f)}`)
    .sort();
  info.contentHash = createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 16);
  return info;
}

function safeIsLink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

// ─────────────────────────── self-test ───────────────────────────

function selfTest() {
  const results = [];
  const check = (name, cond, detail = '') => results.push({ name, ok: !!cond, detail });

  const fm = parseFrontmatter('---\nname: demo\ndescription: >-\n  Первая строка.\n  Вторая строка.\n---\n# Тело\n');
  check('frontmatter: name', fm.name === 'demo', fm.name);
  check('frontmatter: многострочное description', /Первая строка\. Вторая строка\./.test(fm.description ?? ''), fm.description);

  const fm2 = parseFrontmatter('---\nname: q\ndescription: "Одной строкой"\n---\n');
  check('frontmatter: кавычки сняты', fm2.description === 'Одной строкой', fm2.description);

  // Перенос БЕЗ индикатора свёртки — так оформлены сторонние скиллы; раньше терялся.
  const fm3 = parseFrontmatter('---\nname: r\ndescription:\n  Строка один.\n  Строка два.\nlicense: MIT\n---\n');
  check('frontmatter: перенос без индикатора', fm3.description === 'Строка один. Строка два.', String(fm3.description));
  check('frontmatter: следующий ключ не залипает', !/MIT/.test(fm3.description ?? ''), String(fm3.description));

  check('frontmatter: отсутствует', parseFrontmatter('# Просто заголовок').present === false);
  check('frontmatter: не строка', parseFrontmatter(null).present === false);

  check('stubs: TODO найден', detectStubs('текст TODO текст').includes('TODO'));
  check('stubs: заглушка в скобках', detectStubs('description: "[TODO: describe]"').includes('TODO-placeholder'));
  check('stubs: чистый текст', detectStubs('обычный текст без меток').length === 0);
  // Методический текст, который ОБЪЯСНЯЕТ запрет на заглушки, сам заглушкой не является.
  check('stubs: inline-код не считается', detectStubs('не оставляй `TODO` в скиллах').length === 0);
  check('stubs: блок кода не считается', detectStubs('```\nTODO: пример\n```\nобычный текст').length === 0);

  check('description: пустое → блокирующее', gradeDescription('').blocking.includes('отсутствует'));
  check('description: заглушка → блокирующее', gradeDescription('[TODO: describe]').blocking.includes('заглушка'));
  check('description: короткое → блокирующее', gradeDescription('Помогает с бэкендом').blocking.length === 1);
  const noNeg = 'Подробный скилл про построение чего-то большого и сложного, который используется в самых разных ситуациях разработки.';
  check('description: без отрицания → замечание, не дефект', gradeDescription(noNeg).blocking.length === 0 && gradeDescription(noNeg).advisory.length === 1);

  const good = 'Сквозной паттерн добавления функциональности: схема, модуль, маршрут, фронт и приёмка. Использовать при добавлении фичи или эндпоинта. НЕ использовать для устройства AI-слоя.';
  check('description: хорошее проходит', gradeDescription(good).ok === true && gradeDescription(good).advisory.length === 0, JSON.stringify(gradeDescription(good).problems));

  check('negation: «НЕ про»', hasNegation('… НЕ про evals и guardrails'));
  check('negation: «Not for»', hasNegation('… Not for backend tasks'));
  check('negation: отсутствует', !hasNegation('Просто описание без границ'));

  const links = extractLocalMdLinks('см. [док](references/a.md) и `references/b.md`, ещё [внешн](https://x/y.md)');
  check('links: найдены локальные', links.includes('references/a.md') && links.includes('references/b.md'), links.join(','));
  check('links: внешние отброшены', !links.some((l) => l.startsWith('http')), links.join(','));

  check('secret-like: .env', SECRET_LIKE.test('.env.local'));
  check('secret-like: ключ', SECRET_LIKE.test('server.key'));
  check('secret-like: обычный файл', !SECRET_LIKE.test('SKILL.md'));

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.detail && !r.ok ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\nself-test: ${results.length - failed.length}/${results.length}`);
  return failed.length === 0 ? 0 : 1;
}

// ─────────────────────────── главный проход ───────────────────────────

function main() {
  if (flag('self-test')) process.exit(selfTest());

  const projectRoot = String(arg('project', process.cwd()));
  const projectSkills = String(arg('project-skills', join(projectRoot, '.claude', 'skills')));
  const globalSkills = String(arg('global', join(homedir(), '.claude', 'skills')));
  const asJson = flag('json');

  const scan = (root, location) =>
    listDirs(root).map((d) => inspectSkill(d, location));

  const globals = scan(globalSkills, 'global');
  const locals = scan(projectSkills, 'project');
  const all = [...globals, ...locals];

  const skills = all.filter((s) => s.isSkill);
  const notSkills = all.filter((s) => !s.isSkill);

  // Пересечения имён между размещениями.
  const byName = new Map();
  for (const s of skills) {
    if (!byName.has(s.name)) byName.set(s.name, []);
    byName.get(s.name).push(s);
  }
  const identicalDuplicates = [];
  const divergentDuplicates = [];
  for (const [name, list] of byName) {
    if (list.length < 2) continue;
    const hashes = new Set(list.map((s) => s.contentHash));
    (hashes.size === 1 ? identicalDuplicates : divergentDuplicates).push({
      name,
      locations: list.map((s) => ({ location: s.location, path: s.path, contentHash: s.contentHash })),
    });
  }

  // Разделение важно: стилевые замечания к сторонним скиллам не должны ронять прогон
  // и тонуть вперемешку с настоящими дефектами.
  const blocking = {
    stubs: skills.filter((s) => s.stubs.length),
    badDescription: skills.filter((s) => s.descriptionGrade && s.descriptionGrade.blocking.length),
    nameMismatch: skills.filter((s) => s.frontmatter.name && s.frontmatter.name !== s.name),
    brokenLinks: skills.filter((s) => s.brokenLinks.length),
    identicalDuplicates,
    divergentDuplicates,
  };
  const advisory = {
    weakDescription: skills.filter((s) => s.descriptionGrade && s.descriptionGrade.advisory.length),
    emptyDirs: skills.filter((s) => s.emptyDirs.length),
    oversized: skills.filter((s) => s.skillMdLines > 200),
    notSkills,
  };
  const findings = { blocking, advisory };

  if (asJson) {
    console.log(JSON.stringify({
      roots: { projectRoot, projectSkills, globalSkills },
      counts: { global: globals.filter((s) => s.isSkill).length, project: locals.filter((s) => s.isSkill).length },
      skills: skills.map(({ path, ...rest }) => ({ ...rest, path })),
      findings,
    }, null, 2));
  } else {
    const line = (s) =>
      `  ${s.name.padEnd(32)} ${String(s.fileCount).padStart(4)} файлов` +
      `${s.isLink ? '  [link]' : ''}${s.skillMdLines > 200 ? `  [SKILL.md ${s.skillMdLines} стр.]` : ''}`;

    console.log(`\nГлобальные скиллы: ${globalSkills}`);
    globals.filter((s) => s.isSkill).forEach((s) => console.log(line(s)));
    console.log(`\nПроектные скиллы: ${projectSkills}`);
    locals.filter((s) => s.isSkill).forEach((s) => console.log(line(s)));

    const section = (title, list, fmt) => {
      if (!list.length) return;
      console.log(`\n${title} (${list.length})`);
      list.forEach((x) => console.log(`  ${fmt(x)}`));
    };

    console.log('\n── ДЕФЕКТЫ ──────────────────────────────────────────────');
    section('Заглушки и TODO', blocking.stubs, (s) => `${s.location}: ${s.name} — ${s.stubs.join(', ')}`);
    section('Description непригоден', blocking.badDescription, (s) => `${s.location}: ${s.name} — ${s.descriptionGrade.blocking.join('; ')}`);
    section('name ≠ имя каталога', blocking.nameMismatch, (s) => `${s.location}: ${s.name} ← frontmatter "${s.frontmatter.name}"`);
    section('Битые ссылки', blocking.brokenLinks, (s) => `${s.location}: ${s.name} — ${s.brokenLinks.join(', ')}`);
    section('Побайтовые дубли (одинаковое имя и содержимое)', identicalDuplicates, (d) => `${d.name}: ${d.locations.map((l) => l.location).join(' = ')}`);
    section('Одноимённые, но РАЗНЫЕ', divergentDuplicates, (d) => `${d.name}: ${d.locations.map((l) => `${l.location}(${l.contentHash})`).join(' ≠ ')}`);
    if (!Object.values(blocking).some((v) => v.length)) console.log('  дефектов не найдено');

    console.log('\n── ЗАМЕЧАНИЯ (не роняют прогон) ─────────────────────────');
    section('Каталоги без SKILL.md (не скиллы)', advisory.notSkills, (s) => `${s.location}: ${s.name} — ${s.fileCount} файлов`);
    section('Description без явной границы применения', advisory.weakDescription, (s) => `${s.location}: ${s.name} — ${s.descriptionGrade.advisory.join('; ')}`);
    section('Пустые каталоги', advisory.emptyDirs, (s) => `${s.location}: ${s.name} — ${s.emptyDirs.join(', ')}`);
    section('SKILL.md длиннее 200 строк', advisory.oversized, (s) => `${s.location}: ${s.name} — ${s.skillMdLines} строк`);
    if (!Object.values(advisory).some((v) => v.length)) console.log('  замечаний нет');

    const count = (o) => Object.values(o).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
    console.log(`\nСкиллов: ${skills.length} (глобальных ${globals.filter((s) => s.isSkill).length}, проектных ${locals.filter((s) => s.isSkill).length}).`);
    console.log(`Дефектов: ${count(blocking)} · замечаний: ${count(advisory)}.`);
    console.log('Скрипт только читает; содержимое файлов не выводится.\n');
  }

  const hasBlocking = Object.values(blocking).some((v) => v.length > 0);
  process.exit(hasBlocking ? 1 : 0);
}

try {
  main();
} catch (e) {
  console.error(`inventory-skills: ${e.message}`);
  process.exit(2);
}
