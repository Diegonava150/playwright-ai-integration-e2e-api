import { afterEach, describe, expect, it, vi } from 'vitest';

import globalSetup from '../src/global-setup.js';
import { PROBE_PATH, probeTarget } from '../src/reachability.js';

const BASE = 'https://example.test';

/** The interstitial automationexercise.com serves to datacenter IPs. */
const CHALLENGE_PAGE =
  '<html><body><h1>One moment, please...</h1><p>Your request is being verified.</p></body></html>';

const REAL_API = '{"responseCode":200,"products":[]}';

function mockFetch(body: string) {
  // Declared with fetch's parameters so the recorded calls are typed: the
  // user-agent assertion below reads init, and a zero-arg mock would make that
  // unexpressible.
  const fetchMock = vi.fn(
    async (_input: string | URL | Request, _init?: RequestInit) =>
      new Response(body, { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('probeTarget', () => {
  it('reports reachable when the API returns real content', async () => {
    mockFetch(REAL_API);
    await expect(probeTarget(BASE)).resolves.toEqual({ reachable: true });
  });

  it('recognises the anti-bot challenge rather than calling it a broken site', async () => {
    mockFetch(CHALLENGE_PAGE);
    const result = await probeTarget(BASE);

    // The distinction matters: blocked means "skip and move on", unexpected means
    // "something changed and someone should look".
    expect(result).toMatchObject({ reachable: false, blocked: true });
    expect(result.reachable ? '' : result.detail).toMatch(/anti-bot/i);
  });

  it('separates an unexpected body from a block', async () => {
    mockFetch('<html>500 Internal Server Error</html>');
    expect(await probeTarget(BASE)).toMatchObject({ reachable: false, blocked: false });
  });

  it('treats a transport failure as unreachable rather than throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    const result = await probeTarget(BASE);
    expect(result).toMatchObject({ reachable: false, blocked: false });
    expect(result.reachable ? '' : result.detail).toContain('ECONNREFUSED');
  });

  it('sends no user agent of its own', async () => {
    // The bug this module exists to prevent. The old CI preflight passed
    // -A "Mozilla/5.0 (X11; Linux x86_64)" to curl, was served real content on the
    // strength of it, and cleared a run that then failed in global-setup on the
    // challenge. A probe that is more welcome than the suites it gates cannot
    // predict them, so it must ask as plainly as they do.
    const fetchMock = mockFetch(REAL_API);
    await probeTarget(BASE);

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toBeUndefined();
  });

  it('probes the endpoint global-setup depends on', async () => {
    const fetchMock = mockFetch(REAL_API);
    await probeTarget(BASE);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}${PROBE_PATH}`);
  });
});

describe('global-setup treats a block differently from a fault', () => {
  // The point of the split. Being served the challenge is a fact about this
  // machine's IP and says nothing about the code, so it must not fail the build —
  // the skipWhenTargetBlocked fixture skips each test instead, which puts the
  // reason next to the tests it explains. A site that is down or answering with
  // something unrecognised is a real signal with no sensible way to continue.
  //
  // Conflating the two is what CI used to do, and it is why a red build here
  // stopped meaning anything.
  it('does not fail the run when the target is merely blocking this machine', async () => {
    mockFetch(CHALLENGE_PAGE);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(globalSetup()).resolves.toBeUndefined();
  });

  it('does fail the run when the target is down or unrecognisable', async () => {
    mockFetch('<html>503 Service Unavailable</html>');
    await expect(globalSetup()).rejects.toThrow(/not returning real content/i);
  });

  it('proceeds when the target is reachable', async () => {
    mockFetch(REAL_API);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(globalSetup()).resolves.toBeUndefined();
  });
});
