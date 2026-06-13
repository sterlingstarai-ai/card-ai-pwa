/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const setMock = vi.fn(async () => 'OK');
let getdelReturn = '1';
const getdelMock = vi.fn(async () => getdelReturn);

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({ set: setMock, getdel: getdelMock }) },
}));

const { createChallenge, consumeChallenge, verifyAppleAttestation, verifyPlayIntegrity, isAttestationEnforced } =
  await import('../../api/lib/attestation.js');

const saved = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  enforced: process.env.ATTESTATION_REQUIRED,
};

describe('attestation nonce infrastructure', () => {
  beforeEach(() => {
    setMock.mockClear();
    getdelMock.mockClear();
    getdelReturn = '1';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok';
    delete process.env.ATTESTATION_REQUIRED;
  });

  afterEach(() => {
    if (saved.url !== undefined) process.env.UPSTASH_REDIS_REST_URL = saved.url;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (saved.token !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = saved.token;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
    if (saved.enforced !== undefined) process.env.ATTESTATION_REQUIRED = saved.enforced;
    else delete process.env.ATTESTATION_REQUIRED;
  });

  it('issues a unique nonce with TTL and stores it', async () => {
    const a = await createChallenge();
    const b = await createChallenge();
    expect(a.nonce).toBeTruthy();
    expect(a.ttl).toBe(300);
    expect(a.nonce).not.toBe(b.nonce);
    expect(setMock).toHaveBeenCalledWith(expect.stringContaining('cardai:attest:nonce:'), '1', { ex: 300 });
  });

  it('returns null when Upstash is unavailable (cannot issue challenges)', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(await createChallenge()).toBeNull();
    expect(setMock).not.toHaveBeenCalled();
  });

  it('consumes a valid nonce exactly once (getdel returns the value)', async () => {
    getdelReturn = '1';
    expect(await consumeChallenge('abc')).toBe(true);
    expect(getdelMock).toHaveBeenCalledWith('cardai:attest:nonce:abc');
  });

  it('rejects an unknown/expired/replayed nonce (getdel returns null)', async () => {
    getdelReturn = null;
    expect(await consumeChallenge('gone')).toBe(false);
  });

  it('rejects empty input and fails closed without Upstash', async () => {
    expect(await consumeChallenge('')).toBe(false);
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(await consumeChallenge('abc')).toBe(false);
  });

  it('verification stubs throw (not yet implemented) — no false "verified"', async () => {
    await expect(verifyAppleAttestation()).rejects.toThrow(/not implemented/);
    await expect(verifyPlayIntegrity()).rejects.toThrow(/not implemented/);
  });

  it('isAttestationEnforced reflects the env flag (default off)', () => {
    expect(isAttestationEnforced()).toBe(false);
    process.env.ATTESTATION_REQUIRED = 'true';
    expect(isAttestationEnforced()).toBe(true);
  });
});
