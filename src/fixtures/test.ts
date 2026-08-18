import { test as base, expect, APIRequestContext } from '@playwright/test';
import { probeTarget, type Reachability } from '../reachability.js';
import { HomePage } from '../pages/home.page.js';
import { AuthPage } from '../pages/auth.page.js';
import { ProductsPage } from '../pages/products.page.js';
import { CartPage } from '../pages/cart.page.js';
import { CheckoutPage } from '../pages/checkout.page.js';
import { ProductDetailPage } from '../pages/product-detail.page.js';
import { ApiClient } from '../api/api-client.js';
import { aiExpectText, aiExpectVisual, type AiExpectOptions } from '../ai/ai-expect.js';
import { hasCredentials } from '../ai/claude-client.js';
import { makeUser, NewUser } from '../data/users.js';

/**
 * Central fixtures. Every spec imports `test`/`expect` from here so it gets:
 *   - Page Objects (lazy — only constructed if the test touches them)
 *   - a typed API client bound to the request context
 *   - an `ai` fixture whose assertions are opt-in per test
 *
 * The `ai` fixture is the seam that keeps the LLM out of the hot path: it is
 * never invoked unless a test explicitly calls it, so the default e2e/api gate
 * has zero Claude calls.
 */

interface AiFixture {
  /** Assert a natural-language claim against the page's visible text. */
  expectText: (claim: string, opts?: AiExpectOptions) => Promise<void>;
  /** Assert a natural-language claim against a screenshot. */
  expectVisual: (claim: string, opts?: AiExpectOptions) => Promise<void>;
  /** True when Claude credentials are available (API key, OAuth token, or profile). */
  enabled: boolean;
}

interface Fixtures {
  home: HomePage;
  auth: AuthPage;
  products: ProductsPage;
  productDetail: ProductDetailPage;
  cart: CartPage;
  checkout: CheckoutPage;
  api: ApiClient;
  ai: AiFixture;
  /**
   * A pre-provisioned account (created via API). Its teardown deletes the
   * account via API and therefore runs even if the test body throws — so a
   * mid-test failure never leaks an account into the shared sandbox.
   */
  registeredUser: NewUser;
  /** Auto fixture. Skips the test when this runner is being served the challenge. */
  skipWhenTargetBlocked: void;
}

interface WorkerFixtures {
  /** Whether the target is usable *from this worker's machine*. Probed once per worker. */
  targetStatus: Reachability;
}

const BASE_URL = process.env.BASE_URL ?? 'https://www.automationexercise.com';

export const test = base.extend<Fixtures, WorkerFixtures>({
  /**
   * Asked once per worker, on the machine that is about to run the tests.
   *
   * <p>That last part is the whole point. CI used to decide this in a separate
   * `preflight` job and pass a boolean down, but that job runs on its own runner
   * with its own IP, and automationexercise.com blocks by IP. A green preflight
   * therefore said "some other machine could reach the site" — which is not a
   * fact about this one. A shard failed on the challenge after the gate had
   * cleared it, and the failure read as a bug in the suite.
   *
   * <p>Answering it here removes the second opinion rather than reconciling it.
   * There is no cross-machine claim left to be wrong.
   */
  targetStatus: [
    // Playwright's fixture signature; this one depends on no other fixture.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(await probeTarget(BASE_URL));
    },
    { scope: 'worker' },
  ],

  /**
   * Skip — not fail — when the block is what stopped us.
   *
   * <p>The distinction is the one {@link probeTarget} already draws. Being served
   * an anti-bot challenge is a fact about the runner's IP and says nothing about
   * the code, so failing on it trains everyone to ignore a red build. The site
   * being down or answering with something unrecognised is a real signal, and
   * global-setup still throws on those before any of this runs.
   */
  skipWhenTargetBlocked: [
    async ({ targetStatus }, use, testInfo) => {
      if (!targetStatus.reachable && targetStatus.blocked) {
        testInfo.skip(
          true,
          `${BASE_URL} is serving an anti-bot challenge to this runner — ${targetStatus.detail}`,
        );
      }
      await use();
    },
    { auto: true },
  ],

  home: async ({ page }, use) => use(new HomePage(page)),
  auth: async ({ page }, use) => use(new AuthPage(page)),
  products: async ({ page }, use) => use(new ProductsPage(page)),
  productDetail: async ({ page }, use) => use(new ProductDetailPage(page)),
  cart: async ({ page }, use) => use(new CartPage(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),

  api: async ({ request }, use) => use(new ApiClient(request)),

  registeredUser: async ({ request }, use) => {
    const client = new ApiClient(request);
    const user = makeUser();
    const created = await client.createAccount(user);
    if (created.responseCode !== 201) {
      throw new Error(
        `Failed to provision registeredUser (responseCode ${created.responseCode}): ${JSON.stringify(created.raw)}`,
      );
    }

    await use(user);

    // Teardown — runs even on test failure. Best-effort; never masks the
    // original test error, but warn so a leaked account is visible.
    try {
      const res = await client.deleteAccount(user.email, user.password);
      if (res.responseCode !== 200) {
        console.warn(
          `[registeredUser] cleanup returned ${res.responseCode} for ${user.email} — account may be leaked.`,
        );
      }
    } catch (err) {
      console.warn(
        `[registeredUser] cleanup threw for ${user.email} (${(err as Error).message}) — account may be leaked.`,
      );
    }
  },

  ai: async ({ page }, use) => {
    await use({
      enabled: hasCredentials(),
      expectText: (claim: string, opts?: AiExpectOptions) =>
        aiExpectText(page, claim, opts),
      expectVisual: (claim: string, opts?: AiExpectOptions) =>
        aiExpectVisual(page, claim, opts),
    });
  },
});

/** A standalone API client factory for pure-API specs (no page needed). */
export function apiClient(request: APIRequestContext): ApiClient {
  return new ApiClient(request);
}

export { expect };
