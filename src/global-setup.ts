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

  if (!result.reachable) {
    throw new Error(
      `[global-setup] ${base} is not returning real content — ${result.detail}` +
        (result.blocked
          ? ' CI skips the live-site suites automatically via the workflow preflight.'
          : ''),
    );
  }

  console.log(`[global-setup] ${base} is reachable — proceeding.`);
}

export default globalSetup;
