import { describe, it, expect, vi } from 'vitest';

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => {
      throw new Error('missing env');
    },
  },
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
  },
}));

const { checkRateLimit } = await import('../../api/lib/rate-limit.js');

describe('rate-limit', () => {
  it('falls back when upstash is unavailable', async () => {
    const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const res = {
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status: vi.fn(() => ({ json: vi.fn() })),
    };

    const allowed = await checkRateLimit(req, res, { max: 10, window: '60 s', prefix: 'test' });
    expect(allowed).toBe(true);
    expect(res.headers['X-RateLimit-Limit']).toBe('10');
  });
});
