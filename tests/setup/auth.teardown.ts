import fs from 'node:fs';
import { test as teardown } from '../../src/fixtures/test.js';
import { AUTH_STATE_FILE, AUTH_CREDS_FILE } from '../../src/fixtures/paths.js';
import type { NewUser } from '../../src/data/users.js';

/**
 * Teardown project (runs after the authenticated suites via the setup project's
 * `teardown` reference): delete the shared account provisioned in auth.setup.ts.
 */
teardown('delete shared user', async ({ api }) => {
  if (!fs.existsSync(AUTH_CREDS_FILE)) return;
  const user = JSON.parse(fs.readFileSync(AUTH_CREDS_FILE, 'utf8')) as NewUser;
  await api.deleteAccount(user.email, user.password);
  fs.rmSync(AUTH_CREDS_FILE, { force: true });
  fs.rmSync(AUTH_STATE_FILE, { force: true });
});
