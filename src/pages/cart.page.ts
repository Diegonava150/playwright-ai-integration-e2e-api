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

  async proceedToCheckout(): Promise<void> {
    await this.page.click('a.check_out');
  }

  /** When not logged in, checkout shows a "Register / Login" modal. */
  async registerLoginFromCheckout(): Promise<void> {
    await this.page.click('a[href="/login"]');
  }
}
