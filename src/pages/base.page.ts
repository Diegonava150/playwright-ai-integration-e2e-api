import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Dismiss the Google "funding choices" cookie-consent overlay if present.
   * On datacenter IPs (e.g. CI runners) this overlay appears and blocks clicks;
   * it may be a same-document element or live inside a consent iframe.
   * Best-effort and fast — never throws.
   */
  async dismissConsentIfPresent(): Promise<void> {
    const selector =
      '.fc-cta-consent, .fc-cta-do-not-consent, button:has-text("Consent")';

    const inline = this.page.locator(selector).first();
    if (await inline.isVisible().catch(() => false)) {
      await inline.click().catch(() => undefined);
      return;
    }

    const frame = this.page
      .frameLocator('iframe[src*="fundingchoices" i], iframe[title*="consent" i]')
      .first();
    const frameBtn = frame.locator(selector).first();
    if (await frameBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await frameBtn.click().catch(() => undefined);
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
