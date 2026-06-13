import React from 'react';
import ReactDOM from 'react-dom/client';
import CardBenefitsApp from './App.jsx';
import './index.css';
import { initFirebase } from './lib/firebase';
import { initMixpanel } from './lib/mixpanel';
import { hasAnalyticsConsent } from './lib/consent';

// 분석 제공자는 사용자가 이미 동의한 경우에만 초기화한다(opt-in).
// 미결정/거부 상태에서는 ConsentBanner의 동의 시점에 초기화된다.
if (hasAnalyticsConsent()) {
  void initFirebase();
  initMixpanel();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CardBenefitsApp />
  </React.StrictMode>
);
