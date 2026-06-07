/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function createReq({ method = 'POST', origin = 'http://localhost:5173', body = {} } = {}) {
  return {
    method,
    headers: { origin },
    body,
  };
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function mockRateLimitPass() {
  vi.doMock('../../api/lib/rate-limit.js', () => ({
    checkRateLimit: vi.fn(async () => true),
  }));
}

const validBody = {
  type: 'missing',
  cardName: '테스트카드',
  placeName: '테스트장소',
  benefitContent: '혜택',
  sourceUrl: 'https://example.com',
  description: '테스트',
};

describe('api/report integration', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GITHUB_TOKEN;
    delete process.env.VERCEL_ENV;
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    vi.doUnmock('../../api/lib/rate-limit.js');
    vi.doUnmock('../../api/lib/cors.js');
  });

  it('blocks disallowed origins with 403', async () => {
    mockRateLimitPass();
    const { default: handler } = await import('../../api/report.js');
    const req = createReq({ origin: 'https://evil.example.com', body: validBody });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Origin not allowed' });
  });

  it('masks internal error details in production', async () => {
    mockRateLimitPass();
    process.env.GITHUB_TOKEN = 'dummy-token';
    process.env.VERCEL_ENV = 'production';
    global.fetch = vi.fn().mockRejectedValue(new Error('sensitive failure detail'));

    const { default: handler } = await import('../../api/report.js');
    const req = createReq({ body: validBody });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('리포트 전송 중 오류가 발생했습니다');
    expect(res.body.message).toBeUndefined();
  });

  it('exposes error message in development', async () => {
    mockRateLimitPass();
    process.env.GITHUB_TOKEN = 'dummy-token';
    process.env.NODE_ENV = 'development';
    global.fetch = vi.fn().mockRejectedValue(new Error('dev failure detail'));

    const { default: handler } = await import('../../api/report.js');
    const req = createReq({ body: validBody });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('리포트 전송 중 오류가 발생했습니다');
    expect(res.body.message).toBe('dev failure detail');
  });

  it('returns 429 path when rate limit is exceeded', async () => {
    vi.doMock('../../api/lib/rate-limit.js', () => ({
      checkRateLimit: vi.fn(async (_req, res) => {
        res.status(429).json({ error: 'Too Many Requests' });
        return false;
      }),
    }));

    const { default: handler } = await import('../../api/report.js');
    const req = createReq({ body: validBody });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'Too Many Requests' });
  });
});
