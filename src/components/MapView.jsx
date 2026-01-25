/**
 * Kakao Maps based place selector component
 *
 * Key design points:
 * - Map rendering uses kakao.maps.Marker + MarkerClusterer (not CustomOverlay) for performance.
 * - We render from pre-collected static data (places prop). This avoids Kakao Local REST hard caps.
 * - We cache marker images per (emoji, selected) so we don't create thousands of unique assets.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { placeTypeConfig } from '../lib/utils';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_APP_KEY || '';

const isInKoreaBounds = (lat, lng) => lat >= 32 && lat <= 39 && lng >= 124 && lng <= 132;

const normalizeLatLng = (latRaw, lngRaw) => {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (isInKoreaBounds(lat, lng)) return { lat, lng };
  if (isInKoreaBounds(lng, lat)) return { lat: lng, lng: lat, swapped: true };

  // outside Korea: ignore to avoid odd clusters far away
  return null;
};

const buildEmojiMarkerDataUrl = (emoji, selected) => {
  const size = selected ? 36 : 28;
  const radius = selected ? 16 : 12;
  const bg = selected ? '#3b82f6' : '#1e293b';
  const stroke = selected ? '#60a5fa' : '#475569';
  const fontSize = selected ? 16 : 12;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  ctx.font = `${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Apple Color Emoji', 'Segoe UI Emoji'`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(emoji, size / 2, size / 2 + 0.5);

  return canvas.toDataURL('image/png');
};

const getOrCreateMarkerImage = (kakao, cacheRef, emoji, selected) => {
  const key = `${emoji}::${selected ? '1' : '0'}`;
  if (cacheRef.current[key]) return cacheRef.current[key];

  const url = buildEmojiMarkerDataUrl(emoji, selected);
  const size = selected ? 36 : 28;
  const imageSize = new kakao.maps.Size(size, size);
  const imageOption = { offset: new kakao.maps.Point(size / 2, size / 2) };
  const markerImage = new kakao.maps.MarkerImage(url, imageSize, imageOption);

  cacheRef.current[key] = markerImage;
  return markerImage;
};

export const MapView = ({
  userLocation,
  places,
  selectedPlaceId,
  onPlaceSelect,
  onClose,
  onError = () => {},
  benefitsData,
  cardsData,
  myCards,
  selectedCategory = 'all',
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const clustererRef = useRef(null);
  const markersByIdRef = useRef(new Map());
  const markerImageCacheRef = useRef({});
  const userMarkerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [activeRegion, setActiveRegion] = useState('서울');
  const [previewPlace, setPreviewPlace] = useState(null);

  const regions = [
    { name: '전체', lat: 36.5, lng: 127.5, zoom: 7 },
    { name: '서울', lat: 37.55, lng: 127.0, zoom: 11 },
    { name: '인천', lat: 37.46, lng: 126.7, zoom: 11 },
    { name: '부산', lat: 35.16, lng: 129.1, zoom: 11 },
    { name: '제주', lat: 33.38, lng: 126.55, zoom: 10 },
  ];

  const filteredPlaces = useMemo(() => {
    const arr = Array.isArray(places) ? places : Object.values(places || {});
    if (!selectedCategory || selectedCategory === 'all') return arr;
    return arr.filter((p) => p?.type === selectedCategory);
  }, [places, selectedCategory]);

  // SDK dynamic load (clusterer library included)
  useEffect(() => {
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

    const timeout = setTimeout(() => {
      if (!sdkLoaded) {
        const error = '지도 로딩 시간 초과 - 네트워크를 확인해주세요';
        setMapError(error);
        onError(error);
      }
    }, 10000);

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=clusterer`;
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

  // Initialize map once (userLocation only used for initial center)
  const initialUserLocation = useRef(userLocation);
  useEffect(() => {
    if (!sdkLoaded || !window.kakao || !window.kakao.maps) return;

    window.kakao.maps.load(() => {
      if (!mapContainerRef.current) return;

      try {
        const loc = initialUserLocation.current;
        const initialCenter = loc
          ? new window.kakao.maps.LatLng(loc.lat, loc.lng)
          : new window.kakao.maps.LatLng(37.55, 127.0);

        const options = {
          center: initialCenter,
          level: loc ? 5 : 8,
        };

        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, options);
        setMapReady(true);
        setMapError(null);
        console.log('Kakao Map initialized');

        clustererRef.current = new window.kakao.maps.MarkerClusterer({
          map: mapRef.current,
          averageCenter: true,
          minLevel: 6,
          gridSize: 55,
          disableClickZoom: false,
        });

        // Safari WebView repaint workaround
        setTimeout(() => {
          if (mapRef.current && mapContainerRef.current) {
            mapRef.current.relayout();
            mapContainerRef.current.style.opacity = '0.99';
            window.requestAnimationFrame(() => {
              if (mapContainerRef.current) mapContainerRef.current.style.opacity = '1';
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
      if (clustererRef.current) {
        try {
          clustererRef.current.clear();
        } catch (_) {
          // ignore
        }
      }
      markersByIdRef.current.forEach((m) => m.setMap(null));
      markersByIdRef.current.clear();
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    };
  }, [sdkLoaded, onError]);

  // Build (or rebuild) place markers when the dataset changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps || !clustererRef.current) return;

    const kakao = window.kakao;
    const map = mapRef.current;

    clustererRef.current.clear();
    markersByIdRef.current.forEach((m) => m.setMap(null));
    markersByIdRef.current.clear();

    const markers = [];

    for (const place of filteredPlaces) {
      if (!place) continue;
      const coords = normalizeLatLng(place.lat, place.lng);
      if (!coords) continue;

      const emoji = placeTypeConfig[place.type]?.emoji || '📍';
      const markerImage = getOrCreateMarkerImage(kakao, markerImageCacheRef, emoji, selectedPlaceId === place.id);

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(coords.lat, coords.lng),
        title: place.name || '',
        image: markerImage,
        clickable: true,
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        setPreviewPlace(place);
        map.panTo(marker.getPosition());
      });

      markersByIdRef.current.set(place.id, marker);
      markers.push(marker);
    }

    clustererRef.current.addMarkers(markers);

    if (selectedPlaceId && markersByIdRef.current.has(selectedPlaceId)) {
      markersByIdRef.current.get(selectedPlaceId).setZIndex(10);
    }
  }, [mapReady, filteredPlaces]);

  // Update selected marker image without rebuilding everything
  const lastSelectedRef = useRef(null);
  useEffect(() => {
    if (!mapReady || !window.kakao?.maps) return;
    const kakao = window.kakao;

    const last = lastSelectedRef.current;
    if (last && markersByIdRef.current.has(last)) {
      const place = filteredPlaces.find((p) => p?.id === last);
      if (place) {
        const emoji = placeTypeConfig[place.type]?.emoji || '📍';
        const normalImage = getOrCreateMarkerImage(kakao, markerImageCacheRef, emoji, false);
        const marker = markersByIdRef.current.get(last);
        marker.setImage(normalImage);
        marker.setZIndex(1);
      }
    }

    if (selectedPlaceId && markersByIdRef.current.has(selectedPlaceId)) {
      const place = filteredPlaces.find((p) => p?.id === selectedPlaceId);
      if (place) {
        const emoji = placeTypeConfig[place.type]?.emoji || '📍';
        const selectedImage = getOrCreateMarkerImage(kakao, markerImageCacheRef, emoji, true);
        const marker = markersByIdRef.current.get(selectedPlaceId);
        marker.setImage(selectedImage);
        marker.setZIndex(10);
      }
    }

    lastSelectedRef.current = selectedPlaceId || null;
    if (clustererRef.current) clustererRef.current.redraw();
  }, [mapReady, selectedPlaceId, filteredPlaces]);

  // User location marker + pan once when a real location arrives
  const lastPanLocationRef = useRef(null);
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation || !window.kakao?.maps) return;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

    const lastPan = lastPanLocationRef.current;
    if (!lastPan || lastPan.lat !== userLocation.lat || lastPan.lng !== userLocation.lng) {
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
      position,
      content,
      yAnchor: 0.5,
      xAnchor: 0.5,
    });

    overlay.setMap(mapRef.current);
    userMarkerRef.current = overlay;
  }, [mapReady, userLocation]);

  const handleRegionClick = (region) => {
    if (!mapRef.current || !window.kakao?.maps) return;
    setActiveRegion(region.name);
    const moveLatLng = new window.kakao.maps.LatLng(region.lat, region.lng);
    mapRef.current.setCenter(moveLatLng);
    mapRef.current.setLevel(region.zoom);
  };

  const handleMyLocation = () => {
    if (!mapRef.current || !userLocation || !window.kakao?.maps) return;
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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px', zIndex: 30, background: 'linear-gradient(to bottom, rgba(15,23,42,0.95), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>마커/클러스터를 탭하여 장소 확인</span>
          <button onClick={onClose} aria-label="지도 닫기" style={{ width: '32px', height: '32px', background: '#334155', borderRadius: '50%', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {regions.map((r) => (
            <button
              key={r.name}
              onClick={() => handleRegionClick(r)}
              role="tab"
              aria-selected={activeRegion === r.name}
              style={{
                padding: '6px 12px',
                background: activeRegion === r.name ? '#3b82f6' : '#334155',
                borderRadius: '20px',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 10,
          WebkitTransform: 'translate3d(0,0,0)',
          transform: 'translate3d(0,0,0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
          isolation: 'isolate',
        }}
      />

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
            카카오 개발자 콘솔에서<br />
            플랫폼 → Web 도메인 등록 필요:<br />
            <span style={{ color: '#60a5fa' }}>localhost, capacitor://localhost</span>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: previewPlace ? '180px' : '100px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 30, transition: 'bottom 0.2s' }}>
        <button onClick={handleZoomIn} aria-label="확대" style={{ width: '40px', height: '40px', background: '#334155', borderRadius: '8px', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>+</button>
        <button onClick={handleZoomOut} aria-label="축소" style={{ width: '40px', height: '40px', background: '#334155', borderRadius: '8px', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>−</button>
      </div>

      {userLocation && (
        <button
          onClick={handleMyLocation}
          aria-label="내 위치로 이동"
          style={{
            position: 'absolute',
            bottom: previewPlace ? '180px' : '100px',
            left: '16px',
            width: '40px',
            height: '40px',
            background: '#3b82f6',
            borderRadius: '8px',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            zIndex: 30,
            transition: 'bottom 0.2s',
          }}
        >
          🎯
        </button>
      )}

      {previewPlace && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.98), rgba(15,23,42,0.95))', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '16px', zIndex: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>{placeTypeConfig[previewPlace.type]?.emoji || '📍'}</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>{previewPlace.name}</span>
              </div>
              {(() => {
                const placeBenefits = benefitsData && myCards
                  ? Object.entries(benefitsData)
                      .filter(([, b]) => myCards.includes(b.cardId) && b.placeTags?.some((t) => previewPlace.tags?.includes(t)))
                      .slice(0, 2)
                      .map(([id, b]) => ({ id, ...b, card: cardsData?.[b.cardId] }))
                  : [];

                return placeBenefits.length > 0 ? (
                  <div style={{ marginTop: '8px' }}>
                    {placeBenefits.map((b) => (
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
            onClick={() => {
              onPlaceSelect(previewPlace);
              setPreviewPlace(null);
            }}
            style={{ width: '100%', padding: '14px', background: '#3b82f6', borderRadius: '12px', border: 'none', color: 'white', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            이 장소 선택하기
          </button>
        </div>
      )}
    </div>
  );
};
