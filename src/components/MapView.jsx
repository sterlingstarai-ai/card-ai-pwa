/**
 * Kakao Maps based place selector component
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { placeTypeConfig } from '../lib/utils';
import { fetchKakaoPlacesByRect, getCategoryCodesForType } from '../lib/kakao-places';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_APP_KEY || '';

export const MapView = ({ userLocation, places, selectedPlaceId, onPlaceSelect, onClose, onError = () => {}, benefitsData, cardsData, myCards, selectedCategory = 'all' }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const liveFetchTimerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [activeRegion, setActiveRegion] = useState('서울');
  const [previewPlace, setPreviewPlace] = useState(null);
  const [livePlaces, setLivePlaces] = useState({});

  const regions = [
    { name: '전체', lat: 36.5, lng: 127.5, zoom: 7 },
    { name: '서울', lat: 37.55, lng: 127.0, zoom: 11 },
    { name: '인천', lat: 37.46, lng: 126.7, zoom: 11 },
    { name: '부산', lat: 35.16, lng: 129.1, zoom: 11 },
    { name: '제주', lat: 33.38, lng: 126.55, zoom: 10 }
  ];

  // 카카오맵 SDK 동적 로드
  useEffect(() => {
    // Check if API key is configured
    if (!KAKAO_APP_KEY) {
      const error = '지도 API 키가 설정되지 않았습니다';
      setMapError(error);
      onError(error);
      return;
    }

    console.log('[MapView] Platform:', Capacitor.getPlatform(), 'API Key:', KAKAO_APP_KEY ? 'set' : 'missing');

    if (window.kakao && window.kakao.maps) {
      setSdkLoaded(true);
      return;
    }

    // 로딩 타임아웃 (10초)
    const timeout = setTimeout(() => {
      if (!sdkLoaded) {
        const error = '지도 로딩 시간 초과 - 네트워크를 확인해주세요';
        setMapError(error);
        onError(error);
      }
    }, 10000);

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
    script.async = true;

    script.onload = () => {
      clearTimeout(timeout);
      console.log('Kakao SDK script loaded');
      setSdkLoaded(true);
    };

    script.onerror = (e) => {
      clearTimeout(timeout);
      console.error('Kakao SDK load error:', e);
      const error = '카카오맵 SDK 로드 실패 - 인터넷 연결을 확인해주세요';
      setMapError(error);
      onError(error);
    };

    document.head.appendChild(script);

    return () => {
      clearTimeout(timeout);
    };
  }, [sdkLoaded, onError]);

  // 카카오맵 초기화 (userLocation은 초기 센터용, 변경 시 재초기화 안함)
  const initialUserLocation = useRef(userLocation);
  useEffect(() => {
    if (!sdkLoaded || !window.kakao || !window.kakao.maps) {
      return;
    }

    window.kakao.maps.load(() => {
      if (!mapContainerRef.current) return;

      try {
        const loc = initialUserLocation.current;
        const initialCenter = loc
          ? new window.kakao.maps.LatLng(loc.lat, loc.lng)
          : new window.kakao.maps.LatLng(37.55, 127.0);

        const options = {
          center: initialCenter,
          level: loc ? 5 : 8
        };

        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, options);
        setMapReady(true);
        setMapError(null);
        console.log('Kakao Map initialized');

        // Safari WebView 강제 리페인트
        setTimeout(() => {
          if (mapRef.current && mapContainerRef.current) {
            mapRef.current.relayout();
            // 추가 강제 리페인트
            mapContainerRef.current.style.opacity = '0.99';
            window.requestAnimationFrame(() => {
              if (mapContainerRef.current) {
                mapContainerRef.current.style.opacity = '1';
              }
            });
          }
        }, 100);
      } catch (err) {
        console.error('Map init error:', err);
        const error = '지도 초기화 실패: ' + err.message;
        setMapError(error);
        onError(error);
      }
    });

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    };
  }, [sdkLoaded, onError]);

  // 지도 idle 이벤트에서 동적 장소 가져오기
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps?.event) return;

    const map = mapRef.current;

    const fetchLivePlaces = async () => {
      try {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const rect = `${sw.getLng()},${sw.getLat()},${ne.getLng()},${ne.getLat()}`;

        const codes = getCategoryCodesForType(selectedCategory);
        if (codes.length === 0) return;

        const results = await Promise.all(
          codes.map((code) => fetchKakaoPlacesByRect({ rect, categoryGroupCode: code }))
        );

        const merged = {};
        results.flat().forEach((p) => (merged[p.id] = p));
        setLivePlaces(merged);
      } catch (e) {
        // 조용히 실패 처리 (키 미설정/권한 등)
        console.warn('[MapView] Live places fetch failed:', e.message);
      }
    };

    const onIdle = () => {
      if (liveFetchTimerRef.current) clearTimeout(liveFetchTimerRef.current);
      liveFetchTimerRef.current = setTimeout(fetchLivePlaces, 350);
    };

    window.kakao.maps.event.addListener(map, 'idle', onIdle);

    // 최초 1회 실행
    onIdle();

    return () => {
      if (liveFetchTimerRef.current) clearTimeout(liveFetchTimerRef.current);
      window.kakao.maps.event.removeListener(map, 'idle', onIdle);
    };
  }, [mapReady, selectedCategory]);

  // 정적 places + 동적 livePlaces 병합
  const mergedPlaces = useMemo(() => {
    const staticPlaces = Array.isArray(places)
      ? places.reduce((acc, p) => { acc[p.id] = p; return acc; }, {})
      : (places || {});
    return { ...staticPlaces, ...livePlaces };
  }, [places, livePlaces]);

  // 장소 마커 생성
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // mergedPlaces 객체를 배열로 변환하여 순회
    Object.values(mergedPlaces).forEach(place => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      const emoji = placeTypeConfig[place.type]?.emoji || '📍';
      const isSelected = selectedPlaceId === place.id;

      // 커스텀 오버레이로 이모지 마커 생성
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="
          width: ${isSelected ? '44px' : '36px'};
          height: ${isSelected ? '44px' : '36px'};
          background: ${isSelected ? '#3b82f6' : '#1e293b'};
          border: 2px solid ${isSelected ? '#60a5fa' : '#475569'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '20px' : '16px'};
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.2s;
        ">${emoji}</div>
      `;
      content.style.cursor = 'pointer';
      content.onclick = () => {
        setPreviewPlace(place);
        // 지도 중심을 선택한 장소로 이동
        if (mapRef.current) {
          const pos = new window.kakao.maps.LatLng(place.lat, place.lng);
          mapRef.current.panTo(pos);
        }
      };

      const overlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 0.5,
        xAnchor: 0.5
      });

      overlay.setMap(mapRef.current);
      markersRef.current.push(overlay);
    });
  }, [mapReady, mergedPlaces, selectedPlaceId, onPlaceSelect]);

  // 사용자 위치 마커 + 위치 변경 시 지도 중심 이동
  const lastPanLocationRef = useRef(null);
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

    // 초기 위치(fallback)와 다른 실제 위치가 들어오면 1회 panTo
    const lastPan = lastPanLocationRef.current;
    if (!lastPan || (lastPan.lat !== userLocation.lat || lastPan.lng !== userLocation.lng)) {
      // 초기 센터(서울 fallback)와 다른 경우에만 이동
      const initLoc = initialUserLocation.current;
      if (!initLoc || initLoc.lat !== userLocation.lat || initLoc.lng !== userLocation.lng) {
        mapRef.current.panTo(position);
        mapRef.current.setLevel(5);
      }
      lastPanLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
    }

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="position: relative;">
        <div style="
          width: 40px;
          height: 40px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s infinite;
        "></div>
        <div style="
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.5; }
        }
      </style>
    `;

    const overlay = new window.kakao.maps.CustomOverlay({
      position: position,
      content: content,
      yAnchor: 0.5,
      xAnchor: 0.5
    });

    overlay.setMap(mapRef.current);
    userMarkerRef.current = overlay;
  }, [mapReady, userLocation]);

  const handleRegionClick = (region) => {
    if (!mapRef.current) return;
    setActiveRegion(region.name);
    const moveLatLng = new window.kakao.maps.LatLng(region.lat, region.lng);
    mapRef.current.setCenter(moveLatLng);
    mapRef.current.setLevel(region.zoom);
  };

  const handleMyLocation = () => {
    if (!mapRef.current || !userLocation) return;
    const moveLatLng = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    mapRef.current.setCenter(moveLatLng);
    mapRef.current.setLevel(5);
  };

  const handleZoomIn = () => {
    if (!mapRef.current) return;
    mapRef.current.setLevel(mapRef.current.getLevel() - 1);
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    mapRef.current.setLevel(mapRef.current.getLevel() + 1);
  };

  return (
    <div role="application" aria-label="장소 선택 지도" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 헤더 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px', zIndex: 30, background: 'linear-gradient(to bottom, rgba(15,23,42,0.95), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>마커를 탭하여 장소 선택</span>
          <button onClick={onClose} aria-label="지도 닫기" style={{ width: '32px', height: '32px', background: '#334155', borderRadius: '50%', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {regions.map(r => (
            <button key={r.name} onClick={() => handleRegionClick(r)} role="tab" aria-selected={activeRegion === r.name}
              style={{ padding: '6px 12px', background: activeRegion === r.name ? '#3b82f6' : '#334155', borderRadius: '20px', border: 'none', color: 'white', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* 카카오맵 컨테이너 */}
      <div ref={mapContainerRef} style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 10,
        // Safari WebView 렌더링 이슈 해결
        WebkitTransform: 'translate3d(0,0,0)',
        transform: 'translate3d(0,0,0)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
        isolation: 'isolate',
      }} />

      {/* 로딩/에러 상태 */}
      {!mapReady && !mapError && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
          <div>지도 로딩 중...</div>
        </div>
      )}
      {mapError && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#f87171', padding: '20px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ marginBottom: '12px' }}>{mapError}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
            카카오 개발자 콘솔에서<br/>
            플랫폼 → Web 도메인 등록 필요:<br/>
            <span style={{ color: '#60a5fa' }}>localhost, capacitor://localhost</span>
          </div>
        </div>
      )}

      {/* 줌 컨트롤 */}
      <div style={{ position: 'absolute', bottom: previewPlace ? '180px' : '100px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 30, transition: 'bottom 0.2s' }}>
        <button onClick={handleZoomIn} aria-label="확대" style={{ width: '40px', height: '40px', background: '#334155', borderRadius: '8px', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>+</button>
        <button onClick={handleZoomOut} aria-label="축소" style={{ width: '40px', height: '40px', background: '#334155', borderRadius: '8px', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>−</button>
      </div>

      {/* 내 위치 버튼 */}
      {userLocation && (
        <button onClick={handleMyLocation} aria-label="내 위치로 이동"
          style={{ position: 'absolute', bottom: previewPlace ? '180px' : '100px', left: '16px', width: '40px', height: '40px', background: '#3b82f6', borderRadius: '8px', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer', zIndex: 30, transition: 'bottom 0.2s' }}>🎯</button>
      )}

      {/* 장소 미리보기 패널 */}
      {previewPlace && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.98), rgba(15,23,42,0.95))', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '16px', zIndex: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>{placeTypeConfig[previewPlace.type]?.emoji || '📍'}</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>{previewPlace.name}</span>
              </div>
              {(() => {
                // 이 장소에서 사용 가능한 혜택 계산
                const placeBenefits = benefitsData && myCards ? Object.entries(benefitsData)
                  .filter(([, b]) => myCards.includes(b.cardId) && b.placeTags?.some(t => previewPlace.tags?.includes(t)))
                  .slice(0, 2)
                  .map(([id, b]) => ({ id, ...b, card: cardsData?.[b.cardId] })) : [];

                return placeBenefits.length > 0 ? (
                  <div style={{ marginTop: '8px' }}>
                    {placeBenefits.map(b => (
                      <div key={b.id} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                        <span style={{ color: '#60a5fa' }}>{b.card?.shortName || '카드'}</span> · {b.title}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>등록된 카드로 사용 가능한 혜택 확인</div>
                );
              })()}
            </div>
            <button onClick={() => setPreviewPlace(null)} style={{ width: '28px', height: '28px', background: '#334155', borderRadius: '50%', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
          <button
            onClick={() => { onPlaceSelect(previewPlace.id); setPreviewPlace(null); }}
            style={{ width: '100%', padding: '14px', background: '#3b82f6', borderRadius: '12px', border: 'none', color: 'white', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            이 장소 선택하기
          </button>
        </div>
      )}
    </div>
  );
};
