import { expect, test, type Page } from "@playwright/test";

/** Keyboard-only walkthroughs of the principal workflows (no mouse events). */

async function tabTo(page: Page, matcher: (el: { tag: string; text: string; label: string | null }) => boolean, max = 60) {
  const seen: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const el = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return { tag: a?.tagName ?? "", text: (a?.textContent ?? "").trim(), label: a?.getAttribute("aria-label") ?? null };
    });
    if (matcher(el)) return el;
    seen.push(`${el.tag}:${el.text.slice(0, 20)}`);
  }
  throw new Error("target not reached by Tab; saw " + seen.slice(0, 25).join(" | "));
}

test("skip link, then open a claim from the ledger and read the overlap with the keyboard", async ({ page }) => {
  await page.goto("/claims");
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  // first focusable inside main after skipping is a filter chip; continue to Helios's row link
  await tabTo(page, (e) => e.tag === "INPUT");
  await page.keyboard.type("helios");
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  await tabTo(page, (e) => e.tag === "A" && /OO-2026-\d+/.test(e.text));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Helios Apparel");
  // reach the ruler's overlap control by Tab and confirm the readout
  const el = await tabTo(page, (e) => (e.label ?? "").startsWith("Overlap:"));
  expect(el.label).toContain("4,559 units");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/does not say which claim is right/)).toBeVisible();
  // open the table alternative from the keyboard
  await tabTo(page, (e) => e.text.includes("Show ranges as a table"));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("rowheader", { name: "Claimed twice" })).toBeVisible();
});

test("forced registration dialog opens, traps focus and closes with Escape, returning focus", async ({ page }) => {
  const claims = await (await page.request.get("/api/claims")).json();
  const helios = claims.find((c: any) => c.claimant.startsWith("Helios"));
  test.skip((await (await page.request.get("/api/health")).json()).public_demo, "ledger-write dialog is disabled on a public demo instance (asserted in ui.spec.ts)");
  await page.goto(`/claims/${helios.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await tabTo(page, (e) => e.text === "Send to the contract anyway");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Send to the contract" })).toBeFocused();
  await page.keyboard.press("Tab"); // focus stays inside the modal (or moves to browser chrome, never the page behind)
  const inside = await page.evaluate(() => !!document.activeElement?.closest("dialog") || document.activeElement === document.body);
  expect(inside).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Send to the contract anyway" }).filter({ visible: true })).toBeFocused();
});

test("intake: load a sample and reach Run checks with the keyboard", async ({ page }) => {
  await page.goto("/claims/new");
  await expect(page.getByRole("button", { name: /Clean claim/ })).toBeVisible();
  await tabTo(page, (e) => e.text.startsWith("1Clean claim") || e.text.includes("Clean claim"));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Claimant" })).toHaveValue(/Northwind/);
  await page.getByRole("textbox", { name: "Claimant" }).focus();
  await tabTo(page, (e) => e.text === "Run checks");
  await expect(page.getByRole("button", { name: "Run checks" })).toBeFocused();
});

test("landing: story steps operate from the keyboard", async ({ page }) => {
  await page.goto("/");
  await tabTo(page, (e) => e.label === "Step 2: Claim A");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Northwind's FY2025 claim cites 10,000/)).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter"); // Step 4
  await expect(page.getByText(/4,559 units appear in both claims/)).toBeVisible();
});
