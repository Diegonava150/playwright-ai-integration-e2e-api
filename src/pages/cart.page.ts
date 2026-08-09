import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page.js';

export class CartPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/view_cart');
  }

  rows(): Locator {
    return this.page.locator('#cart_info_table tbody tr');
  }

  async itemCount(): Promise<number> {
    return this.rows().count();
  }

  async expectHasItems(): Promise<void> {
    await expect(this.rows().first()).toBeVisible();
  }

  /** The quantity shown for a cart row (rendered as a disabled button). */
  async quantityOf(index = 0): Promise<string> {
    return (
      await this.rows().nth(index).locator('.cart_quantity button').first().innerText()
    ).trim();
  }

  /** Remove a row via its delete (×) control; the row detaches via AJAX. */
  async removeItem(index = 0): Promise<void> {
    const row = this.rows().nth(index);
    await row.locator('.cart_quantity_delete').click();
    await expect(row).toBeHidden();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.page.getByText('Cart is empty!')).toBeVisible();
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.click('a.check_out');
  }

  /** When not logged in, checkout shows a "Register / Login" modal. */
  async registerLoginFromCheckout(): Promise<void> {
    await this.page.click('a[href="/login"]');
  }
}
