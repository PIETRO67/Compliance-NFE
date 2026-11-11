import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/operational",
  outputDir: "./test-results/operational",
  timeout: 120000,
  use: { ...base.use, baseURL: "http://localhost:3001" },
});
