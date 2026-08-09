/**
 * Fail fast with a clear message if the target isn't returning real content,
 * instead of letting every browser test time out with a confusing error.
 *
 * automationexercise.com serves an anti-bot JS challenge ("...your request is
 * being verified...") to datacenter IPs and headless automation, which returns
 * HTTP 200 with a challenge page instead of the app/API. We detect that here so
 * the failure is legible. In CI the live-site suites are skipped upstream by a
 * preflight step (see .github/workflows/e2e.yml), so this rarely fires there.
 */
async function globalSetup(): Promise<void> {
  const base = process.env.BASE_URL ?? 'https://www.automationexercise.com';
  let body = '';
  try {
    const res = await fetch(`${base}/api/productsList`);
    body = await res.text();
  } catch (err) {
    throw new Error(
      `[global-setup] Could not reach ${base} (${(err as Error).message}). ` +
        'Check connectivity before retrying.',
    );
  }

  if (!body.includes('"responseCode"')) {
    const blocked = /request is being verified|One moment, please/i.test(body);
    throw new Error(
      `[global-setup] ${base} is not returning real content — ` +
        (blocked
          ? 'the demo site is serving an anti-bot challenge. It blocks automated/datacenter ' +
            'traffic (incl. headless browsers and CI runners); run from a residential IP. ' +
            'CI skips the live-site suites automatically via the workflow preflight.'
          : 'unexpected response shape. The site may be down or changed.'),
    );
  }

  console.log(`[global-setup] ${base} is reachable — proceeding.`);
}

export default globalSetup;
