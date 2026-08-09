# Contributing

Thanks for contributing! This repo is a Playwright + TypeScript E2E/API framework
with AI integration. A few conventions keep it consistent — most are enforced by
`tsc`, ESLint, and the pre-commit hook.

## Setup

```bash
npm install
npm run install:browsers
cp .env.example .env   # only needed for the AI suites
```

## Before you push

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (incl. eslint-plugin-playwright)
npm run format         # prettier --write
npm run test:unit      # fast Vitest unit tests (no network)
npm run test:api       # API suite (no browser)
```

The pre-commit hook runs `lint-staged` + `typecheck` automatically.

## Writing tests — the rules

- **Import from the fixtures barrel**, never `@playwright/test` directly:
  ```ts
  import { test, expect } from '../../src/fixtures/test.js';
  ```
  (Note the `.js` extension — ESM with `moduleResolution: Bundler`.)
- **Put selectors/actions in a Page Object** (`src/pages/`), keep specs at the
  workflow level. Prefer `data-qa`/role/stable selectors.
- **Pick the right home for the spec:**
  - `tests/api/` — pure API (no browser)
  - `tests/e2e/` — anonymous browser flows
  - `tests/e2e-auth/` — needs a logged-in user (reuses shared `storageState`)
  - `tests/hybrid/` — API + UI cross-checks
  - `tests/a11y/` — accessibility
  - `tests/ai/` — LLM assertions (`@ai`, gated on credentials)
  - `unit/` — Vitest unit tests for non-Playwright logic
- **Need a throwaway account?** Use the `registeredUser` fixture (API-provisioned,
  auto-deleted). Never hard-code accounts — the site is a shared public sandbox.
- **Tag** critical-path tests `@smoke`, broad flows `@regression`.
- **AI assertions are opt-in:** only in `tests/ai/`, tagged `@ai`, gated with
  `test.skip(({ ai }) => !ai.enabled, ...)`.

## AI-assisted authoring

The Playwright agents in `.claude/agents/` (planner, generator, healer) drive the
browser via MCP to author/repair tests. See `CLAUDE.md` for the full agent guide.

## PRs

Keep them focused, ensure the checks above pass, and fill in the PR template.

## Branch protection

`main` is protected by a ruleset defined as code in
[`.github/rulesets/main.json`](.github/rulesets/main.json): PR required, the
environment-independent CI checks (`Lint · Typecheck · Format`,
`Unit tests (Vitest)`, `Secret scan (gitleaks)`) must be green and the branch up
to date, and force-pushes/deletions are blocked. The repo admin is on the bypass
list for hotfixes.

The live-site suites are intentionally **not** required checks: the demo target
blocks datacenter IPs (see README → "Running against the live site in CI"), so
those jobs skip on CI runners and would otherwise leave required checks pending
forever.

GitHub does **not** auto-apply this file. It's already applied to this repo as
ruleset **20610171**. To update after editing the JSON:

```bash
gh api -X PUT repos/Diegonava150/playwright-ai-integration-e2e-api/rulesets/20610171 \
  --input .github/rulesets/main.json
```

For a fresh repo (e.g. a fork), create it and note the new id from the response:

```bash
gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main.json
gh api repos/<owner>/<repo>/rulesets   # list ids
```
