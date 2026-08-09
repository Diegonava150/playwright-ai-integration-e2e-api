import { test, expect } from '../../src/fixtures/test.js';

test.describe('Cart management (E2E)', () => {
  test('removing the only item empties the cart', async ({ products, cart }) => {
    await products.open();
    await products.addToCart(0);
    await products.gotoCart();
    await cart.expectHasItems();

    await cart.removeItem(0);
    await cart.expectEmpty();
  });

  test('adding from the product detail page respects the chosen quantity', async ({
    productDetail,
    cart,
  }) => {
    await productDetail.open(1);
    await productDetail.setQuantity(3);
    await productDetail.addToCart();
    await productDetail.viewCart();

    expect(await cart.quantityOf(0)).toBe('3');
  });
});
