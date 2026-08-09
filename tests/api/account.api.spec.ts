import { test, expect } from '../../src/fixtures/test.js';
import { makeUser } from '../../src/data/users.js';

test.describe('Account API', () => {
  test('createAccount then deleteAccount round-trips @smoke', async ({ api }) => {
    const user = makeUser();

    const created = await api.createAccount(user);
    expect(created.responseCode).toBe(201);
    expect(created.message).toMatch(/user created/i);

    // verifyLogin should now succeed for the new account.
    const login = await api.verifyLogin(user.email, user.password);
    expect(login.responseCode).toBe(200);

    const deleted = await api.deleteAccount(user.email, user.password);
    expect(deleted.responseCode).toBe(200);
    expect(deleted.message).toMatch(/account deleted/i);
  });
});
