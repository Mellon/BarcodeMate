import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 90000,
  use: { trace: "retain-on-failure" },
  reporter: [["list"]],
  outputDir: "test-results",
});
