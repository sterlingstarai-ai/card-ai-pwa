import { describe, it, expect } from 'vitest';
import { hasRealLocation } from '../../src/lib/utils';

describe('hasRealLocation', () => {
  it('accepts a place with real coordinates', () => {
    expect(hasRealLocation({ lat: 37.4492, lng: 126.4502 })).toBe(true);
  });

  it('rejects the 서울시청 placeholder sentinel (brand/tag-only entries)', () => {
    expect(hasRealLocation({ lat: 37.5665, lng: 126.978 })).toBe(false);
    expect(hasRealLocation({ lat: 37.5665, lng: 126.9780 })).toBe(false);
  });

  it('rejects missing or non-numeric coordinates', () => {
    expect(hasRealLocation(null)).toBe(false);
    expect(hasRealLocation({})).toBe(false);
    expect(hasRealLocation({ lat: 'x', lng: 'y' })).toBe(false);
  });

  it('accepts a real place that is near but not exactly at city hall', () => {
    expect(hasRealLocation({ lat: 37.5663, lng: 126.9779 })).toBe(true);
  });
});
