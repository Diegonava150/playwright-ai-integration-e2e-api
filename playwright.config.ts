import { defineConfig, devices, type Project } from '@playwright/test';
import dotenv from 'dotenv';
import { AUTH_STATE_FILE } from './src/fixtures/paths.js';

// Load ANTHROPIC_API_KEY (and optional overrides) from .env for local runs.
dotenv.config();

export const BASE_URL = process.env.BASE_URL ?? 'https://www.automationexercise.com';

const chrome = devices['Desktop Chrome'];

// Cross-browser and visual projects are opt-in (they need extra browser installs
// / baseline snapshots) so the default `npm test` stays fast and green.
const crossBrowser: Project[] = process.env.CROSS_BROWSER
  ? [
      { name: 'firefox', testDir: './tests/e2e', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', testDir: './tests/e2e', use: { ...devices['Desktop Safari'] } },
      { name: 'mobile', testDir: './tests/e2e', use: { ...devices['Pixel 5'] } },
    ]
  : [];

const visual: Project[] = process.env.VISUAL
  ? [{ name: 'visual', testDir: './tests/visual', use: { ...chrome } }]
  : [];

export default defineConfig({
  testDir: './tests',
  // seed.spec.ts is a scratch scaffold for the Playwright test-generator agent,
  // not a real test — never run it.
  testIgnore: ['**/seed.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },

  // Baselines are namespaced by {projectName} and {platform}: a screenshot taken
  // on Windows (…-win32.png) is NEVER used to match one on Linux (…-linux.png).
  // So CI (Ubuntu) needs Linux baselines — generate them with the
  // `visual-baselines` workflow or the Docker command in the README.
  snapshotPathTemplate:
    'tests/visual/__screenshots__/{testFileName}/{arg}{-projectName}-{platform}{ext}',

  // Fail fast if the target site is down.
  globalSetup: './src/global-setup.ts',

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    // --- auth lifecycle: provision a shared user, capture session, delete after ---
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /auth\.setup\.ts/,
      teardown: 'cleanup',
      use: { baseURL: BASE_URL },
    },
    {
      name: 'cleanup',
      testDir: './tests/setup',
      testMatch: /auth\.teardown\.ts/,
      use: { baseURL: BASE_URL },
    },

    // --- pure API (no browser needed) ---
    { name: 'api', testDir: './tests/api', use: { baseURL: BASE_URL } },

    // --- anonymous browser flows ---
    { name: 'e2e', testDir: './tests/e2e', use: { ...chrome } },

    // --- pre-authenticated browser flows (reuse the shared session) ---
    {
      name: 'e2e-auth',
      testDir: './tests/e2e-auth',
      dependencies: ['setup'],
      use: { ...chrome, storageState: AUTH_STATE_FILE },
    },

    // --- API + UI cross-verification ---
    { name: 'hybrid', testDir: './tests/hybrid', use: { ...chrome } },

    // --- accessibility (axe) ---
    { name: 'a11y', testDir: './tests/a11y', use: { ...chrome } },

    // --- AI-assertion demos (@ai). Needs Claude credentials; opt-in. ---
    { name: 'ai', testDir: './tests/ai', use: { ...chrome } },

    ...crossBrowser,
    ...visual,
  ],
});
