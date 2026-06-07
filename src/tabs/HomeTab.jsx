/**
 * HomeTab - 홈 탭 컴포넌트
 * 3단계 고정 구조: 카드 없음 / 카드 있음+장소 미선택 / 카드 있음+장소 선택
 */

import { categoryConfig, placeTypeConfig } from '../lib/utils';
import { CONFIG } from '../constants/config';
import { EmptyState } from '../components/EmptyState';

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
  isDemo,
  favoritePlaceIds,
  recentPlaceIds,
  allPlaces,
  // Handlers
  setShowPlaceSheet,
  requestLocation: _requestLocation,
  setSearchQuery,
  selectPlace,
  handleSearchBenefitSelect,
  openBenefitDetail,
  handleNearby,
  setShowOcrModal,
  setActiveTab,
  // Unused but kept for potential future features
  setMyCards: _setMyCards,
  showToast: _showToast,
  startDemo,
  exitDemo
}) => {
  // 조건 텍스트 생성 - 불확실한 경우 단정 금지
  const getCaveatsText = (caveats) => {
    if (!caveats || caveats.length === 0) {
      return '실적 조건이 있을 수 있어요';
    }
    // 확정적 정보가 있으면 표시, 없으면 불확실 표시
    const hasSpecificInfo = caveats.some(c =>
      c.includes('만원') || c.includes('회') || c.includes('한도')
    );
    if (hasSpecificInfo) {
      return caveats.slice(0, 2).join(' / ');
    }
    return '실적 조건이 있을 수 있어요';
  };

  return (
    <div className="p-5 space-y-5" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ============================================ */}
      {/* 상태 1: 카드 없음 - 온보딩 */}
      {/* ============================================ */}
      {myCards.length === 0 && !isDemo && (
        <div className="space-y-5">
          {/* Scenario Card - 카드 없음 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/30 via-blue-600/20 to-transparent border border-purple-500/30 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-1">등록된 카드가 없어요</h2>
              <p className="text-sm text-slate-400 mb-4">카드를 추가하면 모든 혜택을 자동으로 추천해드려요</p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowOcrModal(true)}
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>📸</span> OCR 스캔
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="flex-1 py-3.5 bg-slate-800/80 border border-white/10 rounded-xl font-medium text-sm text-slate-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>🏦</span> 직접 선택
                </button>
              </div>
            </div>
          </div>

          {/* Demo Preview Card */}
          {demoData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-purple-500/20 text-purple-300 text-[11px] px-2 py-0.5 rounded-full font-bold">예시</span>
                <span className="text-sm text-slate-400">{demoData.place?.name}에서 추천</span>
              </div>

              {/* Demo Best Card Preview */}
              {demoData.benefits.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-slate-800/50 border border-white/10 p-4">
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

              {/* Demo CTA */}
              <button
                onClick={startDemo}
                className="w-full py-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-sm font-medium text-purple-300 active:scale-[0.98]"
              >
                🎮 데모로 체험해보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* 상태 2 & 3: 카드 있음 (실제 또는 데모) */}
      {/* ============================================ */}
      {(myCards.length > 0 || isDemo) && (
        <>
          {(favoritePlaceIds?.length > 0 || recentPlaceIds?.length > 0) && (
            <div className="space-y-2">
              {favoritePlaceIds?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {favoritePlaceIds.map((id) => {
                    const place = allPlaces?.[id];
                    return place ? (
                      <button
                        key={`fav-${id}`}
                        onClick={() => selectPlace(id)}
                        className="flex-shrink-0 px-3 py-1.5 bg-slate-800 rounded-full text-sm text-white min-h-[44px]"
                      >
                        {placeTypeConfig[place.type]?.emoji || '📍'} {place.name}
                      </button>
                    ) : null;
                  })}
                </div>
              )}
              {recentPlaceIds?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentPlaceIds.map((id) => {
                    const place = allPlaces?.[id];
                    return place ? (
                      <button
                        key={`recent-${id}`}
                        onClick={() => selectPlace(id)}
                        className="flex-shrink-0 px-3 py-1.5 bg-slate-900 rounded-full text-sm text-slate-200 min-h-[44px]"
                      >
                        {placeTypeConfig[place.type]?.emoji || '📍'} {place.name}
                      </button>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Demo Badge */}
          {isDemo && (
            <div className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-purple-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">DEMO</span>
                <span className="text-sm text-slate-300">데모 모드로 체험 중</span>
              </div>
              <button
                onClick={exitDemo}
                className="text-xs text-purple-400 underline"
              >
                종료
              </button>
            </div>
          )}

          {/* Place Selector */}
          <div className="flex gap-2">
            <button onClick={handleNearby} className="flex-1 p-4 bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-2xl border border-white/10 flex items-center gap-3 active:scale-[0.98]" aria-label="장소 선택" style={{ minHeight: '56px' }}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg">{selectedPlace ? placeTypeConfig[selectedPlace.type]?.emoji : '📍'}</div>
              <div className="flex-1 text-left min-w-0"><p className="text-[11px] text-slate-400">현재 장소</p><p className="font-bold truncate text-sm">{selectedPlace ? selectedPlace.name : '선택하세요'}</p></div>
            </button>
            <button onClick={handleNearby} className="w-14 bg-blue-600 rounded-2xl flex flex-col items-center justify-center active:scale-95" aria-label="내 주변" style={{ minHeight: '56px' }}><span className="text-lg">🎯</span><span className="text-[11px] font-bold">내주변</span></button>
          </div>

          {/* Search */}
          <div className="relative">
            <input type="text" placeholder="🔍 검색 (라운지, 발렛, 호텔...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3.5 text-sm placeholder-slate-500 focus:border-blue-500/50 focus:outline-none" aria-label="검색" style={{ minHeight: '48px' }} />
            {searchQuery && debouncedQuery && (searchResults.benefits.length > 0 || searchResults.places.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden z-20 shadow-2xl max-h-80 overflow-y-auto" role="listbox">
                {searchResults.benefits.length > 0 && (
                  <div className="p-3 border-b border-white/5">
                    <p className="text-[11px] text-blue-400 font-bold mb-2">💳 내 카드 혜택</p>
                    {searchResults.benefits.slice(0, 4).map(b => (
                      <button key={b.id} type="button" onClick={() => handleSearchBenefitSelect(b)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left" role="option" style={{ minHeight: '44px' }}>
                        <span className="text-lg">{categoryConfig[b.category]?.emoji}</span>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p><p className="text-[11px] text-slate-400">{b.card?.name}</p></div>
                        <span className="text-xs text-green-400 font-bold">{b.value}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.places.length > 0 && (
                  <div className="p-3">
                    <p className="text-[11px] text-purple-400 font-bold mb-2">📍 장소</p>
                    {searchResults.places.map(p => (
                      <button key={p.id} onClick={() => { selectPlace(p.id, { closeSheet: true }); setSearchQuery(''); }} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left" role="option" style={{ minHeight: '44px' }}>
                        <span className="text-lg">{placeTypeConfig[p.type]?.emoji}</span><span className="text-sm">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================ */}
          {/* 상태 2: 카드 있음 + 장소 미선택 */}
          {/* ============================================ */}
          {!selectedPlace && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-cyan-600/10 to-transparent border border-blue-500/20 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="font-bold text-lg mb-2">내 카드로 실시간 추천</h3>
              <p className="text-sm text-slate-400 mb-5">장소를 선택하면 지금 받을 수 있는<br/>혜택을 바로 보여드려요</p>
              <button onClick={handleNearby} className="w-full py-3.5 bg-blue-600 rounded-xl font-bold active:scale-[0.98]" style={{ minHeight: '48px' }}>🎯 내 주변에서 찾기</button>
            </div>
          )}

          {/* ============================================ */}
          {/* 상태 3: 카드 있음 + 장소 선택됨 */}
          {/* ============================================ */}
          {selectedPlace && smartBest && (
            <>
              {/* SmartBest Card - BEST 추천 */}
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
                            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">🏆 BEST</span>
                            <span className="text-sm font-bold">{smartBest.card.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">{smartBest.totalValue.toLocaleString()}원</p>
                        {smartBest.diff > 0 && <p className="text-[11px] text-green-400">2위보다 +{smartBest.diff.toLocaleString()}원</p>}
                      </div>
                    </div>

                    {/* Explanation 3 Lines - 추천 근거 */}
                    <div className="bg-slate-900/50 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-blue-400 shrink-0">1.</span>
                        <span className="truncate">{smartBest.explanation.summary || '매칭된 혜택'}</span>
                      </p>
                      <p className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-green-400 shrink-0">2.</span>
                        <span>예상 가치: <span className="text-green-400 font-medium">{smartBest.explanation.estimatedValue.toLocaleString()}원</span> <span className="text-slate-400">(추정)</span></span>
                      </p>
                      <p className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-amber-400 shrink-0">3.</span>
                        <span className="truncate">{getCaveatsText(smartBest.caveats)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Ranking */}
              {cardRanking.length > 1 && (
                <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold text-slate-400 mb-3">📊 내 카드 비교</h3>
                  <div className="space-y-3">
                    {cardRanking.slice(0, CONFIG.UI.MAX_CARD_RANKING).map((item, idx) => {
                      const pct = Math.round((item.totalValue / cardRanking[0].totalValue) * 100);
                      return (
                        <div key={item.card.id} className="flex items-center gap-3" style={{ minHeight: '32px' }}>
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
              {(availableBenefits.cardBenefits.length > 0 || availableBenefits.networkBenefits.length > 0) && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-3">📋 혜택 ({availableBenefits.cardBenefits.length + availableBenefits.networkBenefits.length})</h3>
                  <div className="space-y-2">
                    {availableBenefits.cardBenefits.map(b => (
                      <button key={b.id} onClick={() => openBenefitDetail(b)} className="w-full flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-white/5 active:bg-slate-700/50 transition-colors text-left" style={{ minHeight: '56px' }}>
                        <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-lg">{categoryConfig[b.category]?.emoji}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p><p className="text-[11px] text-slate-400">{b.card?.name}</p></div>
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full">{b.value}</span>
                      </button>
                    ))}
                    {availableBenefits.networkBenefits.length > 0 && (
                      <>
                        <p className="text-[11px] text-purple-400 font-bold mt-3 mb-2">🌐 네트워크 혜택</p>
                        {availableBenefits.networkBenefits.map((b, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20" style={{ minHeight: '56px' }}>
                            <span className="text-lg">{b.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{b.title}</p>
                              <p className="text-[11px] text-purple-400">{b.network} {b.grade}</p>
                            </div>
                            <span className="text-[11px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">NETWORK</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* No Benefits Found - Empty State */}
              {availableBenefits.cardBenefits.length === 0 && availableBenefits.networkBenefits.length === 0 && (
                <EmptyState
                  icon="🤔"
                  title="이 장소에서 사용 가능한 혜택이 없어요"
                  description="다른 장소를 선택하거나 카드를 추가해보세요"
                  primaryAction={{
                    icon: '📍',
                    label: '다른 장소 선택',
                    onClick: () => setShowPlaceSheet(true)
                  }}
                  secondaryAction={{
                    icon: '💳',
                    label: '카드 추가',
                    onClick: () => setActiveTab('wallet')
                  }}
                />
              )}
            </>
          )}

          {/* Place selected but no smartBest (no matching benefits) */}
          {selectedPlace && !smartBest && (
            <EmptyState
              icon="🤔"
              title="이 장소에서 사용 가능한 혜택이 없어요"
              description="다른 장소를 선택하거나 카드를 추가해보세요"
              primaryAction={{
                icon: '📍',
                label: '다른 장소 선택',
                onClick: () => setShowPlaceSheet(true)
              }}
              secondaryAction={{
                icon: '💳',
                label: '카드 추가',
                onClick: () => setActiveTab('wallet')
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
