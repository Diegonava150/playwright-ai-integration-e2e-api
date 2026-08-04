/**
 * Test data + factories. automationexercise.com is a shared public sandbox, so
 * we generate a unique account per run to avoid collisions with other users.
 */

export interface NewUser {
  name: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobile: string;
}

let counter = 0;

export function makeUser(): NewUser {
  // Combine time + counter for uniqueness within and across runs.
  const stamp = `${Date.now()}${counter++}`;
  return {
    name: `QA Bot ${stamp}`,
    email: `qa.bot.${stamp}@example.com`,
    password: 'Sup3rSecret!42',
    firstName: 'QA',
    lastName: 'Bot',
    company: 'Playwright Labs',
    address: '221B Baker Street',
    country: 'United States',
    state: 'California',
    city: 'San Francisco',
    zipcode: '94016',
    mobile: '5551234567',
  };
}

/** Credentials that are guaranteed NOT to exist — for negative auth tests. */
export const INVALID_CREDENTIALS = {
  email: 'definitely.not.registered@example.com',
  password: 'wrong-password',
};
