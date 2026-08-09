import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/ai/claude-client.js';

// Note: AI_RETRY_BASE_MS=0 is set in the test script so backoff is instant.

function httpError(status: number): Error & { status: number } {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

describe('withRetry', () => {
  it('returns immediately on success (no retries)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient statuses then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(httpError(529))
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValue('recovered');
    await expect(withRetry(fn)).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries network errors with no status', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry non-transient statuses (e.g. 401)', async () => {
    const fn = vi.fn().mockRejectedValue(httpError(401));
    await expect(withRetry(fn)).rejects.toMatchObject({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after `tries` attempts and throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue(httpError(500));
    await expect(withRetry(fn, 3)).rejects.toMatchObject({ status: 500 });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
