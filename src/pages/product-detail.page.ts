import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page.js';

/** Single product page: /product_details/{id} — supports quantity selection. */
export class ProductDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(id: number): Promise<void> {
    await this.goto(`/product_details/${id}`);
    await expect(this.page.locator('.product-information h2')).toBeVisible();
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.page.fill('#quantity', String(quantity));
  }

  async addToCart(): Promise<void> {
    await this.page.click('button.cart');
    // Modal offers "View Cart" / "Continue Shopping".
    await expect(this.page.locator('#cartModal')).toBeVisible();
  }

  async viewCart(): Promise<void> {
    await this.page.click('#cartModal a[href="/view_cart"]');
  }
}
