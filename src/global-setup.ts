/**
 * Fail fast with a clear message if the target isn't returning real content,
 * instead of letting every browser test time out with a confusing error.
 *
 * automationexercise.com serves an anti-bot JS challenge ("...your request is
 * being verified...") to datacenter IPs and headless automation, which returns
 * HTTP 200 with a challenge page instead of the app/API.
 *
 * The detection itself lives in `reachability.ts` because CI's preflight has to
 * reach the same verdict, and previously did not — it probed with a spoofed
 * browser user agent, was let through, and cleared a run that then failed here
 * on the very challenge it was supposed to catch. Both now call one function,
 * so the two cannot answer differently.
 */
import { probeTarget } from './reachability.js';

async function globalSetup(): Promise<void> {
  const base = process.env.BASE_URL ?? 'https://www.automationexercise.com';
  const result = await probeTarget(base);

  if (result.reachable) {
    console.log(`[global-setup] ${base} is reachable — proceeding.`);
    return;
  }

  // Being blocked is a fact about this machine's IP, not about the code, so it
  // is not a build failure. The `skipWhenTargetBlocked` fixture skips each test
  // individually, which puts the reason in the report next to the tests it
  // explains instead of in a stack trace at startup.
  //
  // Failing here instead is what CI used to do, and combined with a preflight
  // job on a *different* runner it produced the worst version of this: a green
  // gate followed by a red run, for a reason neither of them was really about.
  if (result.blocked) {
    console.log(
      `[global-setup] ${base} is serving an anti-bot challenge to this machine — ${result.detail} ` +
        'The live-site suites will be skipped. They run from a residential IP.',
    );
    return;
  }

  // Down, or answering with something unrecognised. That is a real signal and
  // nothing downstream can interpret it, so stop here rather than reporting a
  // suite's worth of confusing failures.
  throw new Error(
    `[global-setup] ${base} is not returning real content — ${result.detail}`,
  );
}

export default globalSetup;
