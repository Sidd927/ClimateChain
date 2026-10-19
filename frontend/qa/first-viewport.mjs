// First-viewport captures (what a visitor sees before scrolling): node qa/_fv.mjs <path> <out-prefix> [reduced]
import { chromium } from "@playwright/test";
const [path, prefix, reduced] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
for (const vp of [[1440, 900], [1280, 800], [768, 1024], [390, 844], [320, 640]]) {
  const p = await b.newPage({ viewport: { width: vp[0], height: vp[1] }, reducedMotion: reduced ? "reduce" : "no-preference" });
  await p.goto("http://127.0.0.1:5173" + path); await p.waitForTimeout(reduced ? 900 : 6000);
  await p.screenshot({ path: `${prefix}-${vp[0]}.png` });
  await p.close();
}
await b.close();
