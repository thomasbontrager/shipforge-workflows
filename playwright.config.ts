import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: process.env.CI
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: `${baseURL}/login`,
        timeout: 120_000,
        reuseExistingServer: true,
        env: {
          ...process.env,
          NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseURL,
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "local-e2e-secret",
        },
      },
});
