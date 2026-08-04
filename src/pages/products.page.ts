import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page.js';

export class ProductsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/products');
    await expect(this.page.locator('h2', { hasText: 'All Products' })).toBeVisible();
  }

  productCards(): Locator {
    return this.page.locator('.features_items .product-image-wrapper');
  }

  async search(term: string): Promise<void> {
    await this.page.fill('#search_product', term);
    await this.page.click('#submit_search');
    await expect(this.page.locator('h2', { hasText: 'Searched Products' })).toBeVisible();
  }

  async count(): Promise<number> {
    return this.productCards().count();
  }

  /**
   * Hover a product card and click its "Add to cart" overlay button.
   * `index` is 0-based within the currently displayed grid.
   */
  async addToCart(index = 0): Promise<void> {
    const card = this.productCards().nth(index);
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await card.locator('.add-to-cart').first().click();
    // Modal: "Added! ... Continue Shopping"
    await this.page.click('button:has-text("Continue Shopping")');
  }

  async gotoCart(): Promise<void> {
    await this.page.click('a[href="/view_cart"]');
  }

  async firstProductName(): Promise<string> {
    return (
      await this.productCards().first().locator('.productinfo p').innerText()
    ).trim();
  }
}
