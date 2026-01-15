/**
 * HomeTab - 홈 탭 컴포넌트
 * 장소 선택, 검색, SmartBest 추천, 카드 비교, 혜택 목록
 */

import { categoryConfig, placeTypeConfig } from '../lib/utils';
import { CONFIG } from '../constants/config';

export const HomeTab = ({
  // Data
  selectedPlace,
  smartBest,
  cardRanking,
  availableBenefits,
  searchQuery,
  debouncedQuery,
  searchResults,
  demoData,
  myCards,
  // Handlers
  setShowPlaceSheet,
  requestLocation,
  setSearchQuery,
  selectPlace,
  handleSearchBenefitSelect,
  openBenefitDetail,
  handleNearby,
  setShowOcrModal,
  setActiveTab,
  setMyCards,
  showToast
}) => {
  return (
    <div className="p-5 space-y-5" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Place Selector */}
      <div className="flex gap-2">
        <button onClick={() => setShowPlaceSheet(true)} className="flex-1 p-4 bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-2xl border border-white/10 flex items-center gap-3 active:scale-[0.98]" aria-label="장소 선택">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg">{selectedPlace ? placeTypeConfig[selectedPlace.type]?.emoji : '📍'}</div>
          <div className="flex-1 text-left min-w-0"><p className="text-[10px] text-slate-400">현재 장소</p><p className="font-bold truncate text-sm">{selectedPlace ? selectedPlace.name : '선택하세요'}</p></div>
        </button>
        <button onClick={async () => { await requestLocation(); setShowPlaceSheet(true); }} className="w-14 h-14 bg-blue-600 rounded-2xl flex flex-col items-center justify-center active:scale-95" aria-label="내 주변"><span className="text-lg">🎯</span><span className="text-[8px] font-bold">내주변</span></button>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="🔍 검색 (라운지, 발렛, 호텔...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm placeholder-slate-500 focus:border-blue-500/50 focus:outline-none" aria-label="검색" />
        {searchQuery && debouncedQuery && (searchResults.benefits.length > 0 || searchResults.places.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden z-20 shadow-2xl max-h-80 overflow-y-auto" role="listbox">
            {searchResults.benefits.length > 0 && (
              <div className="p-3 border-b border-white/5">
                <p className="text-[10px] text-blue-400 font-bold mb-2">💳 내 카드 혜택</p>
                {searchResults.benefits.slice(0, 4).map(b => (
                  <button key={b.id} type="button" onClick={() => handleSearchBenefitSelect(b)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left" role="option">
                    <span className="text-lg">{categoryConfig[b.category]?.emoji}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p><p className="text-[10px] text-slate-500">{b.card?.name}</p></div>
                    <span className="text-xs text-green-400 font-bold">{b.value}</span>
                  </button>
                ))}
              </div>
            )}
            {searchResults.places.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] text-purple-400 font-bold mb-2">📍 장소</p>
                {searchResults.places.map(p => (
                  <button key={p.id} onClick={() => { selectPlace(p.id, { closeSheet: true }); setSearchQuery(''); }} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left" role="option">
                    <span className="text-lg">{placeTypeConfig[p.type]?.emoji}</span><span className="text-sm">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SmartBest Card */}
      {selectedPlace && smartBest && (
        <div className="sticky top-0 z-10 -mx-5 px-5 pt-2 pb-3 bg-[#0a0a0f]/95 backdrop-blur-xl">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-transparent border border-blue-500/30 p-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="relative z-10">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded-lg shadow-lg border border-white/20" style={{ background: `linear-gradient(135deg, ${smartBest.card.color}, #1a1a1a)` }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">🏆 BEST</span>
                      <span className="text-sm font-bold">{smartBest.card.name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">{smartBest.totalValue.toLocaleString()}원</p>
                  {smartBest.diff > 0 && <p className="text-[10px] text-green-400">2위보다 +{smartBest.diff.toLocaleString()}원</p>}
                </div>
              </div>
              {/* Explanation 3 Lines */}
              <div className="bg-slate-900/50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">1.</span>
                  <span className="truncate">{smartBest.explanation.summary}</span>
                </p>
                <p className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-green-400 shrink-0">2.</span>
                  <span>예상 가치: <span className="text-green-400 font-medium">{smartBest.explanation.estimatedValue.toLocaleString()}원</span> (추정)</span>
                </p>
                <p className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">3.</span>
                  <span className="truncate">조건: {smartBest.explanation.caveats}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Ranking */}
      {selectedPlace && cardRanking.length > 1 && (
        <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5">
          <h3 className="text-sm font-bold text-slate-400 mb-3">📊 내 카드 비교</h3>
          <div className="space-y-3">
            {cardRanking.slice(0, CONFIG.UI.MAX_CARD_RANKING).map((item, idx) => {
              const pct = Math.round((item.totalValue / cardRanking[0].totalValue) * 100);
              return (
                <div key={item.card.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{idx + 1}</span>
                  <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: item.card.color }} />
                  <span className="text-xs w-16 truncate">{item.card.name}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${idx === 0 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-slate-500'}`} style={{ width: `${pct}%` }} /></div>
                  <span className="text-xs text-slate-400 w-14 text-right">{item.totalValue.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Benefits */}
      {selectedPlace && (availableBenefits.cardBenefits.length > 0 || availableBenefits.networkBenefits.length > 0) && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 mb-3">📋 혜택 ({availableBenefits.cardBenefits.length + availableBenefits.networkBenefits.length})</h3>
          <div className="space-y-2">
            {availableBenefits.cardBenefits.map(b => (
              <button key={b.id} onClick={() => openBenefitDetail(b)} className="w-full flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-white/5 active:bg-slate-700/50 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-lg">{categoryConfig[b.category]?.emoji}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p><p className="text-[10px] text-slate-500">{b.card?.name}</p></div>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full">{b.value}</span>
              </button>
            ))}
            {availableBenefits.networkBenefits.length > 0 && (
              <>
                <p className="text-[10px] text-purple-400 font-bold mt-3 mb-2">🌐 글로벌</p>
                {availableBenefits.networkBenefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                    <span className="text-lg">{b.icon}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium">{b.title}</p><p className="text-[10px] text-purple-400">{b.network} {b.grade}</p></div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* No Place Selected */}
      {!selectedPlace && myCards.length > 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"><span className="text-4xl">📍</span></div>
          <p className="text-slate-400 mb-4">장소를 선택하면<br/>최적의 카드를 추천해드려요</p>
          <button onClick={handleNearby} className="px-6 py-3 bg-blue-600 rounded-xl font-bold active:scale-95">🎯 내 주변에서 찾기</button>
        </div>
      )}

      {/* Onboarding Demo Mode */}
      {!selectedPlace && myCards.length === 0 && demoData && (
        <div className="space-y-5">
          {/* Demo Banner */}
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">DEMO</span>
              <span className="text-sm font-bold">이렇게 추천해드려요</span>
            </div>
            <p className="text-xs text-slate-400">예시: {demoData.place?.name}에서 사용 가능한 혜택</p>
          </div>

          {/* Demo Best Card */}
          {demoData.benefits.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent border border-blue-500/20 p-4 opacity-90">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 rounded bg-gradient-to-r from-purple-600 to-blue-600" />
                  <span className="text-sm font-bold">{demoData.benefits[0]?.card?.name}</span>
                </div>
                <span className="text-green-400 font-bold">{demoData.totalValue.toLocaleString()}원</span>
              </div>
              <div className="space-y-1">
                {demoData.benefits.slice(0, 3).map((b, i) => (
                  <p key={i} className="text-xs text-slate-400">• {categoryConfig[b.category]?.emoji} {b.title}</p>
                ))}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <p className="text-center text-sm font-bold text-slate-300">내 카드를 등록하면 실시간 추천!</p>
            <button
              onClick={() => { setShowOcrModal(true); setActiveTab('home'); }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold text-white active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>📸</span> OCR로 카드 스캔하기
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className="w-full py-4 bg-slate-800/80 border border-white/10 rounded-2xl font-bold text-slate-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>🏦</span> 카드사에서 직접 선택
            </button>
            <button
              onClick={() => { setMyCards(CONFIG.DEMO.CARDS); showToast('데모 카드 3장이 추가되었습니다'); }}
              className="w-full py-3 text-sm text-slate-500 active:text-slate-300"
            >
              나중에 할게요 (데모로 체험하기)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
