# Prompt: heal a failing Playwright test

A test is failing. **Read `CLAUDE.md` first.** Diagnose and fix without weakening
coverage. Prefer fixing the Page Object over editing many specs.

## Steps
1. Read the failure (use `ai-summary.md` if present, plus the trace/HTML report).
2. Reproduce with `npx playwright test <file> --headed` or via the MCP browser.
3. Classify the root cause:
   - **Stale selector** → update the Page Object; use `data-qa`/role selectors.
   - **Timing/flake** → replace fixed waits with web-first assertions
     (`expect(locator).toBeVisible()` etc.).
   - **Site instability / consent overlay** → ensure
     `dismissConsentIfPresent()` runs; add resilient retries only if justified.
   - **Genuine app change** → update the expected behavior and note it.
   - **Real bug** → do NOT paper over it; report it clearly instead.
4. Re-run until green. Do not add `test.skip` to hide a real failure.

## Output
- The minimal diff that fixes the failure.
- A one-line root-cause classification.
- Confirmation the test now passes (paste the run result).
