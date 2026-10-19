import { defineConfig } from "@playwright/test";

// Runs against the live stack (make chain, make deploy, make api, make web, make seed).
// Uses the locally installed Google Chrome, so no browser download is needed.
export default defineConfig({
  testDir: "qa/tests",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://127.0.0.1:5173", channel: "chrome", trace: "off" },
});
