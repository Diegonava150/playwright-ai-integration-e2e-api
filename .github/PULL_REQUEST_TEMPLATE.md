## What & why

<!-- Brief description of the change and the motivation. -->

## Type

- [ ] New/updated tests
- [ ] Page Object / API client change
- [ ] Framework / tooling / CI
- [ ] Docs

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:unit` passes
- [ ] Relevant Playwright suite(s) pass locally
- [ ] Specs import from `../../src/fixtures/test.js` and use Page Objects
- [ ] New accounts use the `registeredUser` fixture (no hard-coded accounts)
- [ ] Tagged appropriately (`@smoke` / `@regression` / `@ai`)
