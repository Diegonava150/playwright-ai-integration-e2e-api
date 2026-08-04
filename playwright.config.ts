import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load ANTHROPIC_API_KEY (and optional overrides) from .env for local runs.
dotenv.config();

export const BASE_URL = process.env.BASE_URL ?? 'https://www.automationexercise.com';

/**
 * The reporters are chosen to feed the AI layer:
 *  - `html`  : human-facing report + traces
 *  - `list`  : live console output
 *  - `json`  : machine-readable results that scripts/ai-failure-summary.ts consumes
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    // automationexercise occasionally serves interstitial ads; ignore https noise.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: BASE_URL },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'hybrid',
      testDir: './tests/hybrid',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // AI-assertion demos live here; run explicitly with `npm run test:ai`
      // (they require ANTHROPIC_API_KEY, so they are not part of the default gate).
      name: 'ai',
      testDir: './tests/ai',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
