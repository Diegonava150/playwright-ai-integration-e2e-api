# Prompt: generate a Playwright test from a natural-language spec

You are generating a test for this repo. **Read `CLAUDE.md` first** and follow
every convention there. Use the Playwright MCP server to inspect the live site
and confirm selectors before writing code — do not guess DOM structure.

## Inputs
- **Scenario** (fill in): _e.g. "A logged-in user removes an item from the cart
  and the cart total updates."_
- **Layer**: e2e | api | hybrid | ai

## Steps
1. If a Page Object or API method for this flow is missing, add it to
   `src/pages/` or `src/api/api-client.ts` first — keep specs declarative.
2. Drive the flow once via MCP to capture the real selectors / response shapes.
3. Write the spec under the matching `tests/<layer>/` directory.
4. Import `test`/`expect` from `../../src/fixtures/test.js`.
5. For any assertion a selector can't express, consider an `@ai` variant in
   `tests/ai/` using `ai.expectText` / `ai.expectVisual`.
6. Run `npx playwright test <new-file>` and iterate until green.

## Output
- The new/updated Page Object or API method (if any).
- The spec file.
- The exact command to run it.

## Guardrails
- Unique users via `makeUser()`; clean up accounts you create.
- No hard-coded credentials or waits for fixed times; use web-first assertions.
- Keep AI assertions opt-in and tagged `@ai`.
