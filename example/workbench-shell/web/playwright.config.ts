import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:5180",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "pnpm dev --port 5180",
    url: "http://localhost:5180",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
