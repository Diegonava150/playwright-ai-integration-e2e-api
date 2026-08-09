import { test, expect } from '../../src/fixtures/test.js';

/**
 * Deterministic pixel-diff visual regression (distinct from the AI *semantic*
 * visual check in tests/ai). Opt-in: only registered when VISUAL=1, because it
 * needs committed baselines. Generate them with `npm run test:visual:update`.
 *
 * IMPORTANT: baselines are per-platform. Ones made on Windows won't satisfy CI
 * (Linux). Generate Linux baselines via the `visual-baselines` GitHub workflow
 * or the Docker command in the README so local and CI agree.
 *
 * Dynamic regions (ad iframes, carousel) are masked to reduce flakiness.
 */
test.describe('Visual regression @visual', () => {
  test('products page matches baseline', async ({ products, page }) => {
    await products.open();
    await expect(page).toHaveScreenshot('products.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      mask: [page.locator('iframe'), page.locator('#slider')],
    });
  });
});
