import { defineConfig } from 'vitest/config';

/**
 * Unit tests (fast, no network, no browser) live in `unit/` and run under
 * Vitest. Playwright specs live in `tests/` and are collected separately by the
 * Playwright runner — the two never overlap.
 */
export default defineConfig({
  test: {
    include: ['unit/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    // The source uses ESM `.js` import specifiers that point at `.ts` files
    // (moduleResolution: Bundler). Rewrite them so Vite resolves the `.ts`.
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1' }],
  },
});
