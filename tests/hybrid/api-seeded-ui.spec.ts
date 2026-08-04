import { test, expect } from '../../src/fixtures/test.js';

/**
 * Hybrid tests combine the API and UI layers — the API is used as an oracle to
 * make the UI assertions precise and fast, which is where Playwright's dual
 * request/browser model shines.
 */
test.describe('API + UI cross-verification (Hybrid)', () => {
  test('a product from the API is findable in the UI search', async ({
    api,
    products,
  }) => {
    // 1. Pull a real product name from the API (the source of truth).
    const { products: catalog } = await api.getAllProducts();
    expect(catalog.length).toBeGreaterThan(0);
    const target = catalog[0];

    // 2. Search for a distinctive token of that product in the UI.
    const term = target.name.split(' ')[0];
    await products.open();
    await products.search(term);

    // 3. The UI grid should contain at least one result for the API's product.
    expect(await products.count()).toBeGreaterThan(0);
  });

  test('API search count is consistent with the UI grid', async ({ api, products }) => {
    const term = 'top';

    const apiResult = await api.searchProduct(term);
    expect(apiResult.responseCode).toBe(200);

    await products.open();
    await products.search(term);
    const uiCount = await products.count();

    // Both layers should agree that results exist. (Exact parity isn't
    // guaranteed on a live sandbox, so we assert co-emptiness/co-non-emptiness.)
    expect(uiCount > 0).toBe(apiResult.products.length > 0);
  });
});
