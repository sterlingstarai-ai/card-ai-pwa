import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const { checkRateLimit } = await import('../../api/lib/rate-limit.js');

function makeRes() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('rate-limit (limiter unavailable — no Upstash env)', () => {
  const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (savedUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  });

  it('fails CLOSED by default (503 + Retry-After) so cost endpoints cannot be flooded', async () => {
    const res = makeRes();
    const allowed = await checkRateLimit(req, res, { max: 10, window: '60 s', prefix: 'ocr' });

    expect(allowed).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.headers['Retry-After']).toBe('30');
  });

  it('fails OPEN only when failOpen:true (non-cost report path) and emits no fake limit headers', async () => {
    const res = makeRes();
    const allowed = await checkRateLimit(req, res, {
      max: 3,
      window: '300 s',
      prefix: 'report',
      failOpen: true,
    });

    expect(allowed).toBe(true);
    expect(res.statusCode).toBeNull(); // no error response sent
    // the bypass must not be masked by a faked X-RateLimit-Remaining=max header
    expect(res.headers['X-RateLimit-Remaining']).toBeUndefined();
  });
});
