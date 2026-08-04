import { APIRequestContext, expect } from '@playwright/test';

/**
 * Typed wrapper around the automationexercise.com REST API.
 * Docs: https://www.automationexercise.com/api_list
 *
 * Note: this API is a teaching sandbox — it returns HTTP 200 even for logical
 * errors and encodes the real status inside a JSON `responseCode`. The wrapper
 * parses that body and exposes it, so tests assert on `responseCode`.
 */

export interface ApiEnvelope<T = unknown> {
  responseCode: number;
  message?: string;
  data?: T;
  raw: unknown;
}

export interface Product {
  id: number;
  name: string;
  price: string;
  brand: string;
  category: { usertype: { usertype: string }; category: string };
}

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  private async parse(res: Awaited<ReturnType<APIRequestContext['get']>>): Promise<ApiEnvelope> {
    const raw = await res.json().catch(async () => ({ text: await res.text() }));
    return { responseCode: (raw as any).responseCode ?? res.status(), ...(raw as object), raw };
  }

  /** GET /api/productsList */
  async getAllProducts(): Promise<{ responseCode: number; products: Product[] }> {
    const res = await this.request.get('/api/productsList');
    const body = await res.json();
    return { responseCode: body.responseCode ?? res.status(), products: body.products ?? [] };
  }

  /** POST /api/searchProduct  (form field: search_product) */
  async searchProduct(term: string): Promise<{ responseCode: number; products: Product[] }> {
    const res = await this.request.post('/api/searchProduct', {
      form: { search_product: term },
    });
    const body = await res.json();
    return { responseCode: body.responseCode ?? res.status(), products: body.products ?? [] };
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
  async getBrands(): Promise<ApiEnvelope> {
    const res = await this.request.get('/api/brandsList');
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
