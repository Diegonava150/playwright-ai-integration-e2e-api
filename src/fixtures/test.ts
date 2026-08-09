import { test as base, expect, APIRequestContext } from '@playwright/test';
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
}

export const test = base.extend<Fixtures>({
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
