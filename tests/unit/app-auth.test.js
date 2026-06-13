/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyAppRequest } from '../../api/lib/app-auth.js';

const SAVED = process.env.APP_REQUEST_SECRET;

function req(token) {
  return { headers: token === undefined ? {} : { 'x-app-token': token } };
}

describe('verifyAppRequest', () => {
  beforeEach(() => {
    delete process.env.APP_REQUEST_SECRET;
  });
  afterEach(() => {
    if (SAVED !== undefined) process.env.APP_REQUEST_SECRET = SAVED;
    else delete process.env.APP_REQUEST_SECRET;
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
});
