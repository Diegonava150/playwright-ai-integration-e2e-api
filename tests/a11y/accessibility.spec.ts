import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test.js';

/**
 * Accessibility checks with axe-core.
 *
 * automationexercise.com is a third-party demo we can't fix, so a plain
 * "zero critical violations" gate would be permanently red. Instead we use a
 * documented KNOWN-ISSUES BASELINE: the suite fails only when a NEW category of
 * critical violation appears (a real regression), while tolerating the ids we've
 * already triaged. For an app you own, set BASELINE to an empty array so any
 * critical violation fails the build.
 *
 * The full violation report is attached to every run regardless.
 */
const CRITICAL_BASELINE = new Set<string>([
  // Search / subscribe buttons on the demo site have no accessible name.
  'button-name',
]);

async function auditNoNewCritical(page: Page, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const critical = results.violations.filter((v) => v.impact === 'critical');
  const regressions = critical.filter((v) => !CRITICAL_BASELINE.has(v.id));

  // Surface the baseline count so tolerated issues stay visible in the log.
  const baselined = critical.filter((v) => CRITICAL_BASELINE.has(v.id)).map((v) => v.id);
  if (baselined.length) {
    testInfo.annotations.push({
      type: 'a11y-baseline',
      description: `Tolerated known criticals: ${[...new Set(baselined)].join(', ')}`,
    });
  }

  expect(
    regressions,
    `New (non-baseline) critical a11y violations: ${regressions.map((v) => v.id).join(', ') || 'none'}`,
  ).toEqual([]);
}

test.describe('Accessibility @a11y', () => {
  test('home page has no new critical violations', async ({ page, home }, testInfo) => {
    await home.open();
    await auditNoNewCritical(page, testInfo);
  });

  test('products page has no new critical violations', async ({
    page,
    products,
  }, testInfo) => {
    await products.open();
    await auditNoNewCritical(page, testInfo);
  });
});
