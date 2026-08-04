/**
 * Reads the Playwright JSON report and asks Claude for a concise, human-friendly
 * triage of any failures — root-cause guesses, grouping, and next steps.
 *
 * Reuses src/ai/claude-client.ts (the SAME client the in-test aiExpect helper
 * uses), so the runtime and CI AI features share one integration point.
 *
 * Usage:
 *   npm test            # produces test-results/results.json
 *   npm run ai:summary  # writes ai-summary.md (and echoes it)
 *
 * In CI it degrades gracefully (prints a plain list) when no Claude credentials
 * are present, so it never breaks the pipeline.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { askText, hasCredentials } from '../src/ai/claude-client.js';

const REPORT_PATH = 'test-results/results.json';
const OUT_PATH = 'ai-summary.md';

// Strip ANSI color codes from error text. Built via RegExp (not a literal) to
// avoid embedding a control character in source.
const ANSI_COLOR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

interface FailedTest {
  title: string;
  file: string;
  project: string;
  error: string;
}

function collectFailures(report: any): FailedTest[] {
  const failures: FailedTest[] = [];

  const walk = (suite: any, file: string) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const results = t.results ?? [];
        const last = results[results.length - 1];
        // Playwright test.status is expected|unexpected|flaky|skipped.
        // Only `unexpected` is a real failure (skipped/flaky are not).
        if (t.status === 'unexpected') {
          const errText = (last?.errors ?? [])
            .map((e: any) => e.message ?? '')
            .join('\n')
            .replace(ANSI_COLOR, '')
            .slice(0, 1500);
          failures.push({
            title: spec.title,
            file: file || spec.file || suite.file || 'unknown',
            project: t.projectName ?? 'default',
            error: errText || 'No error message captured.',
          });
        }
      }
    }
    for (const child of suite.suites ?? []) walk(child, child.file ?? file);
  };

  for (const suite of report.suites ?? []) walk(suite, suite.file);
  return failures;
}

async function main(): Promise<void> {
  if (!existsSync(REPORT_PATH)) {
    console.error(`No report at ${REPORT_PATH}. Run \`npm test\` first.`);
    process.exit(0);
  }

  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
  const failures = collectFailures(report);

  if (failures.length === 0) {
    const msg = '# AI Test Summary\n\n✅ All tests passed — nothing to triage.\n';
    writeFileSync(OUT_PATH, msg);
    console.log(msg);
    return;
  }

  if (!hasCredentials()) {
    const list = failures
      .map((f) => `- **${f.title}** (${f.project}) — ${f.file}`)
      .join('\n');
    const msg =
      `# AI Test Summary\n\n${failures.length} failure(s) found. ` +
      `Provide Claude credentials (ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / AI_ENABLED) for AI triage.\n\n${list}\n`;
    writeFileSync(OUT_PATH, msg);
    console.log(msg);
    return;
  }

  const payload = failures
    .map(
      (f, i) =>
        `### Failure ${i + 1}: ${f.title}\nProject: ${f.project}\nFile: ${f.file}\nError:\n${f.error}`,
    )
    .join('\n\n');

  const summary = await askText({
    system:
      'You are a senior test engineer triaging a Playwright run against a live ' +
      'e-commerce site (automationexercise.com). Produce a tight Markdown report. ' +
      'Group related failures, give a most-likely root cause for each group ' +
      '(app bug vs flaky selector vs network/site instability vs test-data issue), ' +
      'and list concrete next steps. Be specific and brief.',
    prompt: `Here are ${failures.length} failed Playwright test(s):\n\n${payload}`,
    maxTokens: 4096,
  });

  const md = `# AI Test Summary\n\n_${failures.length} failure(s) analyzed by ${
    process.env.AI_MODEL ?? 'claude-opus-4-8'
  }._\n\n${summary}\n`;
  writeFileSync(OUT_PATH, md);
  console.log(md);
}

main().catch((err) => {
  console.error('ai-failure-summary failed:', err);
  process.exit(0); // never break the pipeline over the summary step
});
