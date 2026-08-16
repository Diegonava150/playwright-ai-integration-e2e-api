/**
 * One implementation of "can the live-site suites run at all", shared by the CI
 * preflight and by global-setup.
 *
 * It is shared because the two disagreed, and disagreed silently. The preflight
 * probed with `curl -A "Mozilla/5.0 (X11; Linux x86_64)"`; global-setup probed
 * with Node's `fetch`, which sends its own user agent. automationexercise.com
 * serves its anti-bot challenge based on who is asking, so the spoofed request
 * was let through and the honest one was not.
 *
 * The gate therefore passed because it lied about its identity, then the run it
 * had just cleared failed on the challenge it was meant to detect. A skip
 * condition that reports the opposite of what the run will do is worse than no
 * skip condition, because the failure now looks like a real regression.
 *
 * Sharing the code is the fix rather than aligning two copies: aligning them
 * leaves the next edit free to pull them apart again, and this drift produced
 * no error of its own — both halves worked, they simply answered different
 * questions.
 */

/** The endpoint used to decide reachability: cheap, unauthenticated, and JSON. */
export const PROBE_PATH = '/api/productsList';

/** Marker that only real API content contains. */
const REAL_CONTENT = '"responseCode"';

/** Text the interstitial challenge page serves in place of the app. */
const CHALLENGE = /request is being verified|One moment, please/i;

export type Reachability =
  { reachable: true } | { reachable: false; blocked: boolean; detail: string };

/**
 * Ask the target whether it is serving real content to *this* caller.
 *
 * <p>Deliberately plain `fetch`, with no user agent of its own. The point is to
 * be treated exactly as the suites will be treated, so anything that makes this
 * request more welcome than a test's request makes the answer useless.
 */
export async function probeTarget(base: string): Promise<Reachability> {
  let body: string;
  try {
    const response = await fetch(`${base}${PROBE_PATH}`);
    body = await response.text();
  } catch (error) {
    return {
      reachable: false,
      blocked: false,
      detail: `could not reach ${base} (${(error as Error).message}). Check connectivity before retrying.`,
    };
  }

  if (body.includes(REAL_CONTENT)) {
    return { reachable: true };
  }

  if (CHALLENGE.test(body)) {
    return {
      reachable: false,
      blocked: true,
      detail:
        'the demo site is serving an anti-bot challenge. It blocks automated/datacenter ' +
        'traffic (incl. headless browsers and CI runners); run from a residential IP.',
    };
  }

  return {
    reachable: false,
    blocked: false,
    detail: 'unexpected response shape. The site may be down or changed.',
  };
}
