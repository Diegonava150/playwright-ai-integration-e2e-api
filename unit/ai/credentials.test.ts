import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  aiCredentialSource,
  hasCredentials,
  verdictPasses,
} from '../../src/ai/claude-client.js';

const KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'AI_ENABLED'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('aiCredentialSource precedence', () => {
  it('returns none when nothing is set', () => {
    expect(aiCredentialSource()).toBe('none');
    expect(hasCredentials()).toBe(false);
  });

  it('AI_ENABLED=1 → profile', () => {
    process.env.AI_ENABLED = '1';
    expect(aiCredentialSource()).toBe('profile');
    expect(hasCredentials()).toBe(true);
  });

  it('ANTHROPIC_AUTH_TOKEN → auth-token, and beats profile', () => {
    process.env.AI_ENABLED = '1';
    process.env.ANTHROPIC_AUTH_TOKEN = 'tok';
    expect(aiCredentialSource()).toBe('auth-token');
  });

  it('ANTHROPIC_API_KEY wins over everything', () => {
    process.env.AI_ENABLED = '1';
    process.env.ANTHROPIC_AUTH_TOKEN = 'tok';
    process.env.ANTHROPIC_API_KEY = 'key';
    expect(aiCredentialSource()).toBe('api-key');
  });

  it('treats empty string as unset (falsy)', () => {
    process.env.ANTHROPIC_API_KEY = '';
    expect(aiCredentialSource()).toBe('none');
  });
});

describe('verdictPasses threshold', () => {
  it('passes only when pass AND confidence >= threshold', () => {
    expect(verdictPasses({ pass: true, confidence: 0.9 }, 0.7)).toBe(true);
    expect(verdictPasses({ pass: true, confidence: 0.7 }, 0.7)).toBe(true);
  });

  it('fails a low-confidence pass', () => {
    expect(verdictPasses({ pass: true, confidence: 0.5 }, 0.7)).toBe(false);
  });

  it('fails when the model says fail regardless of confidence', () => {
    expect(verdictPasses({ pass: false, confidence: 1 }, 0.7)).toBe(false);
  });
});
