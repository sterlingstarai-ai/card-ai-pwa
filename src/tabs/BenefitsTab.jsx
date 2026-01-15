/**
 * BenefitsTab - 내 혜택 탭 컴포넌트
 * 필터링, Universal 혜택, 네트워크 혜택, 카테고리별 혜택
 */

import { categoryConfig } from '../lib/utils';
import { CONFIG } from '../constants/config';

export const BenefitsTab = ({
  // Data
  benefitsFilterTag,
  filteredUniversalBenefits,
  filteredAllMyBenefitsEntries,
  myNetworkBenefits,
  myCards,
  // Handlers
  clearBenefitsFilter,
  openBenefitDetail,
  // Refs
  categorySectionRefs
}) => {
  return (
    <div className="p-5 space-y-6" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Filter Banner */}
      {benefitsFilterTag && (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-blue-300 font-bold tracking-widest">FILTER</p>
            <p className="text-sm font-bold">{categoryConfig[benefitsFilterTag]?.emoji} {categoryConfig[benefitsFilterTag]?.label}</p>
          </div>
          <button type="button" onClick={clearBenefitsFilter} className="px-3 py-2 rounded-xl bg-slate-800/60 border border-white/10 text-xs text-slate-200 active:scale-[0.98]">
            필터 해제
          </button>
        </div>
      )}

      {/* Universal Benefits */}
      {filteredUniversalBenefits.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-400 mb-3">💰 어디서든 ({filteredUniversalBenefits.length})</h3>
          <div className="space-y-2">
            {filteredUniversalBenefits.map(b => (
              <button key={b.id} onClick={() => openBenefitDetail(b)} className="w-full flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 active:bg-amber-500/20 transition-colors text-left">
                <span className="text-lg">{categoryConfig[b.category]?.emoji}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{b.title}</p><p className="text-[10px] text-slate-500">{b.card?.name}</p></div>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">{b.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Network Benefits */}
      {!benefitsFilterTag && myNetworkBenefits.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-purple-400 mb-3">🌍 카드 네트워크 혜택</h3>
          <div className="space-y-3">
            {myNetworkBenefits.map(({ network, grade, card, benefits }) => (
              <div key={`${network}-${grade}`} className="bg-purple-500/10 rounded-xl border border-purple-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{network === 'AMEX' ? '✨' : network === 'VISA' ? '💳' : '🌐'}</span>
                  <span className="font-bold">{network}</span>
                  <span className="text-[10px] text-purple-300 bg-purple-500/30 px-2 py-0.5 rounded-full">{grade}</span>
                  <span className="text-[10px] text-slate-400">· {card.shortName || card.name}</span>
                </div>
                <div className="space-y-2">
                  {benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start justify-between text-sm gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-200">{b.icon} {b.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{b.desc}</p>
                      </div>
                      <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full whitespace-nowrap">
                        {typeof b.value === 'number' ? `${(b.value / 10000).toFixed(0)}만원` : b.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Benefits */}
      {filteredAllMyBenefitsEntries.map(([cat, benefits]) => (
        <div key={cat} ref={el => { if (el) categorySectionRefs.current[cat] = el; }}>
          <h3 className="text-sm font-bold text-slate-400 mb-3">{categoryConfig[cat]?.emoji} {categoryConfig[cat]?.label} ({benefits.length})</h3>
          <div className="space-y-2">
            {benefits.slice(0, CONFIG.UI.MAX_BENEFITS_PER_CATEGORY).map(b => (
              <button key={b.id} onClick={() => openBenefitDetail(b)} className="w-full flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-white/5 active:bg-slate-700/50 transition-colors text-left">
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p><p className="text-[10px] text-slate-500">{b.card?.name}</p></div>
                <span className="text-xs text-green-400 font-medium">{b.value}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* No Benefits Found */}
      {benefitsFilterTag && myCards.length > 0 && filteredUniversalBenefits.length === 0 && filteredAllMyBenefitsEntries.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <span className="text-4xl">🫥</span>
          <p className="mt-4">해당 카테고리 혜택이 없습니다</p>
          <button type="button" onClick={clearBenefitsFilter} className="mt-4 px-4 py-2 bg-slate-800/60 border border-white/10 rounded-xl text-xs text-slate-200 active:scale-[0.98]">
            필터 해제
          </button>
        </div>
      )}

      {/* Empty State */}
      {myCards.length === 0 && (
        <div className="text-center py-16">
          <span className="text-4xl">💳</span>
          <p className="text-slate-400 mt-4">카드를 추가하면 혜택 확인 가능</p>
        </div>
      )}
    </div>
  );
};
