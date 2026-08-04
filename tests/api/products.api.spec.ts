import { test, expect } from '../../src/fixtures/test.js';
import { expectResponseCode } from '../../src/api/api-client.js';

test.describe('Products API', () => {
  test('GET /api/productsList returns a populated catalog', async ({ api }) => {
    const { responseCode, products } = await api.getAllProducts();
    expect(responseCode).toBe(200);
    expect(products.length).toBeGreaterThan(0);

    // Shape assertions on the first product.
    const first = products[0];
    expect(first).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      price: expect.any(String),
    });
    expect(first.category.category).toBeTruthy();
  });

  test('POST /api/searchProduct finds matching products', async ({ api }) => {
    const { responseCode, products } = await api.searchProduct('tshirt');
    expect(responseCode).toBe(200);
    expect(products.length).toBeGreaterThan(0);
    // Every returned product name should reference the search term loosely.
    for (const p of products) {
      expect(p.name.toLowerCase()).toMatch(/t[-\s]?shirt|top|tee/i);
    }
  });

  test('GET /api/brandsList returns brands', async ({ api }) => {
    const brands = await api.getBrands();
    expectResponseCode(brands, 200);
    expect((brands.raw as any).brands.length).toBeGreaterThan(0);
  });

  test('DELETE /api/productsList is not allowed (405)', async ({ api }) => {
    // Negative test: the sandbox documents that unsupported methods return 405.
    const res = await api.deleteProductsList();
    expectResponseCode(res, 405);
  });
});
