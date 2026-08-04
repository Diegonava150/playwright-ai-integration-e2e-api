# Playwright AI E2E + API Framework

A Playwright + TypeScript test framework for **[automationexercise.com](https://www.automationexercise.com)**
— chosen because it exposes **both** a full e-commerce UI (register → browse →
cart → checkout → order) and a documented **REST API**, so one project genuinely
exercises Playwright's E2E *and* API capabilities against the same domain.

It integrates AI at four reinforcing points without bloating the framework.

## The four AI integrations (and how they connect)

| # | Integration | Where | Shares with |
|---|-------------|-------|-------------|
| 1 | **Playwright MCP** — drive a real browser to explore the site & author/heal tests | `.mcp.json`, `CLAUDE.md` | Agent guide (2) |
| 2 | **AI test generation** — NL spec → conforming spec file | `prompts/`, `CLAUDE.md` | Agent guide (1) |
| 3 | **In-test LLM assertions** — semantic checks a selector can't express | `src/ai/ai-expect.ts` | Claude client (4) |
| 4 | **AI CI reporting** — post-run failure triage | `scripts/ai-failure-summary.ts` | Claude client (3) |

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
  ai/         claude-client.ts (shared)  ·  ai-expect.ts (aiExpect)
  api/        api-client.ts (typed REST wrapper)
  pages/      base · home · auth · products · cart · checkout  (Page Objects)
  data/       users.ts (unique-user factory)
  fixtures/   test.ts  ← extends Playwright test with POMs + api + ai
tests/
  e2e/        auth · product-search · full-purchase (complete workflow)
  api/        products · auth
  hybrid/     api-seeded-ui (API as an oracle for UI assertions)
  ai/         ai-assertions (@ai, opt-in LLM checks)
prompts/      generate-test.md · heal-test.md
scripts/      ai-failure-summary.ts
.github/workflows/e2e.yml
```

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
npm run test:e2e        # browser E2E suite
npm run test:hybrid     # API + UI cross-checks
npm run test:ai         # LLM-assertion demos (needs a credential in .env)
npm run test:ai:oauth   # same, but pulls an OAuth token from `ant` on the fly
npm run test:ui         # Playwright UI mode
npm run report          # open the HTML report
npm run ai:summary      # AI triage of the last run → ai-summary.md
```

The default gate (`api` + `e2e` + `hybrid`) needs **no API key**.

## AI features in detail

### In-test LLM assertions
```ts
// tests/ai/*.spec.ts — opt in via the `ai` fixture
await ai.expectText('The cart contains at least one product with a quantity and total.');
await ai.expectVisual('The screenshot shows a coherent product grid, not a broken layout.');
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
data), and writes `ai-summary.md`. In CI it's posted to the GitHub job summary.

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `ANTHROPIC_API_KEY` | — | Enables AI features (3)/(4) via API key |
| `ANTHROPIC_AUTH_TOKEN` | — | Enables AI features via an OAuth bearer token (see below) |
| `AI_ENABLED` | — | Force-enable AI features when the SDK resolves an on-disk `ant` profile |
| `BASE_URL` | `https://www.automationexercise.com` | Target site |
| `AI_MODEL` | `claude-opus-4-8` | Model for AI features |
| `AI_EFFORT` | `low` | Reasoning effort for AI calls |

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

## Notes

automationexercise.com is a shared public sandbox: tests create unique accounts
per run and delete them afterward, assert on the API's `responseCode`-in-body
convention, and dismiss the occasional Google consent overlay automatically.
