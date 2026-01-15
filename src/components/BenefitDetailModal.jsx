/**
 * Benefit detail modal component (Gemini suggestion + source/verification)
 */

import { categoryConfig } from '../lib/utils';

export const BenefitDetailModal = ({ benefit, cardsData, onClose, onReport }) => {
  if (!benefit) return null;
  const card = cardsData?.[benefit.cardId];

  // Calculate verification status
  const getVerificationStatus = () => {
    if (!benefit.lastVerifiedAt) return { status: 'unknown', text: '출처 미기재 (검증 필요)', color: 'text-amber-400' };
    const verifiedDate = new Date(benefit.lastVerifiedAt);
    const daysSince = Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 90) return { status: 'stale', text: `${daysSince}일 전 검증 (업데이트 필요)`, color: 'text-amber-400' };
    return { status: 'fresh', text: `${daysSince}일 전 검증됨`, color: 'text-green-400' };
  };
  const verification = getVerificationStatus();

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="benefit-modal-title"
    >
      <div
        className="bg-[#1a1a1f] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 border-t border-white/10"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-between items-start">
          <div className="text-3xl">{categoryConfig[benefit.category]?.emoji || '✨'}</div>
          <button onClick={onClose} className="text-slate-500 text-2xl hover:text-white transition-colors" aria-label="닫기">✕</button>
        </div>
        <div>
          <h2 id="benefit-modal-title" className="text-xl font-bold mb-1">{benefit.title}</h2>
          <p className="text-blue-400 font-bold text-lg">{benefit.value}</p>
          {card && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-5 rounded" style={{ background: card.color }} />
              <span className="text-sm text-slate-400">{card.issuer} {card.name}</span>
            </div>
          )}
        </div>
        <div className="bg-slate-800/50 rounded-2xl p-4 text-sm text-slate-300 leading-relaxed border border-white/5">
          {benefit.desc || "이 혜택은 선택하신 장소에서 바로 사용 가능합니다. 자세한 사용 조건은 카드사 앱을 확인해 주세요."}
        </div>
        {/* Source & Verification Section */}
        <div className="bg-slate-900/50 rounded-xl p-3 text-[11px] space-y-1.5 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">출처</span>
            {benefit.sourceUrl ? (
              <a href={benefit.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate max-w-[200px]">
                {benefit.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
              </a>
            ) : (
              <span className="text-slate-500">미기재</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">검증일</span>
            <span className={verification.color}>{verification.text}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-blue-600 rounded-2xl font-bold active:scale-[0.98] transition-transform"
          >
            확인
          </button>
          {onReport && (
            <button
              onClick={() => {
                onClose();
                onReport(card?.name || '');
              }}
              className="py-4 px-4 bg-slate-700/50 border border-white/10 rounded-2xl text-sm font-medium text-slate-300 active:scale-[0.98] transition-transform"
              aria-label="정보 수정 제보"
            >
              📝
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
