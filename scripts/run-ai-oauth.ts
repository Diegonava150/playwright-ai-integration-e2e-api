/**
 * Run the AI suite using an OAuth token from the `ant` CLI.
 *
 * This exists because the Playwright process is standalone — it does NOT share
 * Claude Code's OAuth session. This helper fetches a short-lived token from
 * `ant auth print-credentials`, injects it as ANTHROPIC_AUTH_TOKEN (the client
 * adds the required oauth beta header), and spawns `playwright test --project=ai`.
 *
 * Cross-platform (works via `npm run test:ai:oauth` on Windows and POSIX),
 * unlike a raw `eval "$(ant ...)"` shell one-liner.
 *
 * Requires the `ant` CLI + an active profile (`ant auth login`). Any extra args
 * are forwarded to Playwright, e.g.:
 *   npm run test:ai:oauth -- --headed --grep "cart"
 */
import { execSync, spawnSync } from 'node:child_process';

function fail(msg: string): never {
  console.error(`\n[test:ai:oauth] ${msg}\n`);
  process.exit(1);
}

// 1. Confirm `ant` is installed.
try {
  execSync('ant --version', { stdio: 'ignore' });
} catch {
  fail(
    'The `ant` CLI is not installed. Install it (see the Anthropic CLI docs) and ' +
      'run `ant auth login`, or use an API key in .env and run `npm run test:ai`.',
  );
}

// 2. Confirm there is an active credential source.
try {
  execSync('ant auth status', { stdio: 'ignore' });
} catch {
  fail('No active `ant` credential. Run `ant auth login` first.');
}

// 3. Fetch a bare access token.
let token: string;
try {
  token = execSync('ant auth print-credentials --access-token', {
    encoding: 'utf8',
  }).trim();
} catch (err) {
  fail(`Failed to read OAuth token from ant: ${(err as Error).message}`);
}

if (!token) {
  fail('`ant auth print-credentials --access-token` returned an empty token.');
}

// 4. Run the AI suite with the token injected. Extra CLI args pass through.
const extraArgs = process.argv.slice(2);
console.log('[test:ai:oauth] Running AI suite with OAuth token from ant...');

// Make sure a stale API key doesn't shadow the OAuth token. It must be DELETED,
// not blanked — an empty ANTHROPIC_API_KEY="" still wins precedence in the SDK
// and would authenticate with an empty key.
const childEnv: NodeJS.ProcessEnv = { ...process.env, ANTHROPIC_AUTH_TOKEN: token };
delete childEnv.ANTHROPIC_API_KEY;

const result = spawnSync(
  'npx',
  ['playwright', 'test', '--project=ai', ...extraArgs],
  {
    stdio: 'inherit',
    shell: true, // resolves npx / npx.cmd on Windows
    env: childEnv,
  },
);

process.exit(result.status ?? 1);
