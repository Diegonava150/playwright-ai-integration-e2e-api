import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Verifies getClaude() constructs the Anthropic client correctly per credential
 * source — in particular that OAuth paths add the required beta header and the
 * API-key path does not. The SDK is mocked so nothing hits the network.
 */

const KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'AI_ENABLED'] as const;
const saved: Record<string, string | undefined> = {};

function clearCreds() {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
}
function restore() {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

afterEach(() => {
  restore();
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadWithMockedSdk() {
  vi.resetModules();
  const ctor = vi.fn();
  vi.doMock('@anthropic-ai/sdk', () => ({
    default: class {
      messages = { create: vi.fn() };
      constructor(opts: unknown) {
        ctor(opts);
      }
    },
  }));
  const mod = await import('../../src/ai/claude-client.js');
  return { ctor, mod };
}

describe('getClaude credential handling', () => {
  it('throws a helpful error when no credentials are present', async () => {
    clearCreds();
    const { mod } = await loadWithMockedSdk();
    expect(() => mod.getClaude()).toThrow(/No Claude credentials/);
  });

  it('does NOT add the oauth header for an API key', async () => {
    clearCreds();
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const { ctor, mod } = await loadWithMockedSdk();
    mod.getClaude();
    expect(ctor).toHaveBeenCalledWith({});
  });

  it('adds the oauth beta header for an OAuth token', async () => {
    clearCreds();
    process.env.ANTHROPIC_AUTH_TOKEN = 'oauth-tok';
    const { ctor, mod } = await loadWithMockedSdk();
    mod.getClaude();
    expect(ctor).toHaveBeenCalledWith({
      defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
    });
  });

  it('adds the oauth beta header for an on-disk profile (AI_ENABLED)', async () => {
    clearCreds();
    process.env.AI_ENABLED = '1';
    const { ctor, mod } = await loadWithMockedSdk();
    mod.getClaude();
    expect(ctor).toHaveBeenCalledWith({
      defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
    });
  });

  it('caches the client across calls', async () => {
    clearCreds();
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const { ctor, mod } = await loadWithMockedSdk();
    mod.getClaude();
    mod.getClaude();
    expect(ctor).toHaveBeenCalledTimes(1);
  });
});
