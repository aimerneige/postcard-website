import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.ts",
  use: { baseURL: "http://127.0.0.1:4173", headless: true },
  webServer: {
    command: "node tests/serve-dist.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
  timeout: 30000,
});
