import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvFile } from "dotenv";

// The suite runs against the development deployment's site, after `pnpm run deploy:dev`.
loadEnvFile({ path: ".env.local" });
const baseURL = process.env.VITE_CONVEX_SITE_URL;
if (!baseURL) {
  throw new Error(
    "The suite needs VITE_CONVEX_SITE_URL from .env.local; run npx convex dev once.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
