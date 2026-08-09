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
[`.github/rulesets/main.json`](.github/rulesets/main.json): PR required, the CI
checks (`Lint · Typecheck · Format`, `Unit tests (Vitest)`,
`Secret scan (gitleaks)`, `Tests (shard 1/2)`, `Tests (shard 2/2)`) must be green
and the branch up to date, and force-pushes/deletions are blocked. The repo admin
is on the bypass list for hotfixes.

GitHub does **not** auto-apply this file. Apply or update it with `gh`:

```bash
# first time
gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main.json

# update an existing ruleset (get <id> from the list)
gh api repos/<owner>/<repo>/rulesets
gh api -X PUT repos/<owner>/<repo>/rulesets/<id> --input .github/rulesets/main.json
```
