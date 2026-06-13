// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAnalyticsConsent,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  onAnalyticsConsentChange,
} from '../../src/lib/consent';

describe('analytics consent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to null (undecided) and not consented', () => {
    expect(getAnalyticsConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('persists granted consent', () => {
    setAnalyticsConsent(true);
    expect(getAnalyticsConsent()).toBe('granted');
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('persists denied consent (still not consented)', () => {
    setAnalyticsConsent(false);
    expect(getAnalyticsConsent()).toBe('denied');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('notifies subscribers on change and supports unsubscribe', () => {
    const fn = vi.fn();
    const off = onAnalyticsConsentChange(fn);
    setAnalyticsConsent(true);
    expect(fn).toHaveBeenCalledWith('granted');
    off();
    setAnalyticsConsent(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
