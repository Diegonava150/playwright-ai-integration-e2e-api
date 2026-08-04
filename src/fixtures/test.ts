import { test as base, expect, APIRequestContext } from '@playwright/test';
import { HomePage } from '../pages/home.page.js';
import { AuthPage } from '../pages/auth.page.js';
import { ProductsPage } from '../pages/products.page.js';
import { CartPage } from '../pages/cart.page.js';
import { CheckoutPage } from '../pages/checkout.page.js';
import { ApiClient } from '../api/api-client.js';
import { aiExpectText, aiExpectVisual } from '../ai/ai-expect.js';
import { hasCredentials } from '../ai/claude-client.js';

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
  expectText: (claim: string) => Promise<void>;
  /** Assert a natural-language claim against a screenshot. */
  expectVisual: (claim: string) => Promise<void>;
  /** True when Claude credentials are available (API key, OAuth token, or profile). */
  enabled: boolean;
}

interface Fixtures {
  home: HomePage;
  auth: AuthPage;
  products: ProductsPage;
  cart: CartPage;
  checkout: CheckoutPage;
  api: ApiClient;
  ai: AiFixture;
}

export const test = base.extend<Fixtures>({
  home: async ({ page }, use) => use(new HomePage(page)),
  auth: async ({ page }, use) => use(new AuthPage(page)),
  products: async ({ page }, use) => use(new ProductsPage(page)),
  cart: async ({ page }, use) => use(new CartPage(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),

  api: async ({ request }, use) => use(new ApiClient(request)),

  ai: async ({ page }, use) => {
    await use({
      enabled: hasCredentials(),
      expectText: (claim: string) => aiExpectText(page, claim),
      expectVisual: (claim: string) => aiExpectVisual(page, claim),
    });
  },
});

/** A standalone API client factory for pure-API specs (no page needed). */
export function apiClient(request: APIRequestContext): ApiClient {
  return new ApiClient(request);
}

export { expect };
