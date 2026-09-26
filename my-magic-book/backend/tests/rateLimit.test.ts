import { describe, it, expect, vi, afterEach } from 'vitest';
import { ipRateLimit } from '../src/middleware/rateLimit';

/**
 * The upload ceiling.
 *
 * The failure that matters here is not "an abuser got through" — it is
 * "a paying customer was turned away". Two of these exist only for that: one
 * proves separate addresses do not share a budget, the other proves the budget
 * comes back.
 */

const OPTS = { windowMs: 60_000, max: 3, message: 'too many' };

function harness() {
  const mw = ipRateLimit(OPTS);
  return (ip: string) => {
    let nexted = false;
    const res: any = {
      code: 0, body: null as any, headers: {} as Record<string, string>,
      status(c: number) { this.code = c; return this; },
      json(b: any) { this.body = b; return this; },
      setHeader(k: string, v: string) { this.headers[k] = v; },
    };
    mw({ ip, socket: {} } as any, res, () => { nexted = true; });
    return { allowed: nexted, res };
  };
}

afterEach(() => { vi.useRealTimers(); delete process.env.NODE_ENV_TEST_OVERRIDE; });

describe('per-IP upload ceiling', () => {
  it('lets a normal order through', () => {
    const hit = harness();
    for (let i = 0; i < OPTS.max; i++) expect(hit('1.1.1.1').allowed).toBe(true);
  });

  it('stops the one after that, and says how long to wait', () => {
    const hit = harness();
    for (let i = 0; i < OPTS.max; i++) hit('1.1.1.1');
    const { allowed, res } = hit('1.1.1.1');
    expect(allowed).toBe(false);
    expect(res.code).toBe(429);
    expect(res.body.message).toBe('too many');
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('never lets one address spend another address\'s budget', () => {
    const hit = harness();
    for (let i = 0; i < OPTS.max + 5; i++) hit('1.1.1.1');
    // a different customer, arriving after that flood, must be unaffected
    expect(hit('2.2.2.2').allowed).toBe(true);
    expect(hit('2.2.2.2').allowed).toBe(true);
  });

  it('gives the budget back when the window passes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const hit = harness();
    for (let i = 0; i < OPTS.max; i++) hit('1.1.1.1');
    expect(hit('1.1.1.1').allowed).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T01:00:01Z')); // window elapsed
    expect(hit('1.1.1.1').allowed).toBe(true);
  });

  it('does not grow forever — stale windows are swept', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const mw = ipRateLimit(OPTS);
    const noop: any = { status: () => ({ json: () => {} }), setHeader: () => {} };
    const call = (ip: string) => mw({ ip, socket: {} } as any, noop, () => {});

    for (let i = 0; i < 500; i++) call(`10.0.0.${i}`);
    expect(mw.trackedKeys()).toBe(500);

    // long after every one of those windows expired, one more request sweeps
    vi.setSystemTime(new Date('2026-01-01T02:00:00Z'));
    call('10.1.1.1');
    expect(mw.trackedKeys()).toBe(1);
  });
  it('refuses to limit at all if the caller resolves to the proxy itself', () => {
    // The dangerous misconfiguration: trust proxy unset in production, so every
    // visitor arrives as one internal address. Locking the whole site out over
    // that is worse than the abuse, so it must fail open and say so.
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const hit = harness();
      for (let i = 0; i < OPTS.max + 10; i++) {
        expect(hit('10.201.0.7').allowed).toBe(true);
      }
      expect(err).toHaveBeenCalledOnce();
      expect(String(err.mock.calls[0][0])).toContain('trust proxy');
    } finally {
      err.mockRestore();
      if (prev === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prev;
    }
  });

  it('still limits a real public address in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const hit = harness();
      for (let i = 0; i < OPTS.max; i++) expect(hit('82.166.4.9').allowed).toBe(true);
      expect(hit('82.166.4.9').allowed).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prev;
    }
  });
});
