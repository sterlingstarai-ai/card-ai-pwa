import { describe, it, expect } from 'vitest';
import { validateBase64Image } from '../../api/lib/validate.js';

const longB64 = 'A'.repeat(200);

describe('validateBase64Image', () => {
  it('accepts a plain base64 string', () => {
    const r = validateBase64Image(longB64);
    expect(r.ok).toBe(true);
    expect(r.image).toBe(longB64);
  });

  it('strips a data: URL prefix and returns the base64 body', () => {
    const r = validateBase64Image(`data:image/jpeg;base64,${longB64}`);
    expect(r.ok).toBe(true);
    expect(r.image).toBe(longB64);
  });

  it('rejects non-string input', () => {
    expect(validateBase64Image(null).ok).toBe(false);
    expect(validateBase64Image(undefined).ok).toBe(false);
    expect(validateBase64Image({}).ok).toBe(false);
  });

  it('rejects too-short payloads', () => {
    expect(validateBase64Image('AAAA').ok).toBe(false);
  });

  it('rejects non-base64 junk (would otherwise be forwarded to Vision)', () => {
    const r = validateBase64Image('!@#$%^&*()'.repeat(50));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('인코딩');
  });

  it('rejects payloads over the decoded byte cap', () => {
    const huge = 'A'.repeat(6 * 1024 * 1024);
    const r = validateBase64Image(huge, { maxDecodedBytes: 4 * 1024 * 1024 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('용량');
  });
});
