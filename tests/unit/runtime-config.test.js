import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DEPLOYED_BASE_URL,
  joinUrl,
  normalizeBaseUrl,
  resolveApiBaseUrl,
  resolvePublicAppBaseUrl,
} from '../../src/lib/runtime-config.js';

describe('runtime-config', () => {
  it('normalizes base urls without trailing slash noise', () => {
    expect(normalizeBaseUrl('https://card-ai-pi.vercel.app/')).toBe('https://card-ai-pi.vercel.app');
    expect(normalizeBaseUrl('card-ai-pi.vercel.app/api/')).toBe('https://card-ai-pi.vercel.app/api');
  });

  it('keeps localhost web pointing to deployed api unless overridden', () => {
    const apiBaseUrl = resolveApiBaseUrl({
      env: {},
      location: { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:5173' },
    });

    expect(apiBaseUrl).toBe(DEFAULT_DEPLOYED_BASE_URL);
  });

  it('allows explicit local api override for localhost web', () => {
    const apiBaseUrl = resolveApiBaseUrl({
      env: { VITE_DEV_API_BASE_URL: 'http://localhost:3000/' },
      location: { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:5173' },
    });

    expect(apiBaseUrl).toBe('http://localhost:3000');
  });

  it('uses same-origin api for preview and production web hosts', () => {
    const apiBaseUrl = resolveApiBaseUrl({
      env: {},
      location: {
        protocol: 'https:',
        hostname: 'card-ai-feature-preview.vercel.app',
        origin: 'https://card-ai-feature-preview.vercel.app',
      },
    });

    expect(apiBaseUrl).toBe('https://card-ai-feature-preview.vercel.app');
  });

  it('uses native override outside http contexts', () => {
    const apiBaseUrl = resolveApiBaseUrl({
      env: { VITE_NATIVE_API_BASE_URL: 'https://native-api.example.com/' },
      location: { protocol: 'capacitor:', hostname: 'localhost', origin: 'capacitor://localhost' },
    });

    expect(apiBaseUrl).toBe('https://native-api.example.com');
  });

  it('resolves public app base url from explicit env first', () => {
    const publicBaseUrl = resolvePublicAppBaseUrl({
      env: { VITE_PUBLIC_APP_URL: 'https://app.card-ai.example.com/' },
      location: { protocol: 'https:', hostname: 'card-ai-pi.vercel.app', origin: 'https://card-ai-pi.vercel.app' },
    });

    expect(publicBaseUrl).toBe('https://app.card-ai.example.com');
    expect(joinUrl(publicBaseUrl, '/api/report')).toBe('https://app.card-ai.example.com/api/report');
  });
});
