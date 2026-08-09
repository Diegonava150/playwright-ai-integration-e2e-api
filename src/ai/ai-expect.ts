import { Page, expect } from '@playwright/test';
import { askStructured, AI_MIN_CONFIDENCE, verdictPasses } from './claude-client.js';

export interface AiExpectOptions {
  /** Minimum confidence (0..1) required to count as a pass. Defaults to AI_MIN_CONFIDENCE. */
  minConfidence?: number;
}

/**
 * LLM-backed assertions for things a CSS selector can't express:
 *   - "the page semantically confirms the order was placed"
 *   - "this screenshot shows a coherent product grid, not a broken layout"
 *
 * Design choices that keep this from saturating the framework:
 *   - It is a plain helper, invoked explicitly — no global hook fires the LLM.
 *   - It only runs in tests you opt into (the `ai` project / `@ai` tag).
 *   - The verdict is asserted with a normal Playwright `expect`, so failures
 *     integrate with the HTML report and the AI failure summarizer.
 */

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    confidence: { type: 'number' },
    reason: { type: 'string' },
  },
  required: ['pass', 'confidence', 'reason'],
  additionalProperties: false,
} as const;

interface Verdict {
  pass: boolean;
  confidence: number;
  reason: string;
}

const SYSTEM =
  'You are a meticulous QA assertion engine embedded in a Playwright test run. ' +
  'You are given a natural-language claim about application state plus evidence ' +
  '(page text and/or a screenshot). Decide only whether the evidence supports the ' +
  'claim. Be strict: if the evidence is missing or ambiguous, fail. Never invent ' +
  'facts not present in the evidence.';

/**
 * Assert a natural-language claim against the page's visible text.
 * Throws (fails the test) if Claude judges the claim unsupported.
 */
export async function aiExpectText(
  page: Page,
  claim: string,
  opts: AiExpectOptions = {},
): Promise<void> {
  const bodyText = (await page.locator('body').innerText()).slice(0, 8000);

  const verdict = await askStructured<Verdict>({
    system: SYSTEM,
    schema: VERDICT_SCHEMA,
    prompt:
      `CLAIM: ${claim}\n\n` +
      `EVIDENCE (visible page text, truncated):\n"""\n${bodyText}\n"""\n\n` +
      'Return your verdict.',
  });

  assertVerdict(verdict, opts.minConfidence);
}

/**
 * Assert a natural-language claim against a screenshot (visual/semantic check).
 * Useful for layout/rendering claims that text alone can't verify.
 */
export async function aiExpectVisual(
  page: Page,
  claim: string,
  opts: AiExpectOptions = {},
): Promise<void> {
  const shot = await page.screenshot({ fullPage: false });
  const base64 = shot.toString('base64');

  const verdict = await askStructured<Verdict>({
    system: SYSTEM,
    schema: VERDICT_SCHEMA,
    prompt: [
      { type: 'text', text: `CLAIM: ${claim}\n\nEVIDENCE (screenshot below):` },
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: base64 },
      },
      { type: 'text', text: 'Return your verdict.' },
    ],
  });

  assertVerdict(verdict, opts.minConfidence, 'visual ');
}

function assertVerdict(
  verdict: Verdict,
  minConfidence = AI_MIN_CONFIDENCE,
  kind = '',
): void {
  expect(
    verdictPasses(verdict, minConfidence),
    `AI ${kind}assertion failed (pass=${verdict.pass}, confidence=${verdict.confidence} < ${minConfidence}): ${verdict.reason}`,
  ).toBe(true);
}
