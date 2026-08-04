import { test, expect } from '../../src/fixtures/test.js';
import { expectResponseCode } from '../../src/api/api-client.js';
import { INVALID_CREDENTIALS } from '../../src/data/users.js';

test.describe('Auth API', () => {
  test('verifyLogin with unregistered credentials returns 404', async ({ api }) => {
    const res = await api.verifyLogin(
      INVALID_CREDENTIALS.email,
      INVALID_CREDENTIALS.password,
    );
    expectResponseCode(res, 404);
    expect(res.message).toMatch(/user not found/i);
  });

  test('verifyLogin without email parameter returns 400', async ({ api }) => {
    const res = await api.verifyLoginMissingEmail('somepassword');
    expectResponseCode(res, 400);
    expect(res.message).toMatch(/bad request/i);
  });
});
