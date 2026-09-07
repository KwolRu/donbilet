#!/usr/bin/env node
/**
 * Раскладывает скиллы по каталогам агентов согласно `.claude/skills-manifest.yaml`.
 *
 *   npm run skills:sync
 *   npm run skills:sync -- --dry-run
 *
 * Канонический источник — всегда `.claude/skills/<name>`. Копии в `.codex` и
 * `.gemini` перезаписываются: правки в них потеряются, это осознанно. Один
 * канон вместо трёх расходящихся редакций.
 *
 * Скиллы, у которых в `sync` только `.claude`, не копируются никуда.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = join(ROOT, ".claude", "skills-manifest.yaml");

const dryRun = process.argv.includes("--dry-run");

/** Из манифеста нужны только name и sync — разбираем построчно. */
function readSkills(text) {
  const skills = [];
  let inSkills = false;
  let current = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    if (/^skills:\s*$/.test(line)) {
      inSkills = true;
      continue;
    }
    if (/^\w+:/.test(line) && !line.startsWith(" ")) {
      inSkills = false;
      current = null;
      continue;
    }
    if (!inSkills) continue;

    const start = line.match(/^\s{2}-\s+name:\s*(.+)$/);
    if (start) {
      current = { name: start[1].trim(), sync: [] };
      skills.push(current);
      continue;
    }

    const sync = line.match(/^\s{4}sync:\s*\[(.*)\]\s*$/);
    if (sync && current) {
      current.sync = sync[1]
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }

  return skills;
}

function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error("Не найден .claude/skills-manifest.yaml");
    process.exit(1);
  }

  const skills = readSkills(readFileSync(MANIFEST_PATH, "utf8"));
  let copied = 0;
  let skipped = 0;

  for (const skill of skills) {
    const source = join(ROOT, ".claude", "skills", skill.name);

    if (!existsSync(source)) {
      console.log(`  ⚠ ${skill.name}: нет источника, пропуск`);
      skipped++;
      continue;
    }

    const targets = (skill.sync || []).filter((t) => t !== ".claude");
    if (targets.length === 0) continue;

    for (const target of targets) {
      const destination = join(ROOT, target, "skills", skill.name);
      console.log(`  ${dryRun ? "[dry-run] " : ""}${skill.name} → ${target}/skills`);

      if (dryRun) continue;

      // Удаляем перед копированием: иначе файлы, удалённые в каноне,
      // остаются в копии и продолжают вводить агента в заблуждение.
      rmSync(destination, { recursive: true, force: true });
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(source, destination, { recursive: true });
      copied++;
    }
  }

  console.log(
    `\n${dryRun ? "[dry-run] " : ""}Скопировано: ${copied}${skipped ? `, пропущено: ${skipped}` : ""}`,
  );
  console.log("Проверка: npm run skills:check");
}

main();
