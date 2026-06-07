import { describe, it, expect, vi } from 'vitest';
import {
  getAllowedOrigins,
  getDefaultPublicOrigin,
  handleCors,
  isAllowedOrigin,
} from '../../api/lib/cors.js';

describe('cors', () => {
  it('allows exact and preview origins', () => {
    expect(isAllowedOrigin('https://card-ai-pi.vercel.app', {})).toBe(true);
    expect(isAllowedOrigin('https://card-ai-abc123-scope.vercel.app', {})).toBe(true);
    expect(isAllowedOrigin('https://malicious-site.vercel.app', {})).toBe(false);
  });

  it('adds environment-defined origins to the allowlist', () => {
    const allowedOrigins = getAllowedOrigins({
      APP_BASE_URL: 'https://card-ai-staging.example.com/',
      ALLOWED_ORIGINS: 'https://preview.card-ai.example.com, https://ops.card-ai.example.com',
      VERCEL_URL: 'card-ai-preview-123.vercel.app',
    });

    expect(allowedOrigins.has('https://card-ai-staging.example.com')).toBe(true);
    expect(allowedOrigins.has('https://preview.card-ai.example.com')).toBe(true);
    expect(allowedOrigins.has('https://ops.card-ai.example.com')).toBe(true);
    expect(allowedOrigins.has('https://card-ai-preview-123.vercel.app')).toBe(true);
  });

  it('handles preflight request', () => {
    const req = { method: 'OPTIONS', headers: { origin: 'https://card-ai-pi.vercel.app' } };
    const res = {
      headers: {},
      setHeader(key, value) { this.headers[key] = value; },
      status: vi.fn(() => ({ end: vi.fn() })),
    };

    const result = handleCors(req, res, {});
    expect(result).toBe('preflight');
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://card-ai-pi.vercel.app');
  });

  it('blocks disallowed origin', () => {
    const req = { method: 'POST', headers: { origin: 'https://evil.example.com' } };
    const res = { setHeader: vi.fn() };
    expect(handleCors(req, res, {})).toBe(false);
  });

  it('uses environment default origin when request origin is missing', () => {
    const req = { method: 'POST', headers: {} };
    const res = {
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      },
    };
    const env = { APP_BASE_URL: 'https://card-ai-staging.example.com/' };

    expect(getDefaultPublicOrigin(env)).toBe('https://card-ai-staging.example.com');
    expect(handleCors(req, res, env)).toBe(true);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://card-ai-staging.example.com');
  });
});
