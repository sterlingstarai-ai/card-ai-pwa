/**
 * SettingsTab - 설정 탭 컴포넌트
 * 위치 권한, 저장소, 문의/지원, 약관, 초기화
 */

import { CONFIG } from '../constants/config';
import { storage } from '../lib/storage';
import { shareOrCopy } from '../lib/share';

export const SettingsTab = ({
  // Data
  locationStatus,
  myCards,
  cardsData,
  placesData,
  benefitsData,
  // Handlers
  requestLocation,
  handleReset,
  showToast
}) => {
  const handleAppShare = async () => {
    try {
      await shareOrCopy({
        title: 'Card AI - 신용카드 혜택 추천',
        text: '지금, 여기서 어떤 카드 쓸지 알려드려요',
        url: CONFIG.LINKS.APP_SHARE_URL,
        onCopied: () => showToast('링크가 복사되었습니다'),
      });
    } catch {
      showToast('공유에 실패했습니다');
    }
  };

  return (
    <div className="p-5 space-y-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Location Permission */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
        <h3 className="font-bold mb-2">📍 위치 권한</h3>
        <p className="text-sm text-slate-400 mb-3">{locationStatus === 'idle' ? '위치 권한 필요' : locationStatus === 'loading' ? '확인 중...' : locationStatus === 'success' ? '✅ 허용됨' : locationStatus === 'denied' ? '❌ 거부됨' : '⚠️ 서울 기준'}</p>
        <button onClick={requestLocation} disabled={locationStatus === 'loading'} className="w-full py-2.5 bg-blue-600 rounded-xl text-sm font-medium disabled:opacity-60">{locationStatus === 'loading' ? '위치 확인 중...' : '위치 요청'}</button>
      </div>

      {/* Storage Info */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
        <h3 className="font-bold mb-2">💾 저장소</h3>
        <p className="text-sm text-slate-400">{storage.getMode()} 사용 중 (오프라인 지원)</p>
      </div>

      {/* Contact & Support */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
        <h3 className="font-bold mb-3">💬 문의 및 지원</h3>
        <button onClick={handleAppShare} className="block w-full py-2.5 bg-emerald-600/20 text-emerald-300 rounded-xl text-sm font-medium text-center border border-emerald-500/30 mb-2">🔗 앱 공유하기</button>
        <a href={`mailto:${CONFIG.LINKS.SUPPORT_EMAIL}?subject=[Card AI] 문의사항`} className="block w-full py-2.5 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-medium text-center border border-blue-500/30 mb-2">📧 문의하기</a>
        <a href={`mailto:${CONFIG.LINKS.DATA_REPORT_EMAIL}?subject=[Card AI] 데이터 제보&body=제보 유형: (오류/누락/신규)%0A%0A관련 정보:%0A- 카드명: %0A- 장소명: %0A- 혜택 내용: %0A%0A상세 설명:%0A`} className="block w-full py-2.5 bg-amber-600/20 text-amber-400 rounded-xl text-sm font-medium text-center border border-amber-500/30 mb-2">📝 정보 수정 제보</a>
        <button onClick={() => {
          const diagInfo = `앱 버전: ${CONFIG.BUILD.VERSION} (${CONFIG.BUILD.BUILD_NUMBER})\n빌드: ${CONFIG.BUILD.COMMIT_HASH}\n플랫폼: ${navigator.userAgent.includes('iPhone') ? 'iOS' : navigator.userAgent.includes('Android') ? 'Android' : 'Web'}\n저장소: ${storage.getMode()}\n카드 수: ${myCards.length}\n`;
          if (navigator.share) {
            navigator.share({ title: 'Card AI 진단 정보', text: diagInfo });
          } else {
            navigator.clipboard.writeText(diagInfo);
            showToast('진단 정보가 복사되었습니다');
          }
        }} className="w-full py-2.5 bg-slate-700/50 text-slate-300 rounded-xl text-sm font-medium border border-white/5">🔧 진단 정보 복사</button>
      </div>

      {/* Terms & Privacy */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
        <h3 className="font-bold mb-3">📋 약관 및 정책</h3>
        <a href={CONFIG.LINKS.PRIVACY_POLICY} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2 text-sm text-slate-300">
          <span>🔒 개인정보처리방침</span><span className="text-slate-400">→</span>
        </a>
        <a href={CONFIG.LINKS.TERMS_OF_SERVICE} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2 text-sm text-slate-300 border-t border-white/5">
          <span>📄 이용약관</span><span className="text-slate-400">→</span>
        </a>
      </div>

      {/* Reset Button */}
      <button onClick={handleReset} className="w-full py-3 bg-red-600/20 text-red-400 rounded-2xl text-sm font-medium border border-red-500/30">🗑️ 초기화</button>

      {/* App Info */}
      <div className="text-center text-[11px] text-slate-400 mt-4 space-y-1">
        <p>{CONFIG.APP.NAME} v{CONFIG.BUILD.VERSION} ({CONFIG.BUILD.BUILD_NUMBER})</p>
        <p>{Object.keys(cardsData || {}).length}카드 · {Object.keys(placesData || {}).length}장소 · {Object.keys(benefitsData || {}).length}혜택</p>
        <p className="text-slate-700">Build: {CONFIG.BUILD.COMMIT_HASH} · {CONFIG.BUILD.BUILD_DATE}</p>
      </div>
    </div>
  );
};
