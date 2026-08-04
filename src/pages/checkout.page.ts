import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page.js';

export class CheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectAddressReview(): Promise<void> {
    await expect(
      this.page.locator('h2', { hasText: 'Address Details' }),
    ).toBeVisible();
    await expect(
      this.page.locator('h2', { hasText: 'Review Your Order' }),
    ).toBeVisible();
  }

  async addComment(comment: string): Promise<void> {
    await this.page.fill('textarea[name="message"]', comment);
  }

  async placeOrder(): Promise<void> {
    await this.page.click('a[href="/payment"]');
  }

  async pay(card: {
    name: string;
    number: string;
    cvc: string;
    month: string;
    year: string;
  }): Promise<void> {
    await this.page.fill('[data-qa="name-on-card"]', card.name);
    await this.page.fill('[data-qa="card-number"]', card.number);
    await this.page.fill('[data-qa="cvc"]', card.cvc);
    await this.page.fill('[data-qa="expiry-month"]', card.month);
    await this.page.fill('[data-qa="expiry-year"]', card.year);
    await this.page.click('[data-qa="pay-button"]');
  }

  async expectOrderPlaced(): Promise<void> {
    await expect(
      this.page.locator('h2[data-qa="order-placed"], h2:has-text("Order Placed")'),
    ).toBeVisible();
  }
}
