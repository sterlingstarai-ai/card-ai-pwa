/**
 * 분석(Analytics) 동의 상태 관리
 *
 * Firebase/Mixpanel 사용 통계와 Sentry 세션 리플레이는 기본 비활성(opt-in)이며,
 * 이용자가 명시적으로 동의한 경우에만 동작한다. (PIPA 최소수집/동의, iOS ATT/스토어 심사 대응)
 * - getAnalyticsConsent(): 'granted' | 'denied' | null(미결정)
 * - hasAnalyticsConsent(): 동의 여부 boolean
 * - setAnalyticsConsent(boolean): 상태 저장 + 구독자 통지
 */

const CONSENT_KEY = 'cardai_analytics_consent';

const listeners = new Set();

export function getAnalyticsConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === 'granted';
}

export function setAnalyticsConsent(granted) {
  const value = granted ? 'granted' : 'denied';
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* localStorage 불가 환경 - 통지만 진행 */
  }
  listeners.forEach((fn) => {
    try {
      fn(value);
    } catch {
      /* 구독자 오류 격리 */
    }
  });
  return value;
}

export function onAnalyticsConsentChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
