import { APIRequestContext, expect } from '@playwright/test';
import { z } from 'zod';
import { NewUser } from '../data/users.js';

/**
 * Typed wrapper around the automationexercise.com REST API.
 * Docs: https://www.automationexercise.com/api_list
 *
 * Note: this API is a teaching sandbox — it returns HTTP 200 even for logical
 * errors and encodes the real status inside a JSON `responseCode`. The wrapper
 * parses that body and exposes it, so tests assert on `responseCode`.
 *
 * Responses are validated with zod: if the API's shape ever changes, tests fail
 * with a precise "expected X got Y" instead of a downstream `undefined`.
 */

// ---- Schemas (single source of truth for response shapes) ----
export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.string(),
  brand: z.string().optional(),
  category: z.object({
    usertype: z.object({ usertype: z.string() }),
    category: z.string(),
  }),
});

export const ProductsResponseSchema = z.object({
  responseCode: z.number(),
  products: z.array(ProductSchema),
});

export const BrandsResponseSchema = z.object({
  responseCode: z.number(),
  brands: z.array(z.object({ id: z.number(), brand: z.string() })),
});

export type Product = z.infer<typeof ProductSchema>;

export interface ApiEnvelope<T = unknown> {
  responseCode: number;
  message?: string;
  data?: T;
  raw: unknown;
}

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  private async parse(
    res: Awaited<ReturnType<APIRequestContext['get']>>,
  ): Promise<ApiEnvelope> {
    const raw = await res.json().catch(async () => ({ text: await res.text() }));
    return {
      responseCode: (raw as { responseCode?: number }).responseCode ?? res.status(),
      ...(raw as object),
      raw,
    };
  }

  /** GET /api/productsList */
  async getAllProducts(): Promise<z.infer<typeof ProductsResponseSchema>> {
    const res = await this.request.get('/api/productsList');
    return ProductsResponseSchema.parse(await res.json());
  }

  /** POST /api/searchProduct  (form field: search_product) */
  async searchProduct(term: string): Promise<z.infer<typeof ProductsResponseSchema>> {
    const res = await this.request.post('/api/searchProduct', {
      form: { search_product: term },
    });
    return ProductsResponseSchema.parse(await res.json());
  }

  /** POST /api/verifyLogin  (form: email, password) */
  async verifyLogin(email: string, password: string): Promise<ApiEnvelope> {
    const res = await this.request.post('/api/verifyLogin', {
      form: { email, password },
    });
    return this.parse(res);
  }

  /** POST /api/verifyLogin without email — sandbox returns responseCode 400. */
  async verifyLoginMissingEmail(password: string): Promise<ApiEnvelope> {
    const res = await this.request.post('/api/verifyLogin', { form: { password } });
    return this.parse(res);
  }

  /** GET /api/brandsList */
  async getBrands(): Promise<z.infer<typeof BrandsResponseSchema>> {
    const res = await this.request.get('/api/brandsList');
    return BrandsResponseSchema.parse(await res.json());
  }

  /**
   * POST /api/createAccount — provisions an account without driving the UI.
   * Used by fixtures to set up test users quickly and deterministically.
   */
  async createAccount(user: NewUser): Promise<ApiEnvelope> {
    const res = await this.request.post('/api/createAccount', {
      form: {
        name: user.name,
        email: user.email,
        password: user.password,
        title: 'Mr',
        birth_date: '10',
        birth_month: '5',
        birth_year: '1990',
        firstname: user.firstName,
        lastname: user.lastName,
        company: user.company,
        address1: user.address,
        address2: '',
        country: user.country,
        zipcode: user.zipcode,
        state: user.state,
        city: user.city,
        mobile_number: user.mobile,
      },
    });
    return this.parse(res);
  }

  /** DELETE /api/deleteAccount — reliable teardown even if the UI is broken. */
  async deleteAccount(email: string, password: string): Promise<ApiEnvelope> {
    const res = await this.request.delete('/api/deleteAccount', {
      form: { email, password },
    });
    return this.parse(res);
  }

  /**
   * DELETE /api/productsList — the sandbox exposes this to demonstrate that a
   * non-supported method returns responseCode 405. Handy for negative tests.
   */
  async deleteProductsList(): Promise<ApiEnvelope> {
    const res = await this.request.delete('/api/productsList');
    return this.parse(res);
  }
}

/** Convenience matcher used across API specs. */
export function expectResponseCode(envelope: ApiEnvelope, code: number): void {
  expect(
    envelope.responseCode,
    `Expected responseCode ${code} but got ${envelope.responseCode}. Body: ${JSON.stringify(envelope.raw)}`,
  ).toBe(code);
}
