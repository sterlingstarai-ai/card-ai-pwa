/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyAppRequest } from '../../api/lib/app-auth.js';

const SAVED = process.env.APP_REQUEST_SECRET;

const SAVED_MIN = process.env.APP_AUTH_MIN_VERSION;

function req(token, version) {
  const headers = {};
  if (token !== undefined) headers['x-app-token'] = token;
  if (version !== undefined) headers['x-app-version'] = version;
  return { headers };
}

describe('verifyAppRequest', () => {
  beforeEach(() => {
    delete process.env.APP_REQUEST_SECRET;
    delete process.env.APP_AUTH_MIN_VERSION;
  });
  afterEach(() => {
    if (SAVED !== undefined) process.env.APP_REQUEST_SECRET = SAVED;
    else delete process.env.APP_REQUEST_SECRET;
    if (SAVED_MIN !== undefined) process.env.APP_AUTH_MIN_VERSION = SAVED_MIN;
    else delete process.env.APP_AUTH_MIN_VERSION;
  });

  it('passes (disabled) when no secret is configured — backward compatible', () => {
    const r = verifyAppRequest(req());
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('disabled');
  });

  it('accepts a matching token', () => {
    process.env.APP_REQUEST_SECRET = 's3cret-value';
    const r = verifyAppRequest(req('s3cret-value'));
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('token');
  });

  it('rejects a wrong token', () => {
    process.env.APP_REQUEST_SECRET = 's3cret-value';
    expect(verifyAppRequest(req('nope')).ok).toBe(false);
  });

  it('rejects a missing token when a secret is configured', () => {
    process.env.APP_REQUEST_SECRET = 's3cret-value';
    expect(verifyAppRequest(req()).ok).toBe(false);
  });

  it('rejects a token of different length without throwing', () => {
    process.env.APP_REQUEST_SECRET = 's3cret-value';
    expect(verifyAppRequest(req('short')).ok).toBe(false);
  });

  describe('version gate (APP_AUTH_MIN_VERSION)', () => {
    beforeEach(() => {
      process.env.APP_REQUEST_SECRET = 's3cret-value';
      process.env.APP_AUTH_MIN_VERSION = '1.2.0';
    });

    it('grace-passes an older released app (no token, lower version) — does not break shipped apps', () => {
      const r = verifyAppRequest(req(undefined, '1.0.4'));
      expect(r.ok).toBe(true);
      expect(r.reason).toBe('grace-legacy-version');
    });

    it('grace-passes a client that sends no version header', () => {
      expect(verifyAppRequest(req(undefined, undefined)).ok).toBe(true);
    });

    it('enforces the token for versions at or above the minimum', () => {
      expect(verifyAppRequest(req(undefined, '1.2.0')).ok).toBe(false); // new version, no token
      expect(verifyAppRequest(req('wrong', '1.3.0')).ok).toBe(false);
      const ok = verifyAppRequest(req('s3cret-value', '1.2.0'));
      expect(ok.ok).toBe(true);
      expect(ok.reason).toBe('token');
    });

    it('without APP_AUTH_MIN_VERSION, enforces the token for all (strict)', () => {
      delete process.env.APP_AUTH_MIN_VERSION;
      expect(verifyAppRequest(req(undefined, '1.0.4')).ok).toBe(false);
    });
  });
});
