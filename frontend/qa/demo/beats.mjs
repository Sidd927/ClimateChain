// The demo film: one source of truth for the voice-over (verbatim) and the on-screen actions.
// docs/submission/03_demo_script.md mirrors these beats. Requires a FRESH ledger:
//   make reset  -> restart `make api`  -> (do NOT run make seed)
import { join } from "node:path";

export const DEMO_DOCS = join(import.meta.dirname, "..", "..", "..", "data", "demo");

/** Move the pointer visibly to a locator's centre, pause, then click it. */
export async function point(page, locator, { click = true, pause = 350 } = {}) {
  // re-renders (e.g. after a contract response) can replace the element: retry against a fresh lookup
  for (let attempt = 0; ; attempt++) {
    try {
      await locator.waitFor({ state: "visible" });
      await locator.scrollIntoViewIfNeeded();
      const b = await locator.boundingBox();
      if (!b) throw new Error("target not visible");
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 28 });
      await page.waitForTimeout(pause);
      if (click) await locator.click();
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
      await page.waitForTimeout(400);
    }
  }
}
export const visible = (l) => l.filter({ visible: true }).first();
async function smoothScrollTo(page, locator, offset = 90) {
  await page.evaluate(([y]) => window.scrollTo({ top: y, behavior: "smooth" }), [await locator.evaluate((el, o) => el.getBoundingClientRect().top + window.scrollY - o, offset)]);
  await page.waitForTimeout(1100);
}

export const BEATS = [
  // ---------------------------------------------------------------- 1. Hook
  { scene: 1, id: "1a", route: "/",
    say: "This is a real carbon credit retirement. Nineteen thousand, nine hundred and ninety-nine units from a wind project in Tamil Nadu, retired on Verra's registry.",
    act: async (page) => { await page.goto("/"); await page.mouse.move(700, 600); } },
  { scene: 1, id: "1b",
    say: "The registry makes sure each unit is retired only once. [[slnc 300]] But a retirement isn't where the story ends. It's where the claims begin.",
    act: async (page) => { await page.waitForTimeout(400); } },
  // ------------------------------------------------------------- 2. Insight
  { scene: 2, id: "2a",
    say: "Companies cite retired units in reports, product labels and web pages. Two of those claims can cite the same units. And read alone, each one looks perfectly fine.",
    act: async (page) => { await point(page, page.getByRole("button", { name: "Step 4: Overlap" }), { click: false, pause: 200 }); await page.mouse.move(705, 560, { steps: 30 }); } },
  { scene: 2, id: "2b",
    say: "OnceOnly checks claims against each other. [[slnc 250]] Every serial number is a range: an issuance batch, a first unit, and a last unit.",
    act: async (page) => {
      await point(page, page.getByRole("link", { name: "How it works" }).first());
      await page.waitForTimeout(900);
      await point(page, page.getByRole("button", { name: "First unit: 896309560" }));
      await page.waitForTimeout(700);
      await point(page, page.getByRole("button", { name: "Last unit: 896319559" }));
    } },
  { scene: 2, id: "2c",
    say: "So a claim becomes an interval. And double use becomes something you can measure.",
    act: async (page) => { await page.waitForTimeout(300); } },
  // ------------------------------------------------------------- 3. Product
  { scene: 3, id: "3a", route: "/claims/new",
    say: "Let's check one. The companies here are synthetic. The registry records are real, from Berkeley's public offsets database.",
    act: async (page) => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await page.waitForTimeout(900); await point(page, page.getByRole("link", { name: /Check a claim/ }).first()); await page.waitForURL("**/claims/new"); } },
  { scene: 3, id: "3b",
    say: "Northwind Foods submits a broker's allocation statement. OnceOnly fingerprints the file in the browser, then reads its serial numbers.",
    act: async (page) => { await point(page, page.getByRole("button", { name: /Clean claim/ })); await page.getByText(/SHA-256, computed in your browser/).waitFor(); await page.waitForTimeout(600); } },
  { scene: 3, id: "3c", route: "/claims/1",
    say: "It matches them to the registry. [[slnc 200]] Every check passes, and the Ruler shows Northwind's units inside the real retirement.",
    act: async (page) => { await point(page, page.getByRole("button", { name: "Run checks" })); await page.waitForURL(/\/claims\/\d+$/); await page.getByText("Every check passed").waitFor(); await page.waitForTimeout(500); await smoothScrollTo(page, page.getByRole("heading", { name: "Claimed units" }), 140); } },
  { scene: 3, id: "3d",
    say: "Below it, the provenance chain: the document, its serial block, the registry record, and, once anchored, the ledger.",
    act: async (page) => { await smoothScrollTo(page, page.getByRole("heading", { name: "Provenance" }), 120); await page.mouse.move(700, 420, { steps: 30 }); await page.mouse.move(1180, 420, { steps: 40 }); await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await page.waitForTimeout(700); } },
  // --------------------------------------------------------------- 4. Proof
  { scene: 4, id: "4a",
    say: "Anchoring writes this exact unit range, and a fingerprint of the evidence, to a smart contract called ClaimLedger.",
    act: async (page) => {
      await point(page, visible(page.getByRole("button", { name: "Anchor on ledger" })));
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await page.waitForTimeout(700);
      await point(page, dialog.getByRole("button", { name: "Anchor on ledger" }));
      await page.getByText(/Anchored as ledger claim #1/).first().waitFor();
    } },
  { scene: 4, id: "4b", route: "/claims/new",
    say: "Now a second company, Helios Apparel, submits its own statement. Same retirement. Different serial number.",
    act: async (page) => { await page.waitForTimeout(600); await point(page, page.getByRole("link", { name: "Check a claim" }).first()); await page.waitForURL("**/claims/new"); await point(page, page.getByRole("button", { name: /Overlapping claim/ })); await page.getByText(/SHA-256, computed in your browser/).waitFor(); await point(page, page.getByRole("button", { name: "Run checks" })); await page.waitForURL(/\/claims\/2$/); } },
  { scene: 4, id: "4c", route: "/claims/2",
    say: "A hash comparison would see nothing in common. [[slnc 500]] The Ruler sees it at once.",
    act: async (page) => { await page.getByText(/4,559 units already back/).waitFor(); await smoothScrollTo(page, page.getByRole("heading", { name: "Claimed units" }), 140); } },
  { scene: 4, id: "4d",
    say: "Four thousand, five hundred and fifty-nine units, from here, to here, already back Northwind's claim.",
    act: async (page) => {
      const ov = page.getByRole("button", { name: /^Overlap: 4,559 units/ });
      await point(page, ov.last(), { click: false, pause: 500 });
      const scale = page.getByText("896,315,001", { exact: true }).first();
      const end = page.getByText("896,319,559", { exact: true }).first();
      await point(page, scale, { click: false, pause: 700 });
      await point(page, end, { click: false, pause: 700 });
      await point(page, ov.last(), { pause: 300 });
    } },
  // ---------------------------------------------------- 5. Evidence and enforcement
  { scene: 5, id: "5a",
    say: "OnceOnly blocks the claim, and it says what it can't tell you: which company is right. That takes the broker's records, and a human reviewer.",
    act: async (page) => { await smoothScrollTo(page, page.getByRole("heading", { name: "Findings" }), 120); await page.waitForTimeout(500); await page.mouse.move(520, 470, { steps: 20 }); } },
  { scene: 5, id: "5b",
    say: "But the rule doesn't live in this interface. Send the registration straight to the contract anyway.",
    act: async (page) => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await page.waitForTimeout(900);
      await point(page, visible(page.getByRole("button", { name: "Send to the contract anyway" })));
      const dialog = page.getByRole("dialog"); await dialog.waitFor(); await page.waitForTimeout(800);
      await point(page, dialog.getByRole("button", { name: "Send to the contract" }));
    } },
  { scene: 5, id: "5c",
    say: "ClaimLedger refuses it. Range overlap. The failed transaction is mined, and recorded in the claim's audit trail.",
    act: async (page) => {
      await visible(page.getByText(/ClaimLedger rejected the registration|Rejected by contract/)).waitFor();
      await page.waitForLoadState("networkidle");
      await point(page, visible(page.getByText("Rejected by contract")), { click: false, pause: 1200 });
      await smoothScrollTo(page, page.getByRole("heading", { name: "Audit trail" }), 120);
    } },
  // ----------------------------------------------------- 6. Auditability and limits
  { scene: 6, id: "6o", route: "/overview",
    say: "The overview keeps the ledger honest at a glance: what is anchored, what is blocked, and every transaction the contract accepted, or refused.",
    act: async (page) => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await page.waitForTimeout(800); await point(page, page.getByRole("link", { name: "Overview", exact: true }).first()); await page.waitForURL("**/overview"); await smoothScrollTo(page, page.getByRole("heading", { name: "Ledger transactions" }), 160); await point(page, page.getByText("Rejected by contract").first(), { click: false, pause: 400 }); } },
  { scene: 6, id: "6a", route: "/verify",
    say: "Anyone can verify a claim without an account. Read Northwind's record straight from the contract.",
    act: async (page) => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await page.waitForTimeout(800); await point(page, page.getByRole("link", { name: "Verify", exact: true }).first()); await page.waitForURL("**/verify"); await point(page, page.getByRole("button", { name: "OO-2026-0001" })); await page.getByText("Active on ClaimLedger").waitFor(); } },
  { scene: 6, id: "6b",
    say: "Then drop in the document. The fingerprint matches what was committed.",
    act: async (page) => {
      const [chooser] = await Promise.all([page.waitForEvent("filechooser"), point(page, page.getByRole("button", { name: "Choose a document" }))]);
      await chooser.setFiles(join(DEMO_DOCS, "northwind_allocation.pdf"));
      await point(page, page.getByRole("button", { name: "Verify", exact: true }));
      await page.getByText("Fingerprint matches").waitFor();
      await point(page, page.getByText("Fingerprint matches"), { click: false, pause: 400 });
    } },
  { scene: 6, id: "6c",
    say: "A match proves the file hasn't changed, not that it's true. And an overlap is a signal to investigate, not proof of fraud. This prototype runs on a local development chain, and it checks double use, not credit quality.",
    act: async (page) => { await page.mouse.move(980, 650, { steps: 25 }); } },
  // --------------------------------------------------------------- 7. Closing
  { scene: 7, id: "7a", route: "/evidence",
    say: "We tested the interval check on two hundred and seventy synthetic claim pairs, built on real registry ranges. Exact serial or hash matching missed every overlap that wasn't a word-for-word copy.",
    act: async (page) => { await point(page, page.getByRole("link", { name: "Evidence", exact: true }).first()); await page.waitForURL("**/evidence"); await page.getByText("Intervals catch what hashes miss").waitFor(); await point(page, page.getByText("Intervals catch what hashes miss"), { click: false, pause: 500 }); } },
  { scene: 7, id: "7b", route: "/",
    say: "Registries make sure a tonne is retired once. [[slnc 250]] OnceOnly makes sure it's claimed once.",
    act: async (page) => { await point(page, page.getByRole("link", { name: "OnceOnly home" }).first()); await page.waitForURL(/\/$/); await page.mouse.move(700, 300, { steps: 20 }); } },
  { scene: 7, id: "7c",
    say: "Every retired tonne, [[slnc 200]] claimed once.",
    act: async (page) => { await page.waitForTimeout(400); }, tail: 2200 },
];

export const SCENE_TITLES = { 1: "The hook", 2: "The insight", 3: "The product", 4: "The proof", 5: "Evidence and enforcement", 6: "Auditability and limits", 7: "The closing argument" };
