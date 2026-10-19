// Replays the demo film's beats (beats.mjs) against the real app without narration, and checks
// expected outcomes, console errors and failed requests. Same prerequisites as record.mjs:
//   fresh ledger (make reset; restart make api; do NOT seed), make web running.
//   Run: cd frontend && node qa/demo/validate.mjs
import { chromium } from "@playwright/test";
import { BEATS } from "./beats.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const API = process.env.ONCEONLY_API ?? "http://127.0.0.1:8000";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 810 } });
const page = await ctx.newPage();
const consoleErrors = [], pageErrors = [], failed = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`); });

const results = [];
for (const b of BEATS) {
  const t = Date.now();
  try {
    await b.act(page);
    results.push({ id: b.id, ok: true, url: page.url().replace(BASE, ""), ms: Date.now() - t });
  } catch (e) {
    results.push({ id: b.id, ok: false, url: page.url().replace(BASE, ""), error: String(e).split("\n")[0] });
    break;
  }
}
await browser.close();

// expected end state, read back from the API
const get = async (p) => (await fetch(API + p)).json();
const claims = await get("/api/claims");
const c1 = await get("/api/claims/1"), c2 = await get("/api/claims/2");
const checks = [
  ["two claims exist", claims.length === 2, claims.length],
  ["claim 1 is Northwind, anchored as ledger claim #1", c1.claimant?.startsWith("Northwind") && c1.status === "anchored" && c1.chain_claim_id === 1, `${c1.claimant} / ${c1.status} / #${c1.chain_claim_id}`],
  ["claim 2 is Helios, blocked, not on chain", c2.claimant?.startsWith("Helios") && c2.status === "blocked" && c2.chain_claim_id == null, `${c2.claimant} / ${c2.status} / #${c2.chain_claim_id}`],
  ["DUP-001 overlap is 896,315,001-896,319,559 (4,559 units) against OO-2026-0001", (() => { const o = c2.findings?.find((f) => f.rule_id === "DUP-001")?.evidence; return o?.overlap?.start === 896315001 && o?.overlap?.end === 896319559 && o?.overlap?.units === 4559 && o?.conflict?.claim_ref === "OO-2026-0001"; })(), JSON.stringify(c2.findings?.find((f) => f.rule_id === "DUP-001")?.evidence?.overlap)],
  ["contract rejection recorded: RangeOverlap(existing #1, 896315001, 896319559), mined with status 0", (() => { const e = c2.events?.find((x) => x.kind === "chain_rejected"); const r = e?.detail?.revert; return r?.error === "RangeOverlap" && r.args.existingClaimId === 1 && r.args.overlapStart === 896315001 && r.args.overlapEnd === 896319559 && e.detail.tx_status === 0 && !!e.tx_hash; })(), (() => { const e = c2.events?.find((x) => x.kind === "chain_rejected"); return e ? `${e.detail?.revert?.error} tx ${e.tx_hash?.slice(0, 12)}… block ${e.block_number}` : "no chain_rejected event"; })()],
  ["the only failed request is the contract's 409 rejection", failed.length === 1 && /^409 POST \/api\/claims\/2\/anchor/.test(failed[0].replace(API, "")), failed.join(" | ") || "none"],
  // Chrome logs every 4xx response as a console error; the contract's 409 is expected and asserted above
  ["no console errors besides the browser's log of that 409", consoleErrors.filter((m) => !/status of 409 \(Conflict\)/.test(m)).length === 0 && consoleErrors.length <= 1, consoleErrors.join(" | ") || "none"],
  ["no uncaught page errors", pageErrors.length === 0, pageErrors.join(" | ") || "none"],
];
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.id.padEnd(3)} ${r.url}${r.ok ? `  (${r.ms} ms)` : `  ${r.error}`}`);
console.log("");
for (const [name, ok, actual] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}  [actual: ${actual}]`);
const allOk = results.length === BEATS.length && results.every((r) => r.ok) && checks.every((c) => c[1]);
console.log(`\n${allOk ? "DEMO VALID" : "DEMO INVALID"}: ${results.filter((r) => r.ok).length}/${BEATS.length} beats, ${checks.filter((c) => c[1]).length}/${checks.length} checks`);
process.exit(allOk ? 0 : 1);
