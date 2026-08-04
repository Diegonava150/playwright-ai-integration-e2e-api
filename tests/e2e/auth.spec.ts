import { test, expect } from '../../src/fixtures/test.js';
import { makeUser, INVALID_CREDENTIALS } from '../../src/data/users.js';

test.describe('Authentication (E2E)', () => {
  test('a new user can register and then delete the account', async ({ auth }) => {
    const user = makeUser();

    await auth.register(user); // register() asserts "Logged in as {name}"

    // Cleanup: delete the account we just created (keeps the sandbox tidy).
    await auth.deleteAccount();
  });

  test('login with invalid credentials shows an error', async ({ auth }) => {
    await auth.open();
    await auth.login(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);
    await auth.expectLoginError();
  });

  test('a registered user can log in and log out', async ({ auth, home }) => {
    const user = makeUser();
    await auth.register(user);
    await auth.logout();

    // Log back in with the same credentials.
    await auth.open();
    await auth.login(user.email, user.password);
    await expect(auth.loggedInAs(user.name)).toBeVisible();

    // Cleanup.
    await auth.deleteAccount();
  });
});
