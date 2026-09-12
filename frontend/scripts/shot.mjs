/**
 * Скриншот страницы для сверки с макетом.
 *
 *   node scripts/shot.mjs <url-path> <out.png> [width] [height] [--full]
 *
 * Примеры:
 *   node scripts/shot.mjs / shots/main.png 1920 1080 --full
 *   node scripts/shot.mjs / shots/header.png 1920 200
 *
 * Макет свёрстан под 1920 — снимаем в этой ширине, иначе сравнивать бессмысленно.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const [, , pathArg = "/", out = "shots/page.png", w = "1920", h = "1080"] = process.argv;
const fullPage = process.argv.includes("--full");
const base = process.env.BASE_URL || "http://localhost:3000";

await mkdir(dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 1,
});

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const res = await page.goto(base + pathArg, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(600); // добираем шрифты и ленивые картинки

// Секции появляются при прокрутке (Reveal) и картинки грузятся лениво.
// Без прохода по странице fullPage снимет их скрытыми.
await page.evaluate(async () => {
  const step = window.innerHeight / 2;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));
});

// --sel=<css> снимает один элемент — удобно сверять отдельную секцию с макетом.
const selArg = process.argv.find((a) => a.startsWith("--sel="));
if (selArg) {
  const el = page.locator(selArg.slice(6)).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: out });
} else {
  await page.screenshot({ path: out, fullPage });
}
await browser.close();

console.log(`${res?.status()} ${base}${pathArg} -> ${out}`);
if (errors.length) {
  console.log("\nОшибки в консоли:");
  for (const e of errors.slice(0, 10)) console.log("  " + e);
}
