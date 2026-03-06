import { describe, expect, it } from 'vitest';
import { normalizeKakaoAppKey } from '../../src/components/MapView';

describe('normalizeKakaoAppKey', () => {
  it('returns the raw key when already valid', () => {
    expect(normalizeKakaoAppKey('b6d42c58bb45a8e461cee9040d2677a4')).toBe('b6d42c58bb45a8e461cee9040d2677a4');
  });

  it('extracts a valid key from malformed multi-line env content', () => {
    const malformed = 'VITE_KAKAO_APP_KEY\nb6d42c58bb45a8e461cee9040d2677a4\n';
    expect(normalizeKakaoAppKey(malformed)).toBe('b6d42c58bb45a8e461cee9040d2677a4');
  });

  it('treats placeholders as missing', () => {
    expect(normalizeKakaoAppKey('your_kakao_javascript_key_here')).toBe('');
    expect(normalizeKakaoAppKey('VITE_KAKAO_APP_KEY')).toBe('');
  });
});
