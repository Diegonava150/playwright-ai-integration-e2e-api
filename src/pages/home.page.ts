import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page.js';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/');
    await this.expectLoaded();
  }

  async gotoLogin(): Promise<void> {
    await this.page.click('a[href="/login"]');
  }

  async gotoProducts(): Promise<void> {
    await this.page.click('a[href="/products"]');
  }

  async gotoCart(): Promise<void> {
    await this.page.click('a[href="/view_cart"]');
  }

  async expectSlider(): Promise<void> {
    await expect(this.page.locator('#slider')).toBeVisible();
  }
}
