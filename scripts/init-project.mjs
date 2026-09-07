#!/usr/bin/env node
/**
 * Разворачивает шаблон под новый проект: заменяет плейсхолдеры во всём репозитории.
 *
 *   node scripts/init-project.mjs
 *   node scripts/init-project.mjs --name "Acme Portal" --slug acme --domain acme.ru
 *   node scripts/init-project.mjs --name "Acme Portal" --dry-run
 *
 * Плейсхолдеры:
 *   __APP_NAME__    человекочитаемое имя      → "Acme Portal"
 *   __APP_SLUG__    kebab-case идентификатор  → "acme-portal" (имена БД, образов, пакетов)
 *   __APP_DOMAIN__  домен                     → "acme-portal.local"
 *
 * Скрипт идемпотентен: повторный запуск ничего не найдёт и не сломает.
 * Запускать ОДИН раз сразу после клонирования шаблона, до первого коммита проекта.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { stdin, stdout } from "node:process";

const SELF_PATH = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(SELF_PATH));

/** Каталоги, куда не заходим: сборка, зависимости, история. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  "playwright-report",
  "test-results",
]);

/** Расширения, в которых ищем плейсхолдеры. */
const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".prisma", ".sql", ".md", ".mdx",
  ".yml", ".yaml", ".conf", ".css", ".html",
  ".ps1", ".sh", ".example", ".txt",
]);

/** Файлы без расширения, которые всё равно проверяем. */
const EXTRA_FILES = new Set(["Dockerfile", ".env", ".env.example", ".gitignore"]);

const PLACEHOLDERS = ["__APP_NAME__", "__APP_SLUG__", "__APP_DOMAIN__"];

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--name") args.name = argv[++i];
    else if (arg === "--slug") args.slug = argv[++i];
    else if (arg === "--domain") args.domain = argv[++i];
  }
  return args;
}

function toSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasTextExtension(fileName) {
  if (EXTRA_FILES.has(fileName)) return true;
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return false;
  return TEXT_EXTENSIONS.has(fileName.slice(dotIndex));
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      yield* walk(fullPath);
      continue;
    }

    if (hasTextExtension(entry)) yield fullPath;
  }
}

async function prompt(question, fallback) {
  const rl = createInterface({ input: stdin, output: stdout });
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  rl.close();
  return answer || fallback || "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const name = args.name || (await prompt("Название проекта (например, Acme Portal)"));
  if (!name) {
    console.error("Название обязательно.");
    process.exit(1);
  }

  const slug = args.slug || (await prompt("Slug (латиница, kebab-case)", toSlug(name)));
  const domain = args.domain || (await prompt("Домен", `${slug}.local`));

  const replacements = {
    __APP_NAME__: name,
    __APP_SLUG__: slug,
    __APP_DOMAIN__: domain,
  };

  console.log("\nПодстановка:");
  for (const [key, value] of Object.entries(replacements)) {
    console.log(`  ${key.padEnd(16)} → ${value}`);
  }
  console.log("");

  let changedFiles = 0;
  let totalReplacements = 0;

  for (const filePath of walk(ROOT)) {
    // Себя не трогаем: иначе описание плейсхолдеров в этом файле подменится
    // значениями и повторный запуск потеряет смысл.
    if (filePath === SELF_PATH) continue;

    let content;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      continue; // бинарник с текстовым расширением — пропускаем
    }

    if (!PLACEHOLDERS.some((p) => content.includes(p))) continue;

    let updated = content;
    let fileReplacements = 0;
    for (const [placeholder, value] of Object.entries(replacements)) {
      const matches = updated.split(placeholder).length - 1;
      if (matches > 0) {
        updated = updated.split(placeholder).join(value);
        fileReplacements += matches;
      }
    }

    changedFiles++;
    totalReplacements += fileReplacements;
    console.log(`  ${relative(ROOT, filePath)} (${fileReplacements})`);

    if (!args.dryRun) writeFileSync(filePath, updated, "utf8");
  }

  if (changedFiles === 0) {
    console.log("Плейсхолдеров не найдено — шаблон уже развёрнут.");
    return;
  }

  console.log(
    `\n${args.dryRun ? "[dry-run] " : ""}Файлов: ${changedFiles}, замен: ${totalReplacements}`,
  );

  if (args.dryRun) return;

  console.log(`
Дальше:
  1. cp .env.example .env  &&  cp backend/.env.example backend/.env  &&  cp frontend/.env.example frontend/.env
  2. cd backend && npm run gen-jwt   → вставить в JWT_SECRET
  3. openssl rand -hex 32            → вставить в CRYPTO_KEY
  4. Придумать пароль для DATABASE_RUNTIME_URL (роль приложения) и вписать его
     в backend/.env и в RUNTIME_DB_PASSWORD в корневом .env
  5. docker compose -f docker-compose.local.yml up -d postgres redis
  6. cd backend && npm ci
     npm run db:migrate:deploy
     npm run db:runtime-role        # роль без BYPASSRLS — без неё RLS не защищает
     npm run db:seed:dev
  7. npm run up  (из корня), затем npm run smoke — проверить, что всё живо
  8. Удалите этот скрипт и раздел «Развернуть шаблон» из README.
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
