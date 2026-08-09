import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page.js';
import { NewUser } from '../data/users.js';

/**
 * Covers /login (both the "New User Signup" and "Login" forms) and the
 * full account-registration form that follows signup.
 */
export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/login');
    await expect(this.page.locator('h2', { hasText: 'New User Signup!' })).toBeVisible();
  }

  // ---- Signup step 1: name + email ----
  async startSignup(name: string, email: string): Promise<void> {
    await this.page.fill('input[data-qa="signup-name"]', name);
    await this.page.fill('input[data-qa="signup-email"]', email);
    await this.page.click('button[data-qa="signup-button"]');
  }

  // ---- Signup step 2: full account details ----
  async fillAccountDetails(user: NewUser): Promise<void> {
    await expect(
      this.page.locator('b', { hasText: 'Enter Account Information' }),
    ).toBeVisible();

    await this.page.check('#id_gender1'); // Mr.
    await this.page.fill('#password', user.password);
    await this.page.selectOption('#days', '10');
    await this.page.selectOption('#months', '5');
    await this.page.selectOption('#years', '1990');
    await this.page.check('#newsletter');
    await this.page.check('#optin');

    await this.page.fill('#first_name', user.firstName);
    await this.page.fill('#last_name', user.lastName);
    await this.page.fill('#company', user.company);
    await this.page.fill('#address1', user.address);
    await this.page.selectOption('#country', user.country);
    await this.page.fill('#state', user.state);
    await this.page.fill('#city', user.city);
    await this.page.fill('#zipcode', user.zipcode);
    await this.page.fill('#mobile_number', user.mobile);

    await this.page.click('button[data-qa="create-account"]');
  }

  async expectAccountCreated(): Promise<void> {
    await expect(this.page.locator('h2[data-qa="account-created"]')).toContainText(
      'Account Created',
    );
    await this.page.click('a[data-qa="continue-button"]');
  }

  /** Full registration in one call — returns once the user is logged in. */
  async register(user: NewUser): Promise<void> {
    await this.open();
    await this.startSignup(user.name, user.email);
    await this.fillAccountDetails(user);
    await this.expectAccountCreated();
    await expect(this.loggedInAs(user.name)).toBeVisible();
  }

  // ---- Login form ----
  async login(email: string, password: string): Promise<void> {
    await this.page.fill('input[data-qa="login-email"]', email);
    await this.page.fill('input[data-qa="login-password"]', password);
    await this.page.click('button[data-qa="login-button"]');
  }

  async expectLoginError(): Promise<void> {
    await expect(
      this.page.locator('p', { hasText: 'Your email or password is incorrect!' }),
    ).toBeVisible();
  }

  async expectEmailExistsError(): Promise<void> {
    await expect(
      this.page.locator('p', { hasText: 'Email Address already exist!' }),
    ).toBeVisible();
  }

  /** Deletes the current account (cleanup for registration tests). */
  async deleteAccount(): Promise<void> {
    await this.page.click('a[href="/delete_account"]');
    await expect(this.page.locator('h2[data-qa="account-deleted"]')).toContainText(
      'Account Deleted',
    );
    await this.page.click('a[data-qa="continue-button"]');
  }
}
