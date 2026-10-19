import { expect, test } from "@playwright/test";

/** Crawl internal links from the main pages; every one must resolve to a real page or API resource,
 *  with no failed API requests and no console errors along the way. */
const START = ["/", "/overview", "/claims", "/claims/new", "/verify", "/evidence"];

test("every internal link resolves; no failed API requests or console errors", async ({ page }) => {
  test.setTimeout(120_000);
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on("requestfailed", (r) => { if (!r.url().includes("/@vite") && !r.failure()?.errorText.includes("ERR_ABORTED")) problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`); });

  const links = new Set<string>();
  for (const path of START) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    for (const href of await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") || ""))) {
      if (href.startsWith("/") && !href.startsWith("//")) links.add(href.split("#")[0] || "/");
    }
  }
  expect(links.size).toBeGreaterThan(10);
  for (const href of links) {
    if (href.startsWith("/api/")) {
      const r = await page.request.get(href);
      expect(r.status(), href).toBe(200);
      continue;
    }
    await page.goto(href);
    await expect(page.getByRole("heading", { level: 1 }), href).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }), href).not.toHaveText("This page isn't on the ledger.");
  }
  expect(problems, problems.join("\n")).toEqual([]);
});
