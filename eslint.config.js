import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'blob-report/',
      'playwright/.cache/',
      'playwright/.auth/',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Playwright-specific lint (catches un-awaited expects, .only, bad waits, ...).
  { ...playwright.configs['flat/recommended'], files: ['tests/**/*.ts'] },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Assertions live inside Page Objects / helpers, so the plugin's direct
      // `expect` heuristic yields false positives here.
      'playwright/expect-expect': 'off',
      // `test.skip(({ ai }) => ...)` gates the AI suite on credentials — intended.
      'playwright/no-skipped-test': 'off',
    },
  },
  {
    // setup/teardown legitimately branch on filesystem state.
    files: ['tests/setup/**/*.ts'],
    rules: { 'playwright/no-conditional-in-test': 'off' },
  },
  // The report-walking summarizer is inherently dynamic; allow `any` there.
  {
    files: ['scripts/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  prettier,
);
