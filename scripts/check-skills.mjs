#!/usr/bin/env node
/**
 * Проверяет портфель скиллов против `.claude/skills-manifest.yaml`.
 *
 *   npm run skills:check
 *
 * Что ловит:
 *   - скилл объявлен в манифесте, но каталога нет (или нет обязательных файлов);
 *   - каталог есть, а в манифесте не описан — «скилл-безбилетник»;
 *   - имя каталога разошлось с полем `name` в SKILL.md;
 *   - manual-скилл без `disable-model-invocation: true` — он будет висеть
 *     в контексте, хотя задумывался ручным;
 *   - копии в .codex/.gemini разошлись с каноном в .claude;
 *   - скилл из списка `excluded` вернулся в портфель.
 *
 * Код возврата 1, если есть ошибки (предупреждения не валят проверку).
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = join(ROOT, ".claude", "skills-manifest.yaml");

const errors = [];
const warnings = [];

/**
 * Минимальный парсер под формат этого манифеста: список объектов с плоскими
 * полями и списками. Полноценный YAML-парсер тянуть в корень репозитория
 * ради одного файла не стоит — но и произвольный YAML здесь не поддерживается.
 */
function parseManifest(text) {
  const skills = [];
  const excluded = [];
  let section = null;
  let current = null;
  let pendingKey = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    if (/^skills:\s*$/.test(line)) {
      section = "skills";
      current = null;
      continue;
    }
    if (/^excluded:\s*$/.test(line)) {
      section = "excluded";
      current = null;
      continue;
    }
    if (/^\w+:/.test(line) && !line.startsWith(" ")) {
      section = null;
      continue;
    }
    if (!section) continue;

    const itemStart = line.match(/^\s{2}-\s+(\w+):\s*(.*)$/);
    if (itemStart) {
      current = {};
      (section === "skills" ? skills : excluded).push(current);
      assign(current, itemStart[1], itemStart[2]);
      pendingKey = itemStart[2] === "" ? itemStart[1] : null;
      continue;
    }

    const field = line.match(/^\s{4}(\w+):\s*(.*)$/);
    if (field && current) {
      assign(current, field[1], field[2]);
      pendingKey = field[2] === "" || field[2] === ">-" ? field[1] : null;
      continue;
    }

    // Продолжение блочного скаляра (>-) или элемент списка на своей строке.
    const listItem = line.match(/^\s{6}-\s+(.*)$/);
    if (listItem && current && pendingKey) {
      current[pendingKey] = current[pendingKey] || [];
      current[pendingKey].push(stripQuotes(listItem[1]));
      continue;
    }
    if (current && pendingKey && /^\s{6}\S/.test(line)) {
      current[pendingKey] = `${current[pendingKey] || ""} ${line.trim()}`.trim();
    }
  }

  return { skills, excluded };
}

function assign(target, key, rawValue) {
  const value = rawValue.trim();
  if (value === "" || value === ">-") {
    target[key] = key === "files" || key === "sync" || key === "overlaps" ? [] : "";
    return;
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    target[key] = inner ? inner.split(",").map((v) => stripQuotes(v.trim())) : [];
    return;
  }
  target[key] = value === "true" ? true : value === "false" ? false : stripQuotes(value);
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

function readFrontmatter(skillDir) {
  const skillFile = join(skillDir, "SKILL.md");
  if (!existsSync(skillFile)) return null;

  const text = readFileSync(skillFile, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const front = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) front[kv[1]] = kv[2].trim();
  }
  return front;
}

function hashDir(dir) {
  const hash = createHash("sha256");
  const walk = (current) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      hash.update(entry);
      hash.update(readFileSync(full));
    }
  };
  walk(dir);
  return hash.digest("hex");
}

function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error("Не найден .claude/skills-manifest.yaml");
    process.exit(1);
  }

  const { skills, excluded } = parseManifest(readFileSync(MANIFEST_PATH, "utf8"));
  const declared = new Set(skills.map((s) => s.name));

  console.log(`Манифест: ${skills.length} скиллов, ${excluded.length} исключений\n`);

  for (const skill of skills) {
    const dir = join(ROOT, ".claude", "skills", skill.name);

    if (!existsSync(dir)) {
      const level = skill.required ? errors : warnings;
      level.push(`${skill.name}: каталога нет (.claude/skills/${skill.name})`);
      continue;
    }

    for (const file of skill.files || []) {
      if (!existsSync(join(dir, file))) {
        errors.push(`${skill.name}: отсутствует ${file}`);
      }
    }

    const front = readFrontmatter(dir);
    if (front === null) {
      errors.push(`${skill.name}: нет SKILL.md`);
      continue;
    }

    if (front.name && front.name !== skill.name) {
      errors.push(`${skill.name}: в SKILL.md name=${front.name} — расходится с каталогом`);
    }

    if (skill.mode === "manual" && front["disable-model-invocation"] !== "true") {
      errors.push(
        `${skill.name}: manual-скилл без disable-model-invocation: true — будет висеть в контексте`,
      );
    }

    if (skill.mode !== "manual" && front["disable-model-invocation"] === "true") {
      warnings.push(`${skill.name}: mode=${skill.mode}, но вызов моделью отключён`);
    }

    // Копии в других каталогах агентов должны совпадать с каноном.
    for (const target of skill.sync || []) {
      if (target === ".claude") continue;
      const copyDir = join(ROOT, target, "skills", skill.name);

      if (!existsSync(copyDir)) {
        errors.push(`${skill.name}: нет копии в ${target}/skills — запустите skills:sync`);
        continue;
      }
      if (hashDir(copyDir) !== hashDir(dir)) {
        errors.push(`${skill.name}: копия в ${target}/skills разошлась — запустите skills:sync`);
      }
    }
  }

  // Каталоги, которых нет в манифесте.
  const skillsRoot = join(ROOT, ".claude", "skills");
  if (existsSync(skillsRoot)) {
    for (const entry of readdirSync(skillsRoot)) {
      if (!statSync(join(skillsRoot, entry)).isDirectory()) continue;
      if (declared.has(entry)) continue;

      const excludedEntry = excluded.find((e) => e.name === entry);
      if (excludedEntry) {
        warnings.push(`${entry}: числится в excluded, но лежит в .claude/skills`);
      } else {
        warnings.push(`${entry}: не описан в манифесте (локальный скилл?)`);
      }
    }
  }

  for (const warning of warnings) console.log(`  ⚠ ${warning}`);
  for (const error of errors) console.log(`  ✘ ${error}`);

  if (errors.length === 0) {
    console.log(`\n✔ Портфель согласован${warnings.length ? ` (предупреждений: ${warnings.length})` : ""}`);
    return;
  }

  console.log(`\n${errors.length} ошибок, ${warnings.length} предупреждений`);
  process.exit(1);
}

main();
