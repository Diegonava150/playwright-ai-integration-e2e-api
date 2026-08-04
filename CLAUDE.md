# Agent guide — Playwright AI E2E/API framework

This file orients an AI agent (Claude Code via the Playwright MCP server, or a
test-generation prompt) working in this repo. It is the shared context for **both**
the MCP browser-driving setup and the `prompts/` test-generation workflow.

## What this project is

A Playwright + TypeScript framework testing **automationexercise.com**, covering
both **E2E** (browser) and **API** flows, with AI woven in at four points:

1. **Playwright MCP** (`.mcp.json`) — lets you drive a real browser to explore
   the site and observe true DOM structure before writing tests.
2. **AI test generation** (`prompts/`) — turn a natural-language spec into a spec
   file that fits this project's conventions.
3. **In-test LLM assertions** (`src/ai/ai-expect.ts`) — `aiExpect` for semantic
   checks a selector can't express.
4. **AI CI reporting** (`scripts/ai-failure-summary.ts`) — post-run triage.

## Conventions you MUST follow when writing or editing tests

- **Import from the fixtures barrel**, never from `@playwright/test` directly:
  ```ts
  import { test, expect } from '../../src/fixtures/test.js';
  ```
  (Note the `.js` extension — this is an ESM project with `moduleResolution: Bundler`.)
- **Use Page Objects** in `src/pages/`. Add new selectors/actions to the POM, not
  inline in specs. Keep specs readable at the workflow level.
- **Use the `api` fixture** (`src/api/api-client.ts`) for API calls; assert on
  `responseCode` (this sandbox returns HTTP 200 with the real code in the body).
- **Prefer role/`data-qa`/stable selectors.** automationexercise exposes
  `data-qa` attributes on auth/checkout controls — use them.
- **Generate unique users** with `makeUser()` from `src/data/users.ts`; the site
  is a shared public sandbox, so never hard-code an account. Delete accounts you
  create (`auth.deleteAccount()`).
- **AI assertions are opt-in.** Only use `ai.expectText` / `ai.expectVisual` in
  specs under `tests/ai/`, tag them `@ai`, and gate with
  `test.skip(({ ai }) => !ai.enabled, ...)`.

## Project layout

```
src/ai/        Claude client (shared) + aiExpect helper
src/api/       Typed API client (zod-validated responses)
src/pages/     Page Objects (base, home, auth, products, cart, checkout)
src/data/      Test-data factories
src/fixtures/  test.ts — POMs + api + ai + registeredUser; paths.ts
src/global-setup.ts   Site health-check (fail fast if the target is down)
tests/setup/   auth.setup.ts (provision + storageState) + auth.teardown.ts (delete)
tests/api/     Pure API specs
tests/e2e/     Anonymous browser workflows
tests/e2e-auth/ Pre-authenticated flows (reuse shared storageState)
tests/hybrid/  API + UI cross-verification
tests/a11y/    Accessibility (axe, known-issues baseline)
tests/ai/      LLM-assertion demos (@ai)
tests/visual/  Pixel-diff visual regression (VISUAL=1)
prompts/       AI test-generation / healing prompts
scripts/       AI CI failure summarizer + OAuth test runner
```

Conventions added since the base guide:

- For a test that needs its own account, use the **`registeredUser`** fixture
  (API-provisioned; auto-deleted in teardown, even on failure). For flows that
  just need "a logged-in user", put the spec in **`tests/e2e-auth/`** — the
  context is already authenticated via shared `storageState`; don't register.
- Tag critical-path tests **`@smoke`**; broad flows **`@regression`**.
- Run `npm run lint` / `npm run typecheck` before finishing; both must pass.

## Site facts (verify with MCP before relying on them)

- Base URL: `https://www.automationexercise.com`
- Auth: `/login` has a "New User Signup" form (`data-qa=signup-name/-email/-button`)
  and a "Login" form (`data-qa=login-email/-password/-button`).
- Products: `/products`, search input `#search_product`, submit `#submit_search`,
  cards `.features_items .product-image-wrapper`, `.add-to-cart` overlay button.
- Cart: `/view_cart`, rows in `#cart_info_table`.
- API docs: `https://www.automationexercise.com/api_list` — note the
  `responseCode`-in-body convention.
- A Google consent iframe sometimes appears; `BasePage.dismissConsentIfPresent()`
  handles it.

## Using the Playwright MCP server

The MCP server (`@playwright/mcp`) lets you open pages, snapshot the accessibility
tree, click, and read the real DOM. Recommended loop when authoring a new test:

1. Navigate to the target page and take a snapshot.
2. Confirm the selectors in the relevant Page Object still match.
3. Write/adjust the POM, then the spec, following the conventions above.
4. Run `npx playwright test <file>` to verify.
