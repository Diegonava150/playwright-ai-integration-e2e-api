import fs from 'node:fs';
import { test as setup, expect } from '../../src/fixtures/test.js';
import { makeUser } from '../../src/data/users.js';
import { AUTH_STATE_FILE, AUTH_CREDS_FILE } from '../../src/fixtures/paths.js';

/**
 * Setup project: provision ONE shared account via API, log in through the UI to
 * capture a real session, and persist it as storageState. Authenticated projects
 * (`e2e-auth`) reuse this instead of re-registering per test — much faster and
 * far less pollution of the shared public sandbox. The paired `auth.teardown.ts`
 * (wired via the project's `teardown`) deletes the account afterwards.
 */
setup('provision shared user and capture storage state', async ({ page, api, auth }) => {
  const user = makeUser();

  const created = await api.createAccount(user);
  expect(
    created.responseCode,
    `createAccount failed: ${JSON.stringify(created.raw)}`,
  ).toBe(201);

  fs.mkdirSync('playwright/.auth', { recursive: true });
  fs.writeFileSync(AUTH_CREDS_FILE, JSON.stringify(user), 'utf8');

  // UI login to obtain the browser session cookie, then snapshot it.
  await auth.open();
  await auth.login(user.email, user.password);
  await expect(auth.loggedInAs(user.name)).toBeVisible();

  await page.context().storageState({ path: AUTH_STATE_FILE });
});
