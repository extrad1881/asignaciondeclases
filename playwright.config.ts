import { defineConfig, devices } from "@playwright/test";
import { getSupabaseTestEnv } from "./tests/helpers/supabase-test-client";

const supabaseEnv = getSupabaseTestEnv();
process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseEnv.url;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseEnv.anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseEnv.serviceRoleKey;

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = configuredBaseUrl ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  outputDir: "test-results/e2e",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: configuredBaseUrl
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
});
