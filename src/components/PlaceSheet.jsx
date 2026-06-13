/**
 * PlaceSheet - 장소 선택 바텀시트
 * 목록 보기, 지도 보기, 즐겨찾기, 최근 장소, 카테고리 필터
 */

import { useEffect, useMemo, useState } from 'react';
import { formatDistance, placeTypeConfig, placeCategories } from '../lib/utils';
import { CONFIG } from '../constants/config';
import { MapView } from './MapView';
import { fetchKakaoPlacesByRadius, getCategoryCodesForType } from '../lib/kakao-places';

export const PlaceSheet = ({
  // Data
  placesData,
  nearbyPlaces,
  selectedPlaceId,
  recentPlaceIds,
  favoritePlaceIds,
  placeCategoryFilter,
  placeSheetView,
  locationStatus,
  userLocation,
  benefitsData,
  cardsData,
  myCards,
  // Handlers
  setShowPlaceSheet,
  setPlaceSheetView,
  setPlaceCategoryFilter,
  selectPlace,
  toggleFavorite,
  isFavoritablePlace,
  pickNearestPlace,
  requestLocation,
  showToast
}) => {
  const [liveCategoryPlaces, setLiveCategoryPlaces] = useState([]);
  const [liveCategoryLoading, setLiveCategoryLoading] = useState(false);

  useEffect(() => {
    const isDynamicCategory = placeCategoryFilter === 'cafe' || placeCategoryFilter === 'mart';
    if (!isDynamicCategory) {
      setLiveCategoryPlaces([]);
      setLiveCategoryLoading(false);
      return;
    }

    let canceled = false;
    const location = userLocation || CONFIG.DEFAULTS.LOCATION;
    const categoryCodes = getCategoryCodesForType(placeCategoryFilter);
    const categoryCode = categoryCodes[0];
    if (!categoryCode) return;

    const load = async () => {
      setLiveCategoryLoading(true);
      try {
        const [page1, page2] = await Promise.all([
          fetchKakaoPlacesByRadius({
            x: location.lng,
            y: location.lat,
            radius: 5000,
            mode: 'category',
            categoryGroupCode: categoryCode,
            size: 15,
            page: 1,
          }),
          fetchKakaoPlacesByRadius({
            x: location.lng,
            y: location.lat,
            radius: 5000,
            mode: 'category',
            categoryGroupCode: categoryCode,
            size: 15,
            page: 2,
          }),
        ]);
        if (canceled) return;
        const merged = [...page1, ...page2];
        const deduped = Object.values(
          merged.reduce((acc, place) => {
            if (place?.id) acc[place.id] = place;
            return acc;
          }, {})
        );
        setLiveCategoryPlaces(deduped);
      } catch (error) {
        console.error('[PlaceSheet] Live category search failed:', error);
        if (!canceled) showToast('실시간 장소 검색에 실패했습니다');
      } finally {
        if (!canceled) setLiveCategoryLoading(false);
      }
    };

    void load();

    return () => {
      canceled = true;
    };
  }, [placeCategoryFilter, userLocation, showToast]);

  const filteredStaticPlaces = useMemo(
    () =>
      Object.values(placesData).filter(
        (p) => placeCategoryFilter === 'all' || p.type === placeCategoryFilter
      ),
    [placesData, placeCategoryFilter]
  );

  const displayPlaces =
    placeCategoryFilter === 'cafe' || placeCategoryFilter === 'mart'
      ? liveCategoryPlaces
      : filteredStaticPlaces;

  return (
    <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowPlaceSheet(false)} role="dialog" aria-modal="true">
      <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1f] rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ maxWidth: '430px', margin: '0 auto', height: '75vh' }}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div><div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-3" /><h2 className="text-lg font-bold">장소 선택</h2></div>
          <div className="flex gap-2" role="tablist">
            <button onClick={() => setPlaceSheetView('list')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placeSheetView === 'list' ? 'bg-blue-600' : 'bg-slate-700'}`} role="tab" aria-label="목록 보기" aria-selected={placeSheetView === 'list'}>📋 목록</button>
            <button onClick={() => {
              if (!CONFIG.FEATURES.MAP_ENABLED) {
                showToast('지도 기능이 일시적으로 비활성화되어 있습니다');
                return;
              }
              if (locationStatus === 'idle') requestLocation();
              setPlaceSheetView('map');
            }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placeSheetView === 'map' ? 'bg-blue-600' : 'bg-slate-700'} ${!CONFIG.FEATURES.MAP_ENABLED ? 'opacity-50' : ''}`} role="tab" aria-label="지도 보기" aria-selected={placeSheetView === 'map'} disabled={!CONFIG.FEATURES.MAP_ENABLED}>🗺️ 지도</button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(75vh-80px)] overflow-hidden">
          {placeSheetView === 'list' ? (
            <div className="p-4 overflow-y-auto h-full scroll-container" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              {/* Quick Nearby */}
              {(locationStatus === 'success' || locationStatus === 'fallback') && nearbyPlaces.length > 0 && (
                <button onClick={pickNearestPlace} className="w-full p-4 mb-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-500/30 text-left active:scale-[0.98]">
                  <p className="font-bold text-green-400">⚡ 가장 가까운 곳</p>
                  <p className="text-xs text-slate-400 mt-1">{nearbyPlaces[0].name} · {formatDistance(nearbyPlaces[0].distance)}</p>
                </button>
              )}
              {(locationStatus === 'idle' || locationStatus === 'denied') && (
                <button onClick={requestLocation} disabled={locationStatus === 'loading'} className="w-full p-4 mb-4 bg-blue-600/20 rounded-2xl border border-blue-500/30 text-left disabled:opacity-60">
                  <p className="font-bold text-blue-400">📍 내 위치 찾기</p>
                  <p className="text-xs text-slate-400 mt-1">GPS 권한 허용 시 주변 혜택 자동 추천</p>
                </button>
              )}
              {locationStatus === 'loading' && (
                <div className="w-full p-4 mb-4 bg-slate-800/40 rounded-2xl border border-white/5 text-left">
                  <p className="font-bold text-slate-200">📍 내 위치 확인 중...</p>
                  <p className="text-xs text-slate-400 mt-1">잠시만 기다려주세요</p>
                </div>
              )}

              {/* Favorites */}
              {favoritePlaceIds.length > 0 && placeCategoryFilter === 'all' && (
                <div className="mb-4">
                  <p className="text-xs text-amber-400 font-bold mb-2">⭐ 즐겨찾기</p>
                  <div className="flex flex-wrap gap-2">
                    {favoritePlaceIds.map(id => placesData[id]).filter(Boolean).map(p => (
                      <button key={p.id} onClick={() => selectPlace(p.id)} className={`px-3 py-2 rounded-full text-xs border active:scale-[0.98] ${selectedPlaceId === p.id ? 'bg-amber-600 border-amber-400/40' : 'bg-amber-500/10 border-amber-500/30'}`}>
                        <span className="mr-1">{placeTypeConfig[p.type]?.emoji}</span>{p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent places */}
              {recentPlaceIds.length > 0 && placeCategoryFilter === 'all' && (
                <div className="mb-4">
                  <p className="text-xs text-slate-400 font-bold mb-2">🕘 최근</p>
                  <div className="flex flex-wrap gap-2">
                    {recentPlaceIds.filter(id => !favoritePlaceIds.includes(id)).map(id => placesData[id]).filter(Boolean).map(p => (
                      <button key={p.id} onClick={() => selectPlace(p.id)} className={`px-3 py-2 rounded-full text-xs border active:scale-[0.98] ${selectedPlaceId === p.id ? 'bg-blue-600 border-blue-400/40' : 'bg-slate-800/50 border-white/10'}`}>
                        <span className="mr-1">{placeTypeConfig[p.type]?.emoji}</span>{p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby */}
              {nearbyPlaces.length > 0 && placeCategoryFilter === 'all' && (
                <div className="mb-4">
                  <p className="text-xs text-blue-400 font-bold mb-2">📍 {locationStatus === 'fallback' ? '서울 기준' : '내 주변'}</p>
                  {nearbyPlaces.slice(0, CONFIG.UI.MAX_NEARBY_PLACES).map(p => (
                    <button key={p.id} onClick={() => selectPlace(p.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 active:scale-[0.98] ${selectedPlaceId === p.id ? 'bg-blue-600' : 'bg-slate-800/50'}`}>
                      <span className="text-xl">{placeTypeConfig[p.type]?.emoji}</span>
                      <div className="flex-1 text-left"><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-slate-400">{formatDistance(p.distance)}</p></div>
                    </button>
                  ))}
                </div>
              )}

              {/* Category Tabs */}
              <div className="mb-4 -mx-4 px-4 overflow-x-auto">
                <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
                  {placeCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setPlaceCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${placeCategoryFilter === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-800/50 text-slate-400'}`}>
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtered Place List */}
              <p className="text-xs text-slate-400 font-bold mb-2">
                {placeCategoryFilter === 'all' ? '📋 전체' : `${placeTypeConfig[placeCategoryFilter]?.emoji || '📋'} ${placeTypeConfig[placeCategoryFilter]?.label || '전체'}`}
              </p>
              {liveCategoryLoading && (
                <div className="w-full p-4 mb-3 bg-slate-800/40 rounded-xl border border-white/5 text-sm text-slate-300">
                  실시간 장소를 불러오는 중...
                </div>
              )}
              {displayPlaces.map(p => (
                <div key={p.id} className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 ${selectedPlaceId === p.id ? 'bg-blue-600' : 'bg-slate-800/30'}`}>
                  <button onClick={() => selectPlace(p)} className="flex-1 flex items-center gap-3 text-left active:scale-[0.98]">
                    <span className="text-xl">{placeTypeConfig[p.type]?.emoji}</span>
                    <span className="font-medium text-sm">{p.name}</span>
                  </button>
                  {/* 영구 저장 가능한(정적 데이터) 장소에만 즐겨찾기 별 표시 —
                      라이브(kakao:) 장소는 저장이 안 되므로 별을 숨겨 무손실 방지 */}
                  {(!isFavoritablePlace || isFavoritablePlace(p.id)) && (
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }} className="p-2 rounded-lg active:scale-90">
                      <span className={favoritePlaceIds.includes(p.id) ? 'text-amber-400' : 'text-slate-400'}>
                        {favoritePlaceIds.includes(p.id) ? '★' : '☆'}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <MapView
              userLocation={userLocation}
              places={Object.values(placesData)}
              selectedPlaceId={selectedPlaceId}
              selectedCategory={placeCategoryFilter}
              onPlaceSelect={selectPlace}
              onClose={() => setShowPlaceSheet(false)}
              benefitsData={benefitsData}
              cardsData={cardsData}
              myCards={myCards}
            />
          )}
        </div>
      </div>
    </div>
  );
};
