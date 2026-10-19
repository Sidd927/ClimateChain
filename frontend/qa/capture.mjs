// Capture full-page screenshots of the running app at several viewports.
// Usage: node qa/capture.mjs <label> [baseUrl]   (writes ../docs/design/screenshots/<label>/)
// Uses the locally installed Google Chrome (channel "chrome"); no browser download needed.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const label = process.argv[2] ?? "current";
const base = process.argv[3] ?? "http://127.0.0.1:5173";
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "..", "docs", "design", "screenshots", label);
mkdirSync(out, { recursive: true });

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 640 },
];
const routes = (process.env.ROUTES ?? "/,/overview,/claims,/claims/new,/claims/1,/claims/2,/verify,/evidence").split(",");

const browser = await chromium.launch({ channel: "chrome" });
const report = [];
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, reducedMotion: process.env.REDUCED ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const r of routes) {
    const res = await page.goto(base + r, { waitUntil: "networkidle" });
    await page.waitForTimeout(1600); // let entrance motion settle
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      h1: [...document.querySelectorAll("h1")].map((h) => h.textContent?.trim()).slice(0, 2),
    }));
    const file = `${vp.name}${r === "/" ? "_home" : r.replaceAll("/", "_")}.png`;
    await page.screenshot({ path: join(out, file), fullPage: true });
    report.push({ viewport: vp.name, route: r, status: res?.status(), overflowX: metrics.scrollWidth > metrics.clientWidth, scrollWidth: metrics.scrollWidth, clientWidth: metrics.clientWidth, h1: metrics.h1, file });
  }
  report.push({ viewport: vp.name, consoleErrors: errors });
  await ctx.close();
}
await browser.close();
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
for (const r of report) {
  if (r.route) console.log(`${r.viewport.padEnd(13)} ${r.route.padEnd(12)} overflowX=${r.overflowX ? "YES " + r.scrollWidth + ">" + r.clientWidth : "no"}  h1=${JSON.stringify(r.h1)}`);
  else if (r.consoleErrors.length) console.log(`${r.viewport}: console errors: ${r.consoleErrors.slice(0, 3).join(" | ")}`);
}
