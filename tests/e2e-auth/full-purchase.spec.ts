import { test, expect } from '../../src/fixtures/test.js';

/**
 * The flagship end-to-end purchase workflow, running in the `e2e-auth` project:
 * the browser context is already authenticated via the shared storageState
 * (see tests/setup/auth.setup.ts), so this test skips registration entirely and
 * focuses on browse → cart → checkout → pay → order placed.
 *
 * No account cleanup here — the shared user is torn down by auth.teardown.ts.
 */
test.describe('Complete purchase workflow (pre-authenticated) @regression', () => {
  test('add items and place an order end to end', async ({
    products,
    cart,
    checkout,
  }) => {
    // 1. Browse and add two products to the cart (already logged in).
    await products.open();
    await products.addToCart(0);
    await products.addToCart(1);

    // 2. Review the cart.
    await products.gotoCart();
    await cart.expectHasItems();
    expect(await cart.itemCount()).toBeGreaterThanOrEqual(2);

    // 3. Checkout → review (address details come from the account).
    await cart.proceedToCheckout();
    await checkout.expectAddressReview();
    await checkout.addComment('Please gift-wrap. Automated E2E order.');
    await checkout.placeOrder();

    // 4. Pay and confirm.
    await checkout.pay({
      name: 'QA Bot',
      number: '4111111111111111',
      cvc: '123',
      month: '12',
      year: '2030',
    });
    await checkout.expectOrderPlaced();
  });
});
