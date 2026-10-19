import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Interaction coverage for the redesigned frontend, against the live, seeded stack
 * (`make chain deploy api web seed`). Read-only except for verification uploads.
 */
const DEMO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "data", "demo");

async function claimId(page: Page, claimant: string) {
  const claims = await (await page.request.get("/api/claims")).json();
  const c = claims.find((x: any) => x.claimant.startsWith(claimant));
  expect(c, `seeded claim for ${claimant}`).toBeTruthy();
  return c as { id: number; ref: string };
}

test.describe("landing", () => {
  test("hero is readable immediately and, with reduced motion, shows the final overlap state", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every retired tonne, claimed once.");
    await expect(page.getByText("Rejected by contract").first()).toBeVisible();
    await expect(page.getByText("4,559 units claimed twice").first()).toBeVisible();
    await ctx.close();
  });

  test("hero steps are buttons that change the explanation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Step 1: Retirement" }).click();
    await expect(page.getByText(/Verra records 19,999 units/)).toBeVisible();
    await page.getByRole("button", { name: "Step 4: Overlap" }).click();
    await expect(page.getByText(/the contract refuses the second registration/)).toBeVisible();
    // the illustration links to the real rejected transaction in the seeded ledger
    await page.getByRole("link", { name: /See this rejection as a real transaction/ }).click();
    await expect(page.getByText("Rejected by contract").first()).toBeVisible();
    await expect(page.getByText(/Failed transaction/).first()).toBeVisible();
  });

  test("How it works scrolls to the mechanism section", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "How it works" }).first().click();
    await expect(page.getByRole("heading", { name: "A claim is an interval." })).toBeInViewport();
  });

  test("serial anatomy explains the selected segment", async ({ page }) => {
    await page.goto("/#how");
    await page.getByRole("button", { name: "Last unit: 896319559" }).click();
    await expect(page.getByText(/Range size: 10,000 units/)).toBeVisible();
  });
});

test.describe("signature: first viewport and the Ruler", () => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`overlap annotation is visible without scrolling at ${vp.width}x${vp.height}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: vp, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto("/");
      await expect(page.getByText("4,559 units claimed twice", { exact: true }).first()).toBeInViewport();
      await expect(page.getByText("896,315,001", { exact: true }).first()).toBeInViewport();
      await ctx.close();
    });
  }

  test("selecting an overlap highlights it on both lanes; exact boundaries are on the scale", async ({ page }) => {
    const claims = await (await page.request.get("/api/claims")).json();
    const helios = claims.find((x: any) => x.claimant.startsWith("Helios"));
    await page.goto(`/claims/${helios.id}`);
    const overlaps = page.getByRole("button", { name: /^Overlap: 4,559 units/ });
    await expect(overlaps).toHaveCount(2); // one on the other claim's lane, one on this claim's lane
    await overlaps.first().click();
    for (const el of await overlaps.all()) await expect(el).toHaveCSS("outline-style", "solid");
    await expect(page.getByText("896,319,559", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/does not say which claim is right/)).toBeVisible();
  });
});

test.describe("claims ledger", () => {
  test("filter, search and sort operate on real rows", async ({ page }) => {
    await page.goto("/claims");
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const total = await rows.count();
    expect(total).toBeGreaterThanOrEqual(5);
    const chip = page.getByRole("button", { name: /^Blocked/ });
    const blockedCount = Number((await chip.textContent())!.replace(/\D/g, ""));
    await chip.click();
    await expect(page).toHaveURL(/status=blocked/);
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(rows).toHaveCount(blockedCount);
    for (const r of await rows.all()) await expect(r.getByText("Blocked", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^All/ }).click();
    await page.getByRole("searchbox", { name: "Search claims" }).fill("helios");
    await expect(rows).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Search claims" }).fill("");
    const unitsHeader = page.getByRole("columnheader", { name: /Units/ });
    await unitsHeader.getByRole("button").click();
    await expect(unitsHeader).toHaveAttribute("aria-sort", "descending");
    await unitsHeader.getByRole("button").click();
    await expect(unitsHeader).toHaveAttribute("aria-sort", "ascending");
  });
});

test.describe("claim detail", () => {
  test("overlap is shown on the ruler, selectable by keyboard, and linked to the other claim", async ({ page }) => {
    const helios = await claimId(page, "Helios");
    await page.goto(`/claims/${helios.id}`);
    await expect(page.getByText(/4,559 units already back/)).toBeVisible();
    const overlap = page.getByRole("button", { name: /Overlap: 4,559 units/ }).first();
    await expect(overlap).toBeVisible();
    // keyboard: focusing a band updates the live readout
    const registryBand = page.getByRole("button", { name: /^Registry: Retired/ }).first();
    await registryBand.focus();
    await expect(page.getByText(/no beneficiary recorded · Berkeley VROD/).first()).toBeVisible();
    await overlap.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: /Open Northwind Foods/ })).toBeVisible();
    // accessible table alternative
    await page.getByRole("button", { name: "Show ranges as a table" }).first().click();
    await expect(page.getByRole("rowheader", { name: "Claimed twice" })).toBeVisible();
  });

  test("anchoring is disabled with a reason and the forced attempt asks for confirmation (Esc cancels)", async ({ page }) => {
    const helios = await claimId(page, "Helios");
    await page.goto(`/claims/${helios.id}`);
    await expect(page.getByRole("button", { name: "Anchor on ledger" }).first()).toBeDisabled();
    await expect(page.getByText(/Disabled because of the blocking finding/).filter({ visible: true })).toBeVisible();
    await page.getByRole("button", { name: "Send to the contract anyway" }).click();
    const dialog = page.getByRole("dialog", { name: /Send a registration the contract should reject/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("a claim without serials explains insufficient evidence", async ({ page }) => {
    const k = await claimId(page, "Kestrel");
    await page.goto(`/claims/${k.id}`);
    await expect(page.getByText(/No serial numbers were disclosed/)).toBeVisible();
    await expect(page.getByText("Insufficient evidence").first()).toBeVisible();
  });
});

test.describe("verify", () => {
  test("matching and tampered documents produce different outcomes", async ({ page }) => {
    const nw = await claimId(page, "Northwind");
    const original = readFileSync(join(DEMO, "northwind_allocation.pdf"));
    await page.goto(`/verify?ref=${nw.ref}`);
    await page.locator('input[type="file"]').setInputFiles({ name: "northwind.pdf", mimeType: "application/pdf", buffer: original });
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByText("Fingerprint matches")).toBeVisible();
    const tampered = Buffer.concat([original, Buffer.from(" ")]);
    await page.getByRole("button", { name: /Remove northwind.pdf/ }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "northwind-edited.pdf", mimeType: "application/pdf", buffer: tampered });
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByText("Fingerprint differs")).toBeVisible();
  });

  test("unknown reference is reported as not on the ledger", async ({ page }) => {
    await page.goto("/verify");
    await page.getByRole("textbox", { name: "Claim reference" }).fill("OO-2099-9999");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByText("Not on the ledger")).toBeVisible();
  });
});

test.describe("intake", () => {
  test("validation messages and duplicate-evidence feedback", async ({ page }) => {
    await page.goto("/claims/new");
    await page.getByRole("button", { name: "Run checks" }).click();
    await expect(page.getByText("Enter the company making the claim.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Claimant" })).toBeFocused();
    await page.getByRole("button", { name: /Clean claim/ }).click();
    await expect(page.getByText(/SHA-256, computed in your browser/)).toBeVisible();
    await expect(page.getByText("Already used as evidence")).toBeVisible(); // seeded Northwind used this file
    await page.locator('input[type="file"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("x") });
    await expect(page.getByText(/Unsupported type \(\.png\)/)).toBeVisible();
  });
});

test.describe("navigation and layout", () => {
  test("exactly one active app nav item, including on claim detail", async ({ page }) => {
    const nw = await claimId(page, "Northwind");
    await page.goto(`/claims/${nw.id}`);
    const current = page.getByRole("navigation", { name: "Primary" }).locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText("Claims");
  });

  test("mobile menu opens as a dialog, lists every page and closes with Escape", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto("/claims");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Site menu" });
    await expect(menu).toBeVisible();
    for (const label of ["Overview", "Claims", "Verify", "Evidence", "Check a claim"]) await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await ctx.close();
  });

  test("no horizontal overflow at 320 px on key pages", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await ctx.newPage();
    const helios = await claimId(page, "Helios");
    for (const path of ["/", "/overview", "/claims", "/claims/new", `/claims/${helios.id}`, "/verify", "/evidence"]) {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw, `${path} scrollWidth`).toBeLessThanOrEqual(cw);
    }
    await ctx.close();
  });

  test("old /evaluation route redirects and unknown routes have a heading", async ({ page }) => {
    await page.goto("/evaluation");
    await expect(page).toHaveURL(/\/evidence$/);
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't on the ledger.");
  });
});
