/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let incrValue = 1;
const incrMock = vi.fn(async () => incrValue);
const expireMock = vi.fn(async () => 1);

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({ incr: incrMock, expire: expireMock }),
  },
}));

const { checkCostBudget } = await import('../../api/lib/cost-guard.js');

function makeRes() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(p) {
      this.body = p;
      return this;
    },
  };
}

describe('checkCostBudget', () => {
  const saved = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };

  beforeEach(() => {
    incrMock.mockClear();
    expireMock.mockClear();
    incrValue = 1;
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok';
  });

  afterEach(() => {
    if (saved.url !== undefined) process.env.UPSTASH_REDIS_REST_URL = saved.url;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (saved.token !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = saved.token;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('is a no-op (no redis call) when dailyMax is 0/undefined', async () => {
    const res = makeRes();
    expect(await checkCostBudget(res, { endpoint: 'ocr', dailyMax: 0 })).toBe(true);
    expect(await checkCostBudget(res, { endpoint: 'ocr' })).toBe(true);
    expect(incrMock).not.toHaveBeenCalled();
  });

  it('passes (no-op) when Upstash env is missing even if a cap is set', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const res = makeRes();
    expect(await checkCostBudget(res, { endpoint: 'ocr', dailyMax: 100, day: '2026-06-13' })).toBe(true);
    expect(incrMock).not.toHaveBeenCalled();
  });

  it('allows while under the cap and sets expiry on the first call', async () => {
    incrValue = 1;
    const res = makeRes();
    expect(await checkCostBudget(res, { endpoint: 'ocr', dailyMax: 100, day: '2026-06-13' })).toBe(true);
    expect(incrMock).toHaveBeenCalledWith('cardai:budget:ocr:2026-06-13');
    expect(expireMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('blocks with 503 once the daily cap is exceeded', async () => {
    incrValue = 101;
    const res = makeRes();
    expect(await checkCostBudget(res, { endpoint: 'ocr', dailyMax: 100, day: '2026-06-13' })).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.headers['Retry-After']).toBe('3600');
  });
});
