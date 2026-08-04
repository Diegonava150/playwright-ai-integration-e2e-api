import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  protected consentButton(): Locator {
    // automationexercise shows a Google "consent to cookies" iframe on some runs.
    return this.page.locator('button:has-text("Consent"), .fc-cta-consent');
  }

  /** Dismiss the cookie/consent overlay if present so it doesn't eat clicks. */
  async dismissConsentIfPresent(): Promise<void> {
    const btn = this.consentButton().first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => undefined);
    }
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.dismissConsentIfPresent();
  }

  loggedInAs(name: string): Locator {
    return this.page.locator('a', { hasText: `Logged in as ${name}` });
  }

  async logout(): Promise<void> {
    await this.page.click('a[href="/logout"]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Automation Exercise/i);
  }
}
