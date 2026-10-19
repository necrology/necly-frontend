import { defineConfig, devices } from "@playwright/test";
import { E2E_API_URL } from "./e2e/support/env";

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Build dan serve dalam satu proses dengan env yang sama persis, sehingga
    // bundle API client dan CSP `connect-src` tidak pernah memakai origin yang
    // berbeda. Gate E2E jadi mandiri: `npm run test:e2e` selalu membangun ulang
    // dengan `E2E_API_URL`, terlepas dari siapa pun yang menjalankannya.
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      PORT: String(port),
      NEXT_PUBLIC_API_URL: E2E_API_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? baseURL,
      NEXT_PUBLIC_DEMO_MODE: "false",
    },
  },
});
