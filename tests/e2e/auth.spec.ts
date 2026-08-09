import { test, expect } from '../../src/fixtures/test.js';
import { makeUser, INVALID_CREDENTIALS } from '../../src/data/users.js';

test.describe('Authentication (E2E)', () => {
  test('a new user can register and then delete the account', async ({ auth }) => {
    const user = makeUser();

    await auth.register(user); // register() asserts "Logged in as {name}"

    // Cleanup: delete the account we just created (keeps the sandbox tidy).
    await auth.deleteAccount();
  });

  test('login with invalid credentials shows an error @smoke', async ({ auth }) => {
    await auth.open();
    await auth.login(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);
    await auth.expectLoginError();
  });

  test('signup with an already-registered email is rejected', async ({
    auth,
    registeredUser,
  }) => {
    // registeredUser is provisioned (and cleaned up) via API by the fixture.
    await auth.open();
    await auth.startSignup('Duplicate User', registeredUser.email);
    await auth.expectEmailExistsError();
  });

  test('a registered user can log in and log out', async ({ auth, registeredUser }) => {
    // Account is provisioned via API by the `registeredUser` fixture, which also
    // deletes it in teardown — so this test focuses purely on the login flow and
    // never leaks an account, even if an assertion below fails.
    await auth.open();
    await auth.login(registeredUser.email, registeredUser.password);
    await expect(auth.loggedInAs(registeredUser.name)).toBeVisible();
    await auth.logout();
    await expect(auth.loggedInAs(registeredUser.name)).toBeHidden();
  });
});
