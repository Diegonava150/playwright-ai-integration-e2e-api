import { test, expect } from '../../src/fixtures/test.js';
import { makeUser } from '../../src/data/users.js';

/**
 * The flagship end-to-end workflow: register → browse → add to cart →
 * checkout → pay → order placed → cleanup. This is the "complete workflow"
 * that exercises the full stack of Playwright E2E capabilities.
 */
test.describe('Complete purchase workflow (E2E)', () => {
  test('register, add items, and place an order end to end', async ({
    home,
    auth,
    products,
    cart,
    checkout,
  }) => {
    const user = makeUser();

    // 1. Register a fresh account.
    await auth.register(user);

    // 2. Browse and add two products to the cart.
    await products.open();
    await products.addToCart(0);
    await products.addToCart(1);

    // 3. Review the cart.
    await products.gotoCart();
    await cart.expectHasItems();
    expect(await cart.itemCount()).toBeGreaterThanOrEqual(2);

    // 4. Proceed to checkout — since we're logged in, we go straight to review.
    await cart.proceedToCheckout();
    await checkout.expectAddressReview();
    await checkout.addComment('Please gift-wrap. Automated E2E order.');
    await checkout.placeOrder();

    // 5. Pay and confirm the order was placed.
    await checkout.pay({
      name: `${user.firstName} ${user.lastName}`,
      number: '4111111111111111',
      cvc: '123',
      month: '12',
      year: '2030',
    });
    await checkout.expectOrderPlaced();

    // 6. Cleanup: delete the account.
    await home.open();
    await auth.deleteAccount();
  });
});
