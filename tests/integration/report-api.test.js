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

  it('does not treat normal card names containing "lat" as coordinates', async () => {
    mockRateLimitPass();
    const { default: handler } = await import('../../api/report.js');
    const req = createReq({
      body: {
        ...validBody,
        cardName: 'The Platinum Card',
        description: 'Platinum benefit is missing',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('still blocks coordinate-like personal location data', async () => {
    mockRateLimitPass();
    const { default: handler } = await import('../../api/report.js');
    const req = createReq({
      body: {
        ...validBody,
        description: 'lat: 37.123456, lng: 127.123456',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('개인정보');
  });

  // Regression guard for the PII regex over-correction: a bare/space/Korean coordinate
  // (no English keyword, no comma) must still be blocked from reaching a public issue.
  it.each([
    ['bare single coordinate', '내 위치는 37.566535 입니다'],
    ['space-separated lat/lng pair', '37.566535 126.977969'],
    ['Korean 위도 keyword', '위도 37.566535'],
    ['Korean 좌표 keyword', '좌표 37.566535, 126.977969'],
  ])('blocks %s as location PII', async (_label, description) => {
    mockRateLimitPass();
    const { default: handler } = await import('../../api/report.js');
    const req = createReq({ body: { ...validBody, description } });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('개인정보');
  });

  // The standalone-coordinate pattern is range-anchored to Korea lat/lng so legit
  // high-precision decimals in normal report text are NOT false-positived as PII.
  it.each([
    ['reward rate', '포인트 적립률이 1.25000 배로 잘못 표기되어 있어요'],
    ['price with decimals', '가격 19.99000 달러로 표시됨'],
    ['rating average', '별점 4.66667 평균인 맛집'],
  ])('allows legit high-precision decimal in %s', async (_label, description) => {
    mockRateLimitPass();
    const { default: handler } = await import('../../api/report.js');
    const req = createReq({ body: { ...validBody, description } });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
