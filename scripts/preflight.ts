/**
 * CI's "can the live-site suites run" gate.
 *
 * Calls the same probe global-setup calls, so the preflight's verdict and the
 * run's behaviour cannot diverge. They used to: this job spoofed a browser user
 * agent via curl, the anti-bot let it through, and the suites it had just
 * cleared died in global-setup on the challenge. A skip condition that predicts
 * the opposite of what happens is worse than none, because the resulting
 * failure reads as a regression.
 *
 * Writes `blocked=true|false` to $GITHUB_OUTPUT and always exits 0 — being
 * blocked is a fact about the runner's IP, not a build failure.
 */
import { appendFileSync } from 'node:fs';

import { probeTarget } from '../src/reachability.js';

const SKIPPED_SUITES = 'api/e2e/e2e-auth/hybrid/a11y';

async function main(): Promise<void> {
  const base = process.env.BASE_URL ?? 'https://www.automationexercise.com';
  const result = await probeTarget(base);
  const output = process.env.GITHUB_OUTPUT;

  if (output) {
    appendFileSync(output, `blocked=${result.reachable ? 'false' : 'true'}\n`);
  }

  if (result.reachable) {
    console.log(`${base} returned real API content — running live-site suites.`);
    return;
  }

  // A warning, not an error. The suites are skipped, and the gates that do not
  // depend on the live site still have to pass.
  console.log(
    `::warning title=Live suites skipped::${base} is not usable from this runner — ` +
      `${result.detail} The ${SKIPPED_SUITES} suites are skipped; they run locally ` +
      '(residential IP). Unit, lint, typecheck and secret-scan gates still enforce quality here.',
  );
}

main().catch((error: unknown) => {
  // Even a broken probe must not fail the build: treat it as blocked and say so.
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    appendFileSync(output, 'blocked=true\n');
  }
  console.log(
    `::warning title=Preflight probe failed::${(error as Error).message} — ` +
      'treating the target as unreachable and skipping the live-site suites.',
  );
});
