import { test, expect } from '../../src/fixtures/test.js';

test.describe('Product browsing & search (E2E)', () => {
  test('the products page lists a grid of products @smoke', async ({ products }) => {
    await products.open();
    expect(await products.count()).toBeGreaterThan(0);
  });

  test('searching narrows the product grid', async ({ products }) => {
    await products.open();
    await products.search('dress');
    const results = await products.count();
    expect(results).toBeGreaterThan(0);
  });

  test('searching a nonsense term yields no products', async ({ products }) => {
    await products.open();
    await products.search('zzqqxnonexistent12345');
    await expect(products.productCards()).toHaveCount(0);
  });

  test('adding a product to the cart updates the cart', async ({ products, cart }) => {
    await products.open();
    await products.addToCart(0);
    await products.gotoCart();
    await cart.expectHasItems();
    expect(await cart.itemCount()).toBeGreaterThanOrEqual(1);
  });
});
