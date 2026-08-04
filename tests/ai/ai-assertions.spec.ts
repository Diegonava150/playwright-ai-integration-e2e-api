import { test } from '../../src/fixtures/test.js';

/**
 * Demonstrates in-test LLM assertions. These are tagged @ai and gated on the
 * API key so the default suite never calls Claude. Run with:
 *   npm run test:ai        (needs ANTHROPIC_API_KEY)
 */
test.describe('AI-backed assertions @ai', () => {
  test.skip(({ ai }) => !ai.enabled, 'Set ANTHROPIC_API_KEY to run AI tests');

  test('the products page semantically presents an e-commerce catalog', async ({
    products,
    ai,
  }) => {
    await products.open();
    // A claim no single selector captures: overall semantic intent of the page.
    await ai.expectText(
      'The page displays an online store product catalog with multiple items ' +
        'that each show a name and a price in dollars.',
    );
  });

  test('the product grid renders as a coherent layout (visual)', async ({
    products,
    ai,
  }) => {
    await products.open();
    await ai.expectVisual(
      'The screenshot shows a grid of product cards that is visually coherent ' +
        '— not a broken layout, blank page, or error screen.',
    );
  });

  test('the cart page reflects an added item in natural language', async ({
    products,
    ai,
  }) => {
    await products.open();
    await products.addToCart(0);
    await products.gotoCart();
    await ai.expectText(
      'The shopping cart contains at least one product with a quantity and a total price.',
    );
  });
});
