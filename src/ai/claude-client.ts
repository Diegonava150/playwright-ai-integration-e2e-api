import Anthropic from '@anthropic-ai/sdk';

/**
 * Shared Anthropic client + a small structured-output helper.
 *
 * This single module is the ONLY place the project talks to the Claude API.
 * It is reused by:
 *   - src/ai/ai-expect.ts   (runtime, in-test LLM assertions)
 *   - scripts/ai-failure-summary.ts (CI, post-run failure triage)
 *
 * Keeping one client means one auth path, one model default, and one place to
 * change the reasoning/effort profile — so the AI features reinforce each other
 * instead of drifting apart.
 */

export const AI_MODEL = process.env.AI_MODEL ?? 'claude-opus-4-8';
export const AI_EFFORT = (process.env.AI_EFFORT ?? 'low') as
  'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * Credential detection across the sources the Anthropic SDK understands:
 *   ANTHROPIC_API_KEY → ANTHROPIC_AUTH_TOKEN (OAuth) → an `ant auth login`
 *   profile on disk (resolved by a bare `new Anthropic()`).
 *
 * Env checks can't see an on-disk profile, so `AI_ENABLED=1` is an explicit
 * override for that case. This is the seam that lets OAuth users run the AI
 * features without an API key.
 */
export type CredentialSource = 'api-key' | 'auth-token' | 'profile' | 'none';

export function aiCredentialSource(): CredentialSource {
  if (process.env.ANTHROPIC_API_KEY) return 'api-key';
  if (process.env.ANTHROPIC_AUTH_TOKEN) return 'auth-token';
  if (process.env.AI_ENABLED === '1' || process.env.AI_ENABLED === 'true')
    return 'profile';
  return 'none';
}

export function hasCredentials(): boolean {
  return aiCredentialSource() !== 'none';
}

/** Minimum confidence an AI verdict needs to count as a pass (0..1). */
export const AI_MIN_CONFIDENCE = Number(process.env.AI_MIN_CONFIDENCE ?? '0.7');

/**
 * Pure decision for an AI verdict: passes only if the model says pass AND its
 * confidence clears the threshold, so a low-confidence "pass" fails. Lives here
 * (not in ai-expect) so it's unit-testable without pulling in Playwright.
 */
export function verdictPasses(
  verdict: { pass: boolean; confidence: number },
  minConfidence = AI_MIN_CONFIDENCE,
): boolean {
  return verdict.pass && verdict.confidence >= minConfidence;
}

// Transient HTTP statuses worth retrying with backoff.
export const TRANSIENT_STATUS = new Set([408, 409, 429, 500, 502, 503, 529]);

// Base backoff (ms). Overridable so unit tests can run retries with no delay.
const RETRY_BASE_MS = Number(process.env.AI_RETRY_BASE_MS ?? '500');

/**
 * Retry `fn` with exponential backoff on transient failures (network errors or
 * transient HTTP statuses). Non-transient errors (e.g. 400/401/403) throw
 * immediately. Exported for unit testing.
 */
export async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      // Retry network errors (no status) and transient server statuses only.
      const transient = status === undefined || TRANSIENT_STATUS.has(status);
      if (!transient || attempt === tries - 1) throw err;
      const backoffMs = Math.min(8000, RETRY_BASE_MS * 2 ** attempt);
      if (backoffMs > 0) await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

/** @deprecated kept for import stability — use hasCredentials(). */
export const hasApiKey = hasCredentials;

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  const source = aiCredentialSource();
  if (source === 'none') {
    throw new Error(
      'No Claude credentials found. AI features are opt-in. Use ONE of:\n' +
        '  • ANTHROPIC_API_KEY=<key>            (Anthropic Console; also what CI uses)\n' +
        '  • ANTHROPIC_AUTH_TOKEN=<oauth-token> (e.g. `ant auth print-credentials --access-token`)\n' +
        '  • AI_ENABLED=1                        (if the SDK can resolve an `ant auth login` profile)\n' +
        'Or just run the non-AI suites: npm run test:e2e / test:api.',
    );
  }
  if (!client) {
    // OAuth bearer tokens require the oauth beta header on /v1/messages; the SDK
    // won't add it for a raw ANTHROPIC_AUTH_TOKEN. Harmless on an API key, so we
    // only add it on the OAuth paths.
    const isOAuth = source === 'auth-token' || source === 'profile';
    client = new Anthropic(
      isOAuth ? { defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' } } : {},
    );
  }
  return client;
}

/**
 * Ask Claude a question and get back a value validated against a JSON schema.
 * Uses adaptive thinking + structured outputs so the first text block is always
 * valid JSON matching `schema` (Opus 4.8 guarantees this via output_config.format).
 */
export async function askStructured<T>(opts: {
  system?: string;
  prompt: string | Anthropic.ContentBlockParam[];
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getClaude();

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: AI_EFFORT,
        format: { type: 'json_schema', schema: opts.schema },
      },
      system: opts.system,
      messages: [
        {
          role: 'user',
          content:
            typeof opts.prompt === 'string'
              ? [{ type: 'text', text: opts.prompt }]
              : opts.prompt,
        },
      ],
    }),
  );

  if (response.stop_reason === 'refusal') {
    throw new Error(
      `Claude refused the request (${response.stop_details?.category ?? 'unknown'}).`,
    );
  }

  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') {
    throw new Error('Claude returned no text block to parse.');
  }
  return JSON.parse(text.text) as T;
}

/** Free-form text answer (used by the CI failure summarizer). */
export async function askText(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const anthropic = getClaude();
  const response = await withRetry(() =>
    anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: AI_EFFORT },
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  );

  if (response.stop_reason === 'refusal') {
    return '_(Claude declined to summarize this run.)_';
  }
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();
}
