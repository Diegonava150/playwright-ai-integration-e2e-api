# Playwright AI E2E + API Framework

[![Playwright E2E + API](https://github.com/Diegonava150/playwright-ai-integration-e2e-api/actions/workflows/e2e.yml/badge.svg)](https://github.com/Diegonava150/playwright-ai-integration-e2e-api/actions/workflows/e2e.yml)

A Playwright + TypeScript test framework for **[automationexercise.com](https://www.automationexercise.com)**
— chosen because it exposes **both** a full e-commerce UI (register → browse →
cart → checkout → order) and a documented **REST API**, so one project genuinely
exercises Playwright's E2E _and_ API capabilities against the same domain.

It integrates AI at four reinforcing points without bloating the framework.

## The four AI integrations (and how they connect)

| #   | Integration                                                                       | Where                           | Shares with       |
| --- | --------------------------------------------------------------------------------- | ------------------------------- | ----------------- |
| 1   | **Playwright MCP** — drive a real browser to explore the site & author/heal tests | `.mcp.json`, `CLAUDE.md`        | Agent guide (2)   |
| 2   | **AI test generation** — NL spec → conforming spec file                           | `prompts/`, `CLAUDE.md`         | Agent guide (1)   |
| 3   | **In-test LLM assertions** — semantic checks a selector can't express             | `src/ai/ai-expect.ts`           | Claude client (4) |
| 4   | **AI CI reporting** — post-run failure triage                                     | `scripts/ai-failure-summary.ts` | Claude client (3) |

Two seams keep these cohesive instead of four bolt-ons:

- **One Claude client** (`src/ai/claude-client.ts`) powers both the runtime
  assertions (3) and the CI summarizer (4).
- **One agent guide** (`CLAUDE.md`) drives both the MCP browser workflow (1) and
  the test-generation prompts (2).

**Not saturated:** the LLM never runs in the default gate. AI assertions are
opt-in (`tests/ai/`, `@ai` tag, gated on `ANTHROPIC_API_KEY`), and the CI
summarizer degrades to a plain list when no key is present. The
`api` / `e2e` / `hybrid` suites make zero Claude calls.

## Architecture

```
src/
  ai/         claude-client.ts (shared, retry + credential resolution) · ai-expect.ts
  api/        api-client.ts (typed REST wrapper, zod-validated responses)
  pages/      base · home · auth · products · cart · checkout  (Page Objects)
  data/       users.ts (unique-user factory)
  fixtures/   test.ts  ← POMs + api + ai + registeredUser · paths.ts
  global-setup.ts   ← site health-check (fail fast if the target is down)
tests/
  setup/      auth.setup.ts (provision + capture session) · auth.teardown.ts (delete)
  api/        products · auth · account
  e2e/        auth · product-search · cart-management   (anonymous browser flows)
  e2e-auth/   full-purchase                      (reuses shared storageState)
  hybrid/     api-seeded-ui                       (API as an oracle for UI assertions)
  a11y/       accessibility (axe, known-issues baseline)
  ai/         ai-assertions (@ai, opt-in LLM checks)
  visual/     visual (VISUAL=1, per-platform pixel-diff baselines)
unit/         Vitest unit tests for the AI client (credentials, retry, verdict)
.claude/      agents/ (planner · generator · healer) + prompts/  (MCP authoring)
prompts/      generate-test.md · heal-test.md
scripts/      ai-failure-summary.ts · run-ai-oauth.ts
.github/workflows/
  e2e.yml               quality · unit · secrets-scan · sharded tests → merge → AI PR comment → Pages
  visual-baselines.yml  manual: generate Linux visual baselines
```

### Projects & the auth lifecycle

The `e2e-auth` project depends on a `setup` project that provisions **one** shared
account via the API, logs in through the UI to capture a real session, and saves
it as `storageState`. Authenticated tests reuse that session instead of
re-registering per test (the purchase flow dropped from ~18s to ~5s). A paired
`cleanup` teardown deletes the account after the run.

Tests that need their own throwaway account use the `registeredUser` fixture,
whose teardown deletes via API — so a mid-test failure **never leaks an account**.

## Setup

```bash
npm install
npm run install:browsers        # chromium + OS deps
cp .env.example .env            # add Claude credentials only if you want AI features
```

## Running

```bash
npm test                # everything (default projects)
npm run test:api        # pure API suite
npm run test:e2e        # anonymous browser E2E
npm run test:e2e:auth   # pre-authenticated flows (runs setup + teardown)
npm run test:hybrid     # API + UI cross-checks
npm run test:a11y       # accessibility (axe)
npm run test:smoke      # @smoke critical-path subset (fast PR gate)
npm run test:cross      # cross-browser: firefox + webkit + mobile (installs needed)
npm run test:visual     # pixel-diff visual regression (needs baselines)
npm run test:visual:update   # (re)generate visual baselines (current OS)
npm run test:unit       # Vitest unit tests for the AI client (no network)
npm run test:ai         # LLM-assertion demos (needs a credential in .env)
npm run test:ai:oauth   # same, but pulls an OAuth token from `ant` on the fly
npm run test:ui         # Playwright UI mode
npm run report          # open the HTML report
npm run ai:summary      # AI triage of the last run → ai-summary.md

# quality gates
npm run typecheck       # tsc --noEmit
npm run lint            # eslint (incl. eslint-plugin-playwright)
npm run format          # prettier --write
```

The default gate needs **no API key**; only the `@ai` suite calls Claude.
`test:cross` and `test:visual` are env-gated (`CROSS_BROWSER` / `VISUAL`) so they
don't run — or require extra browsers/baselines — unless you ask for them.

## AI features in detail

### In-test LLM assertions

```ts
// tests/ai/*.spec.ts — opt in via the `ai` fixture
await ai.expectText('The cart contains at least one product with a quantity and total.');
await ai.expectVisual(
  'The screenshot shows a coherent product grid, not a broken layout.',
);
```

Backed by `claude-opus-4-8` with adaptive thinking + structured outputs; the
verdict is asserted with a normal `expect`, so it lands in the HTML report.

### Playwright MCP (authoring/healing)

`.mcp.json` registers `@playwright/mcp`. With Claude Code, the agent can open the
live site, snapshot the DOM, confirm selectors, and then write/heal tests using
`prompts/generate-test.md` and `prompts/heal-test.md` — all guided by `CLAUDE.md`.

### AI CI reporting

After a run, `npm run ai:summary` reads `test-results/results.json`, groups
failures, guesses root causes (app bug vs flaky selector vs site instability vs
data), and writes `ai-summary.md`. In CI it's posted to the GitHub job summary
**and upserted as a PR comment** (with a link to the full HTML report + traces).

The CI pipeline runs a **sharded matrix**, uploads each shard's blob report, then
a `merge` job combines them into one HTML + JSON report before AI triage. Separate
jobs run `quality` (typecheck + lint + format-check), `unit` (Vitest), and
`secrets-scan` (gitleaks) on every push/PR. On pushes to `main`, `deploy-report`
publishes the HTML report to **GitHub Pages** (enable Settings → Pages → Source:
"GitHub Actions").

To enable AI triage in CI, add an **`ANTHROPIC_API_KEY`** repository secret
(Settings → Secrets and variables → Actions → New repository secret). Without it,
the summary step posts the plain failure list and the pipeline still passes.

## Configuration

| Env var                | Default                              | Purpose                                                                 |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`    | —                                    | Enables AI features (3)/(4) via API key                                 |
| `ANTHROPIC_AUTH_TOKEN` | —                                    | Enables AI features via an OAuth bearer token (see below)               |
| `AI_ENABLED`           | —                                    | Force-enable AI features when the SDK resolves an on-disk `ant` profile |
| `BASE_URL`             | `https://www.automationexercise.com` | Target site                                                             |
| `AI_MODEL`             | `claude-opus-4-8`                    | Model for AI features                                                   |
| `AI_EFFORT`            | `low`                                | Reasoning effort for AI calls                                           |
| `AI_MIN_CONFIDENCE`    | `0.7`                                | Min confidence for an `aiExpect` verdict to pass                        |
| `CROSS_BROWSER`        | —                                    | Register firefox/webkit/mobile projects                                 |
| `VISUAL`               | —                                    | Register the visual-regression project                                  |

### Credentials for the AI layer

The AI features accept any one of three sources (checked in this order):

1. **`ANTHROPIC_API_KEY`** — simplest; also what CI uses (the workflow reads
   `secrets.ANTHROPIC_API_KEY`).
2. **`ANTHROPIC_AUTH_TOKEN`** — an OAuth bearer token. The client automatically
   adds the required `anthropic-beta: oauth-2025-04-20` header for you. Produce one
   with `eval "$(ant auth print-credentials --env)"` (token is short-lived).
3. **`AI_ENABLED=1`** — force-enable when a bare `new Anthropic()` can resolve an
   `ant auth login` profile from disk.

> **OAuth note:** the Playwright suite runs as a **standalone Node process** and
> does **not** share Claude Code's OAuth session. To use OAuth here you must make a
> token available to that process via option 2 or 3 above. For a test framework,
> an API key (option 1) is usually the least friction — CI needs one regardless.

**`npm run test:ai:oauth`** automates option 2: it shells out to `ant auth
print-credentials`, injects the token as `ANTHROPIC_AUTH_TOKEN`, and runs the AI
suite — no manual `eval` needed. Requires the `ant` CLI + `ant auth login`. Extra
args pass through: `npm run test:ai:oauth -- --headed`.

## Visual regression baselines

Baselines are **per-platform** (`…-visual-win32.png` vs `…-visual-linux.png`), so
CI (Ubuntu) needs Linux baselines. Generate them one of two ways:

- **CI:** run the `visual-baselines` GitHub Action (workflow_dispatch), download
  the `visual-baselines` artifact, and commit it under `tests/visual/__screenshots__/`.
- **Locally, with Docker** (matches the CI image):
  ```bash
  docker run --rm -v "$PWD":/work -w /work -e VISUAL=1 \
    mcr.microsoft.com/playwright:v1.62.1-jammy \
    npm ci && npm run test:visual:update
  ```

`npm run test:visual:update` on your own OS produces baselines for that OS only.

## Notes

automationexercise.com is a shared public sandbox: tests create unique accounts
per run and delete them afterward, assert on the API's `responseCode`-in-body
convention, and dismiss the occasional Google consent overlay automatically.
