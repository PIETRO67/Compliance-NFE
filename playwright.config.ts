import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
const cache = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, "ms-playwright")
  : "";
const installed =
  cache && existsSync(cache)
    ? readdirSync(cache)
        .filter((x) => /^chromium-\d+$/.test(x))
        .sort()
        .reverse()[0]
    : undefined;
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (installed
    ? join(cache, installed, "chrome-win64", "chrome.exe")
    : undefined);
export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/demo",
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  use: {
    baseURL: process.env.DEMO_BASE_URL || "http://localhost:3000",
    headless: true,
    launchOptions: { executablePath },
    screenshot: "only-on-failure",
  },
  reporter: "list",
});
