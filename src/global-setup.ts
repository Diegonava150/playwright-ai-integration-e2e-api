/**
 * Fail fast with a clear message if the target site is unreachable, instead of
 * letting every browser test time out with a confusing error. Runs once before
 * the whole suite (wired via `globalSetup` in playwright.config.ts).
 */
async function globalSetup(): Promise<void> {
  const base = process.env.BASE_URL ?? 'https://www.automationexercise.com';
  try {
    const res = await fetch(base, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(
      `[global-setup] Target site ${base} is unreachable (${(err as Error).message}). ` +
        'Aborting the run — check connectivity or the site status before retrying.',
    );
  }
  console.log(`[global-setup] ${base} is reachable — proceeding.`);
}

export default globalSetup;
