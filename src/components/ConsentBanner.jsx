/**
 * ConsentBanner - 분석 동의 배너 (opt-in)
 *
 * 최초 실행 시(동의 미결정) 1회 노출. 동의 시에만 Firebase/Mixpanel을 초기화한다.
 * 거부해도 모든 핵심 기능은 동일하게 동작한다.
 */

import { useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '../lib/consent';
import { initFirebase } from '../lib/firebase';
import { initMixpanel } from '../lib/mixpanel';
import { CONFIG } from '../constants/config';

export const ConsentBanner = () => {
  const [decided, setDecided] = useState(() => getAnalyticsConsent() !== null);

  if (decided) return null;

  const accept = () => {
    setAnalyticsConsent(true);
    // 동의 시점에 제공자 초기화
    void initFirebase();
    initMixpanel();
    setDecided(true);
  };

  const decline = () => {
    setAnalyticsConsent(false);
    setDecided(true);
  };

  return (
    <div
      className="fixed left-4 right-4 z-[60] bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl p-4 animate-fadeIn"
      style={{ maxWidth: '398px', margin: '0 auto', bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
    >
      <p id="consent-banner-title" className="text-sm font-bold text-white mb-1">📊 익명 사용 통계 동의</p>
      <p className="text-xs text-slate-400 mb-3">
        서비스 개선을 위해 익명 사용 통계와 오류 진단을 수집할 수 있습니다. 광고 추적에는 사용하지 않으며, 거부해도 모든 기능을 그대로 이용할 수 있습니다.{' '}
        <a href={CONFIG.LINKS.PRIVACY_POLICY} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
          개인정보처리방침
        </a>
      </p>
      <div className="flex gap-2">
        <button
          onClick={decline}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-800/80 border border-white/10 text-slate-300 active:scale-[0.98]"
        >
          거부
        </button>
        <button
          onClick={accept}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white active:scale-[0.98]"
        >
          동의
        </button>
      </div>
    </div>
  );
};
