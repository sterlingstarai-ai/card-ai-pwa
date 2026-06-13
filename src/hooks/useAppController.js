import { useState, useMemo, useEffect, useRef, useCallback } from 'react';

import { trackEvent, trackError, EventType } from '../lib/analytics';

import { Capacitor } from '@capacitor/core';
import { AppReview } from '@capawesome/capacitor-app-review';

import { CONFIG, MESSAGES, Logger } from '../constants/config';

import { storage } from '../lib/storage';
import { dataService } from '../lib/data-service';
import { postJson, readJsonSafely } from '../lib/api-client';

import {
  haversineDistance,
  hasRealLocation,
  estimateValue,
  findTag,
  expandSearchQuery,
  categoryConfig
} from '../lib/utils';

import { createBenefitsEngine } from '../lib/benefits-engine';

import { useCardData } from './useCardData';
import { useLocation } from './useLocation';
import { usePersistence } from './usePersistence';
import { useSearch as useSearchHook } from './useSearch';
import { findCardCandidatesFromSignals as findCardCandidatesFromSignalsUtil, useOcrState } from './useOcr';

export function useAppController() {
  const {
    dataLoaded: referenceDataLoaded,
    dataError,
    cardsData,
    placesData,
    benefitsData,
    networkBenefits,
    loadData,
  } = useCardData({ dataService, logger: Logger });

  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // 런타임(카카오 live)에서 선택된 장소를 임시로 보관
  // - 지도에서 고른 장소도 혜택 추천에 즉시 반영
  // - 저장소(DB)에는 영구 저장하지 않고 세션용으로만 유지
  const [dynamicPlacesData, setDynamicPlacesData] = useState({});
  const dataLoaded = referenceDataLoaded && userDataLoaded;

  const mergedPlacesData = useMemo(() => {
    return { ...placesData, ...dynamicPlacesData };
  }, [placesData, dynamicPlacesData]);

  // Benefits Engine (인덱싱된 혜택 조회)
  const benefitsEngine = useMemo(() => {
    if (!dataLoaded || Object.keys(benefitsData).length === 0) return null;
    return createBenefitsEngine(benefitsData, cardsData);
  }, [dataLoaded, benefitsData, cardsData]);

  // User state
  const [myCards, setMyCards] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const { searchQuery, setSearchQuery, debouncedQuery } = useSearchHook({ debounceMs: CONFIG.TIMEOUTS.DEBOUNCE });
  const {
    userLocation,
    setUserLocation,
    locationStatus,
    setLocationStatus,
    requestLocation,
  } = useLocation({
    config: CONFIG,
    messages: MESSAGES,
    showToast: (message) => setToastMessage(message),
    trackEvent,
    eventType: EventType,
    logger: Logger,
  });
  const [showPlaceSheet, setShowPlaceSheet] = useState(false);
  const [placeSheetView, setPlaceSheetView] = useState('list');
  const [placeCategoryFilter, setPlaceCategoryFilter] = useState('all');
  const {
    ocrCandidates,
    setOcrCandidates,
    ocrStatus,
    setOcrStatus,
    ocrMessage,
    setOcrMessage,
    showOcrModal,
    setShowOcrModal,
    ocrRunIdRef,
  } = useOcrState();
  const [expandedIssuer, setExpandedIssuer] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [walletSearch, setWalletSearch] = useState(''); // 지갑 검색용
  const [recentPlaceIds, setRecentPlaceIds] = useState(CONFIG.DEFAULTS.RECENT_PLACES);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState([]); // 즐겨찾기 장소
  const [benefitsFilterTag, setBenefitsFilterTag] = useState(null);
  const [pendingScrollCat, setPendingScrollCat] = useState(null);
  const [isOffline, setIsOffline] = useState(false); // 오프라인 감지
  const [selectedBenefit, setSelectedBenefit] = useState(null); // 혜택 상세 모달
  const [isDemo, setIsDemo] = useState(false); // 데모 모드 상태
  const [showReportModal, setShowReportModal] = useState(false); // 제보 모달
  const [reportPrefillCard, setReportPrefillCard] = useState(''); // 제보 모달 카드명 프리필
  const [reportPrefillPlace, setReportPrefillPlace] = useState(''); // 제보 모달 장소명 프리필

  const categorySectionRefs = useRef({});

  const vibrate = useCallback((pattern = [8]) => {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch { /* vibration not supported */ }
  }, []);

  const mainRef = useRef(null);
  const resetMainScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;

    el.scrollTop = 0;

    if (typeof window === 'undefined') return;

    window.requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTop = 0;
      window.requestAnimationFrame(() => {
        if (mainRef.current) mainRef.current.scrollTop = 0;
      });
    });
  }, []);

  // OCR 작업 취소 (레이스 컨디션/모달 닫기/탭 이동 대응)
  const cancelOcrRun = useCallback(() => {
    ocrRunIdRef.current += 1;
  }, [ocrRunIdRef]);

  const showToast = useCallback((msg) => setToastMessage(msg), []);

  const selectPlace = useCallback((placeOrId, options = {}) => {
    if (!placeOrId) return;
    const { closeSheet = true, toast = true, focusHome = false } = options;

    const placeId = typeof placeOrId === 'string' ? placeOrId : placeOrId.id;
    const placeObj = typeof placeOrId === 'string' ? mergedPlacesData[placeId] : placeOrId;

    // live 장소(예: kakao:12345)는 세션 내에서만 캐시
    if (placeObj && !placesData[placeId]) {
      setDynamicPlacesData(prev => (prev[placeId] ? prev : { ...prev, [placeId]: placeObj }));
    }

    setSelectedPlaceId(placeId);
    setRecentPlaceIds(prev => [placeId, ...prev.filter(id => id !== placeId)].slice(0, CONFIG.UI.MAX_RECENT_PLACES));
    if (closeSheet) setShowPlaceSheet(false);
    if (toast) showToast(MESSAGES.PLACE.SELECTED(placeObj?.name || '선택됨'));
    vibrate([8]);
    if (focusHome) setActiveTab('home');

    // Track place selection
    trackEvent(EventType.PLACE_SELECTED, { placeId, placeType: placeObj?.type, placeName: placeObj?.name });
  }, [mergedPlacesData, placesData, showToast, vibrate]);

  // 영구 저장 가능한 장소인지(=정적 데이터셋에 존재). 라이브(kakao:) 장소는
  // dynamicPlacesData에만 있어 새로고침 시 사라지므로 즐겨찾기로 저장할 수 없다.
  const isFavoritablePlace = useCallback((placeId) => !!placesData[placeId], [placesData]);

  // Toggle favorite place
  const toggleFavorite = useCallback((placeId) => {
    setFavoritePlaceIds(prev => {
      const isFav = prev.includes(placeId);
      if (isFav) {
        showToast('즐겨찾기에서 제거됨');
        return prev.filter(id => id !== placeId);
      }
      // 정적 데이터에 없는 장소(라이브 검색 결과 등)는 영구 저장이 안 된다.
      // "추가됨" 토스트 후 persist 단계에서 조용히 누락되는 데이터 손실을 막기 위해 차단.
      if (!placesData[placeId]) {
        showToast('이 장소는 즐겨찾기를 지원하지 않습니다');
        return prev;
      }
      showToast('⭐ 즐겨찾기에 추가됨');
      return [...prev, placeId];
    });
    vibrate([5]);
  }, [showToast, vibrate, placesData]);

  const loadUserState = useCallback(async () => {
    try {
      const savedUserData = await storage.get(CONFIG.DB.KEY);

      if (savedUserData?.myCards?.length) setMyCards(savedUserData.myCards);
      else setMyCards(CONFIG.DEFAULTS.CARDS);

      if (savedUserData?.selectedPlaceId) setSelectedPlaceId(savedUserData.selectedPlaceId);
      else setSelectedPlaceId(null);

      if (Array.isArray(savedUserData?.recentPlaceIds)) {
        setRecentPlaceIds(savedUserData.recentPlaceIds.slice(0, CONFIG.UI.MAX_RECENT_PLACES));
      } else {
        setRecentPlaceIds(CONFIG.DEFAULTS.RECENT_PLACES);
      }

      if (Array.isArray(savedUserData?.favoritePlaceIds)) {
        setFavoritePlaceIds(savedUserData.favoritePlaceIds);
      } else {
        setFavoritePlaceIds([]);
      }
    } catch (err) {
      Logger.error('User state load error:', err);
    } finally {
      setUserDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadUserState();
  }, [loadUserState]);

  useEffect(() => {
    setDynamicPlacesData({});
  }, [placesData]);

  // 오프라인 상태 감지
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Validate persisted ids against current datasets (prevents broken UI after data updates)
  useEffect(() => {
    if (!dataLoaded) return;

    if (selectedPlaceId && !mergedPlacesData[selectedPlaceId]) {
      setSelectedPlaceId(null);
    }

    setRecentPlaceIds(prev => {
      const next = prev.filter(id => !!mergedPlacesData[id]).slice(0, CONFIG.UI.MAX_RECENT_PLACES);
      const same = next.length === prev.length && next.every((v, i) => v === prev[i]);
      return same ? prev : next;
    });
  }, [dataLoaded, mergedPlacesData, selectedPlaceId]);

  const persistUserState = useCallback(async () => {
    const persistSelectedPlaceId = selectedPlaceId && placesData[selectedPlaceId] ? selectedPlaceId : null;
    const persistRecentPlaceIds = Array.isArray(recentPlaceIds)
      ? recentPlaceIds.filter((id) => !!placesData[id]).slice(0, CONFIG.UI.MAX_RECENT_PLACES)
      : [];
    const persistFavoritePlaceIds = Array.isArray(favoritePlaceIds)
      ? favoritePlaceIds.filter((id) => !!placesData[id])
      : [];

    await storage.set(CONFIG.DB.KEY, {
      myCards,
      selectedPlaceId: persistSelectedPlaceId,
      recentPlaceIds: persistRecentPlaceIds,
      favoritePlaceIds: persistFavoritePlaceIds,
    });
  }, [myCards, selectedPlaceId, recentPlaceIds, favoritePlaceIds, placesData]);

  usePersistence({
    enabled: dataLoaded && !isDemo,
    delay: 400,
    save: persistUserState,
  });

  // Each tab behaves like a fresh screen; avoid carrying scroll from the previous tab.
  useEffect(() => {
    resetMainScroll();
  }, [activeTab, resetMainScroll]);

  // When navigating to 혜택 탭 from search, scroll to the target category
  useEffect(() => {
    if (activeTab !== 'benefits' || !pendingScrollCat) return;
    const el = categorySectionRefs.current?.[pendingScrollCat];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPendingScrollCat(null);
  }, [activeTab, pendingScrollCat]);

  // Cancel long-running OCR tasks when leaving the OCR modal
  useEffect(() => {
    if (!showOcrModal) cancelOcrRun();
  }, [showOcrModal, cancelOcrRun]);

  // AppReview는 "콜드런치"가 아니라 사용자가 적극적으로 카드를 3장 이상으로 늘린
  // 긍정적 순간에만 요청한다. (iOS HIG: 앱 실행 직후/맥락 없는 리뷰 요청 지양)
  // loadUserState가 매 실행 myCards를 복원하므로, 복원만으로는 발동하지 않도록
  // 하이드레이션 직후 기준값을 잡고 그 뒤 <3 → >=3 상승 전이에서만 요청한다.
  const reviewPrevCardCountRef = useRef(null);
  useEffect(() => {
    if (!userDataLoaded) return;

    // 하이드레이션 직후: 복원된 카드 수를 기준값으로만 기록(발동 안 함)
    if (reviewPrevCardCountRef.current === null) {
      reviewPrevCardCountRef.current = myCards.length;
      return;
    }

    const prevCount = reviewPrevCardCountRef.current;
    reviewPrevCardCountRef.current = myCards.length;

    if (isDemo) return;
    // <3 → >=3 으로 "증가"한 경우에만 (세션 중 사용자가 직접 추가한 긍정 행동)
    if (!(prevCount < 3 && myCards.length >= 3)) return;

    const hasRequestedReview = localStorage.getItem('cardai_review_requested');
    if (hasRequestedReview) return;

    localStorage.setItem('cardai_review_requested', 'true');
    if (!Capacitor.isNativePlatform()) return;

    void AppReview.requestReview().catch((error) => {
      Logger.warn('AppReview request failed:', error?.message || error);
    });
  }, [myCards.length, isDemo, userDataLoaded]);

  // Computed values
  const cardsByIssuer = useMemo(() => {
    const g = {};
    Object.values(cardsData).forEach(c => {
      if (!g[c.issuer]) g[c.issuer] = [];
      g[c.issuer].push(c);
    });

    const gradeWeight = { BLACK: 0, PURPLE: 1, SIGNATURE: 2, PLATINUM: 3, GOLD: 4, STANDARD: 5 };
    Object.values(g).forEach(arr => arr.sort((a, b) => (gradeWeight[a.grade] ?? 99) - (gradeWeight[b.grade] ?? 99) || a.name.localeCompare(b.name, 'ko')));

    return g;
  }, [cardsData]);

  // 지갑 검색 필터링
  const filteredCardsByIssuer = useMemo(() => {
    const query = walletSearch.toLowerCase().trim();
    if (!query) return cardsByIssuer;
    
    const filtered = {};
    Object.entries(cardsByIssuer).forEach(([issuer, cards]) => {
      const matchedCards = cards.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.issuer.toLowerCase().includes(query) ||
        c.network.toLowerCase().includes(query)
      );
      if (matchedCards.length > 0) filtered[issuer] = matchedCards;
    });
    return filtered;
  }, [cardsByIssuer, walletSearch]);

  const selectedPlace = selectedPlaceId ? mergedPlacesData[selectedPlaceId] : null;
  const myCardObjects = useMemo(() => myCards.map(id => cardsData[id]).filter(Boolean), [myCards, cardsData]);

  // 사용자 카드의 네트워크+등급별 혜택 (NETWORKS_DATA 기반)
  const myNetworkBenefits = useMemo(() => {
    const result = [];
    const seen = new Set();

    myCardObjects.forEach(card => {
      if (!card.network || !card.grade) return;
      const key = `${card.network}|${card.grade}`;
      if (seen.has(key)) return;
      seen.add(key);

      const networkData = networkBenefits[card.network]?.grades?.[card.grade];
      if (networkData && networkData.benefits.length > 0) {
        result.push({
          network: card.network,
          grade: card.grade,
          card,
          benefits: networkData.benefits
        });
      }
    });

    // 네트워크, 등급 순으로 정렬
    return result.sort((a, b) => {
      if (a.network !== b.network) return a.network.localeCompare(b.network);
      return a.grade.localeCompare(b.grade);
    });
  }, [myCardObjects, networkBenefits]);
  
  // "내 주변": 실제 위치가 있는 장소만, 그리고 합리적 반경 내(MAX_NEARBY_RADIUS_M)만.
  // - placeholder(서울시청 sentinel) 장소 제외 → 한 점 뭉침/거리 오염 방지
  // - 반경 밖이면 비워서(서울 외 지역) "267km가 가장 가까움" 같은 오표시를 막는다
  const nearbyPlaces = useMemo(() => {
    if (!userLocation) return [];
    return Object.values(placesData)
      .filter(hasRealLocation)
      .map(p => ({ ...p, distance: haversineDistance(userLocation, p) }))
      .filter(p => p.distance <= CONFIG.UI.MAX_NEARBY_RADIUS_M)
      .sort((a, b) => a.distance - b.distance);
  }, [userLocation, placesData]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return { places: [], benefits: [] };
    const q = debouncedQuery.toLowerCase().trim();
    const expandedTerms = expandSearchQuery(q);
    const tag = findTag(q);

    // Split query by spaces for multi-word matching (e.g., "롯데 호텔")
    const queryParts = q.split(/\s+/).filter(Boolean);

    // Match places with scoring: name match > tag match
    const scoredPlaces = Object.values(placesData).map(p => {
      const nameLower = p.name.toLowerCase();
      let score = 0;

      // Exact query match in name (highest priority)
      if (nameLower.includes(q)) score += 100;

      // All query parts match in name (for space-separated queries)
      if (queryParts.length > 1 && queryParts.every(part => nameLower.includes(part))) score += 80;

      // Any expanded term matches in name
      if (expandedTerms.some(term => nameLower.includes(term))) score += 50;

      // Tag match (lowest priority)
      if (p.tags.includes(tag)) score += 10;

      return { place: p, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.UI.MAX_SEARCH_RESULTS.PLACES)
    .map(item => item.place);

    // Use BenefitsEngine for optimized search
    const benefits = benefitsEngine
      ? benefitsEngine.search(myCards, tag, expandedTerms, CONFIG.UI.MAX_SEARCH_RESULTS.BENEFITS)
      : [];
    return { places: scoredPlaces, benefits };
  }, [debouncedQuery, myCards, placesData, benefitsEngine]);

  const universalBenefits = useMemo(() => {
    return benefitsEngine ? benefitsEngine.getUniversal(myCards) : [];
  }, [myCards, benefitsEngine]);

  const allMyBenefits = useMemo(() => {
    return benefitsEngine ? benefitsEngine.getGroupedByCategory(myCards) : {};
  }, [myCards, benefitsEngine]);

  // Demo mode calculations for onboarding
  const demoData = useMemo(() => {
    if (myCards.length > 0 || !dataLoaded) return null;
    const demoPlace = placesData[CONFIG.DEMO.PLACE];
    if (!demoPlace) return null;
    const tags = demoPlace.tags || [];
    const demoCardSet = new Set(CONFIG.DEMO.CARDS);
    const demoBenefits = Object.entries(benefitsData)
      .filter(([_, b]) => demoCardSet.has(b.cardId) && b.placeTags?.some(t => tags.includes(t)))
      .map(([id, b]) => ({ id, ...b, card: cardsData[b.cardId], estimatedValue: estimateValue(b) }))
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 5);
    const demoCards = CONFIG.DEMO.CARDS.map(id => cardsData[id]).filter(Boolean);
    const totalValue = demoBenefits.reduce((sum, b) => sum + b.estimatedValue, 0);
    return { place: demoPlace, benefits: demoBenefits, cards: demoCards, totalValue };
  }, [myCards.length, dataLoaded, placesData, benefitsData, cardsData]);

  const availableBenefits = useMemo(() => {
    if (!selectedPlace || myCards.length === 0) return { cardBenefits: [], networkBenefits: [] };
    const tags = selectedPlace.tags || [];

    // Use BenefitsEngine for card benefits
    const cardBenefits = benefitsEngine
      ? benefitsEngine.getByPlace(myCards, tags)
      : [];

    // Network benefits (VISA, Mastercard 등)
    const netMap = new Map();
    myCardObjects.forEach(card => {
      const net = networkBenefits[card.network]?.grades[card.grade];
      if (!net) return;
      net.benefits.forEach(b => {
        if (b.tags?.some(t => tags.includes(t))) {
          const k = `${card.network}|${card.grade}|${b.title}`;
          if (!netMap.has(k)) netMap.set(k, { ...b, card, network: card.network, grade: card.grade, estimatedValue: b.value || 10000 });
        }
      });
    });
    return { cardBenefits, networkBenefits: Array.from(netMap.values()) };
  }, [selectedPlace, myCards, myCardObjects, benefitsEngine, networkBenefits]);

  // 카드 랭킹 계산 (BenefitsEngine 사용)
  const cardRanking = useMemo(() => {
    if (!selectedPlace || !benefitsEngine) return [];
    const tags = selectedPlace.tags || [];
    return benefitsEngine.calculateRanking(myCards, tags, networkBenefits, myCardObjects, categoryConfig);
  }, [selectedPlace, myCards, benefitsEngine, networkBenefits, myCardObjects]);

  const smartBest = useMemo(() => {
    if (cardRanking.length === 0) return null;
    const best = cardRanking[0], second = cardRanking[1];
    // Build explanation 3 lines
    const summaryText = best.benefitSummary.slice(0, 3).map(s => s.title).join(' + ');
    const caveatText = best.caveats.length > 0 ? best.caveats.slice(0, 2).join(' / ') : '전월실적 반영';
    return {
      ...best,
      diff: second ? best.totalValue - second.totalValue : 0,
      explanation: {
        summary: summaryText || '매칭된 혜택 없음',
        estimatedValue: best.totalValue,
        caveats: caveatText
      }
    };
  }, [cardRanking]);

  // Track benefit count when place changes
  useEffect(() => {
    if (selectedPlace && availableBenefits) {
      const totalBenefits = availableBenefits.cardBenefits.length + availableBenefits.networkBenefits.length;
      trackEvent(EventType.PLACE_BENEFIT_COUNT, {
        placeId: selectedPlace.id,
        benefitCount: totalBenefits,
        cardBenefitCount: availableBenefits.cardBenefits.length,
        networkBenefitCount: availableBenefits.networkBenefits.length
      });
    }
  }, [selectedPlace, availableBenefits]);

  // Handlers
  const resetHomeContext = () => {
    cancelOcrRun();
    setSelectedPlaceId(null);
    setSearchQuery('');
    setShowPlaceSheet(false);
    setPlaceSheetView('list');
    setShowOcrModal(false);
    setOcrStatus('idle');
    setOcrMessage('');
    setOcrCandidates([]);
    setExpandedIssuer(null);
    setWalletSearch('');
    setBenefitsFilterTag(null);
    setPendingScrollCat(null);
  };

  const handleHomeClick = () => {
    if (activeTab === 'home') {
      resetHomeContext();
      resetMainScroll();
    } else {
      setActiveTab('home');
      resetMainScroll();
    }
  };

  const handleNearby = async () => {
    // idle이면 위치 요청 시도
    // denied여도 다시 시도할 수 있게 함 (사용자가 설정에서 변경했을 수 있음)
    if (locationStatus === 'idle' || locationStatus === 'denied') {
      await requestLocation();
    }
    setShowPlaceSheet(true);
  };

  const pickNearestPlace = () => {
    if (nearbyPlaces.length > 0) {
      selectPlace(nearbyPlaces[0].id);
    }
  };

  // OCR 이미지를 JPEG로 변환 (iOS HEIC 호환성 개선)
  const compressImage = async (file, quality = 0.7, maxSize = 1600) => {
    Logger.log('[OCR] compressImage start', { fileType: file.type, fileSize: file.size });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        Logger.log('[OCR] FileReader loaded', { length: reader.result?.length });

        const img = new Image();

        img.onload = () => {
          Logger.log('[OCR] Image loaded', { width: img.width, height: img.height });

          try {
            let { width, height } = img;

            // 최대 크기 제한
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG로 변환
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  Logger.log('[OCR] Blob created', { size: blob.size });
                  resolve(blob);
                } else {
                  console.error('[OCR] toBlob returned null');
                  reject(new Error('이미지 변환 실패'));
                }
              },
              'image/jpeg',
              quality
            );
          } catch (err) {
            console.error('[OCR] Canvas error:', err);
            reject(err);
          }
        };

        img.onerror = (e) => {
          console.error('[OCR] Image load error:', e);
          reject(new Error('이미지를 불러올 수 없습니다'));
        };

        img.src = reader.result;
      };

      reader.onerror = (e) => {
        console.error('[OCR] FileReader error:', e);
        reject(new Error('파일을 읽을 수 없습니다'));
      };

      reader.readAsDataURL(file);
    });
  };

  // 카드 식별(구글렌즈 유사) 신호 정규화/매칭
  // - OCR 텍스트가 빈약하거나(또는 0) 디자인 카드처럼 글자가 거의 없을 때 WEB_DETECTION 결과로 보정
  // - 데이터에 없는 신규 카드는 "인식"은 가능하지만, 혜택 데이터는 별도 수집이 필요(추측 금지)
  const findCardCandidatesFromSignals = ({ ocrText = '', bestGuessLabels = [], webEntities = [], logos = [] }) => {
    return findCardCandidatesFromSignalsUtil({
      cardsData,
      ocrText,
      bestGuessLabels,
      webEntities,
      logos,
      threshold: 4,
      maxCandidates: CONFIG.UI.MAX_OCR_CANDIDATES,
    });
  };

  const fetchVisionIdentify = async ({ base64Image, timeoutMs = 20000 }) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await postJson(
        '/api/identify',
        { image: base64Image },
        { signal: controller.signal }
      );

      if (!res.ok) {
        const err = await readJsonSafely(res);
        // 상태 코드별 에러 메시지 분류
        const status = res.status;
        let errorMsg = err?.error || 'Vision 서비스 오류';
        if (status === 429) errorMsg = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';
        else if (status === 403) errorMsg = 'API 키 오류 또는 할당량 초과';
        else if (status === 400) errorMsg = '이미지 형식이 올바르지 않습니다';
        else if (status >= 500) errorMsg = '서버 오류가 발생했습니다';
        throw new Error(errorMsg);
      }
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  };

  // 2단계 OCR 처리 공유 로직 (향후 리팩토링용)
  // 1차: OCR 텍스트 기반 매칭 → 2차: Vision WEB_DETECTION 폴백
  const _processTwoStepOcr = async ({ base64Image, runId, safeSet, recognizedText, logos = [] }) => {
    // 1차: OCR 텍스트 기반 후보 추출
    const candidatesFromOcr = findCardCandidatesFromSignals({ ocrText: recognizedText, logos });

    if (candidatesFromOcr.length > 0) {
      return { candidates: candidatesFromOcr, source: 'ocr' };
    }

    // 2차: 구글렌즈 유사 (Vision WEB_DETECTION)로 이미지 기반 힌트 확보
    safeSet(() => setOcrMessage('이미지 검색 중...'));

    let vision = null;
    try {
      vision = await fetchVisionIdentify({ base64Image, timeoutMs: 20000 });
    } catch (visionErr) {
      Logger.warn('Vision identify failed:', visionErr);
      vision = null;
    }

    // 취소 확인
    if (ocrRunIdRef.current !== runId) return null;

    const candidatesFromVision = findCardCandidatesFromSignals({
      ocrText: recognizedText,
      bestGuessLabels: vision?.web?.bestGuessLabels || [],
      webEntities: vision?.web?.webEntities || [],
      logos: [...logos, ...(vision?.logos || [])],
    });

    if (candidatesFromVision.length > 0) {
      return { candidates: candidatesFromVision, source: 'vision_web_detection' };
    }

    return { candidates: [], source: 'none', textLength: recognizedText.length };
  };

  const handleOCR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // 새 작업 시작 - runId 증가
    const runId = ++ocrRunIdRef.current;
    const safeSet = (fn) => { if (ocrRunIdRef.current === runId) fn(); };

    safeSet(() => setOcrStatus('loading'));
    trackEvent(EventType.OCR_START);

    // 오프라인 체크
    if (!navigator.onLine) {
      showToast('📵 오프라인 상태입니다');
      safeSet(() => setOcrStatus('network_error'));
      trackEvent(EventType.OCR_FAIL, { reason: 'offline' });
      return;
    }

    try {
      // 이미지를 base64로 변환 (안전한 검증)
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const dataUrl = reader.result;
            if (!dataUrl || typeof dataUrl !== 'string') {
              reject(new Error('이미지를 읽을 수 없습니다'));
              return;
            }
            const commaIndex = dataUrl.indexOf(',');
            if (commaIndex === -1) {
              reject(new Error('이미지 형식이 올바르지 않습니다'));
              return;
            }
            const base64 = dataUrl.substring(commaIndex + 1);
            // Base64 최소 길이 체크만 (정규식 전체 검증은 iOS에서 크래시 유발)
            if (!base64 || base64.length < 100) {
              reject(new Error('이미지 데이터가 너무 짧습니다'));
              return;
            }
            resolve(base64);
          } catch {
            reject(new Error('이미지 처리 중 오류가 발생했습니다'));
          }
        };
        reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다'));
        reader.readAsDataURL(f);
      });

      safeSet(() => { setOcrStatus('loading'); setOcrMessage('이미지 처리중...'); });

      // 이미지 압축 (대용량 이미지 최적화)
      const compressedFile = await compressImage(file);
      const base64Image = await toBase64(compressedFile);

      // 취소 확인
      if (ocrRunIdRef.current !== runId) return;

      safeSet(() => setOcrMessage('카드 분석중...'));

      // AbortController for timeout/cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUTS.OCR);

      try {
        // Call serverless OCR proxy (keeps API key secure)
        // Capacitor 앱에서는 절대 URL 필요 (capacitor:// 프로토콜은 Vercel API 라우팅 안됨)
        const response = await postJson(
          '/api/ocr',
          { image: base64Image },
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await readJsonSafely(response);
          throw new Error(errorData.error || `OCR 서비스 오류: ${response.status}`);
        }

        const data = await response.json();

        // 취소 확인
        if (ocrRunIdRef.current !== runId) return;

        // 텍스트 추출
        const recognizedText = data.text || '';

        // 보안: 텍스트 내용 대신 메타데이터만 로깅
        Logger.log('OCR result:', { textLength: recognizedText.length, hasText: !!recognizedText });

        const twoStepResult = await _processTwoStepOcr({
          base64Image,
          runId,
          safeSet,
          recognizedText,
          logos: data.logos || [],
        });
        if (!twoStepResult) return;

        safeSet(() => {
          if (twoStepResult.candidates.length > 0) {
            setOcrCandidates(twoStepResult.candidates);
            setOcrStatus('confirm');
            showToast(`✨ ${twoStepResult.candidates.length}개 카드 인식됨`);
            trackEvent(EventType.OCR_SUCCESS, {
              candidateCount: twoStepResult.candidates.length,
              source: twoStepResult.source,
            });
          } else {
            setOcrStatus('notfound');
            showToast('카드 정보를 찾지 못했습니다');
            trackEvent(EventType.OCR_FAIL, {
              reason: 'no_match',
              textLength: recognizedText.length,
            });
          }
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (ocrRunIdRef.current !== runId) return;

        // AbortController timeout
        if (fetchErr.name === 'AbortError') {
          showToast('⏱️ OCR 시간 초과 (30초)');
          safeSet(() => setOcrStatus('timeout'));
          trackEvent(EventType.OCR_FAIL, { reason: 'timeout' });
          return;
        }
        throw fetchErr; // Re-throw for outer catch
      }
    } catch (err) {
      if (ocrRunIdRef.current !== runId) return;

      Logger.error('OCR Error:', err);
      const errMsg = err?.message || String(err);

      if (!navigator.onLine) {
        showToast('📵 오프라인 상태입니다');
        safeSet(() => setOcrStatus('network_error'));
        trackEvent(EventType.OCR_FAIL, { reason: 'network_error' });
      } else {
        // 사용자 친화적 에러 메시지 변환
        let userMessage = '카드 인식에 실패했습니다';
        if (errMsg.includes('pattern') || errMsg.includes('인코딩')) {
          userMessage = '이미지를 처리할 수 없습니다. 다시 촬영해주세요';
        } else if (errMsg.includes('quota') || errMsg.includes('403')) {
          userMessage = '서비스 이용량 초과. 잠시 후 다시 시도해주세요';
        } else if (errMsg.includes('형식') || errMsg.includes('읽을 수 없')) {
          userMessage = errMsg;
        }
        showToast(`⚠️ ${userMessage}`);
        safeSet(() => setOcrStatus('notfound'));
        trackEvent(EventType.OCR_FAIL, { reason: 'error', message: errMsg.substring(0, 100) });
        trackError(err, { context: 'OCR' });
      }
    }
  };

  // Capacitor Camera에서 base64를 직접 받아서 OCR 처리 (iOS용)
  const handleOCRBase64 = async (base64Image) => {
    const runId = ++ocrRunIdRef.current;
    const safeSet = (fn) => { if (ocrRunIdRef.current === runId) fn(); };

    safeSet(() => setOcrStatus('loading'));
    safeSet(() => setOcrMessage('카드 분석중...'));
    trackEvent(EventType.OCR_START);

    if (!navigator.onLine) {
      showToast('📵 오프라인 상태입니다');
      safeSet(() => setOcrStatus('network_error'));
      trackEvent(EventType.OCR_FAIL, { reason: 'offline' });
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUTS.OCR);

      Logger.log('[OCR] Sending base64 OCR request', { length: base64Image.length });
      const response = await postJson(
        '/api/ocr',
        { image: base64Image },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      Logger.log('[OCR] Base64 OCR response status', { status: response.status });

      // Safari/WKWebView에서 response.json() 파싱 오류 방지
      const responseText = await response.text();
      Logger.log('[OCR] Base64 OCR response length', { length: responseText.length });

      if (!response.ok) {
        let errorData = {};
        try { errorData = JSON.parse(responseText); } catch { /* JSON parse error ignored */ }
        console.error('[OCR] Error response:', errorData);
        throw new Error(errorData.error || `OCR 서비스 오류: ${response.status}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[OCR] JSON parse error:', parseErr.message);
        console.error('[OCR] Raw response:', responseText);
        throw new Error('응답 파싱 실패');
      }
      if (ocrRunIdRef.current !== runId) return;

      const recognizedText = data.text || '';
      Logger.log('OCR result:', { textLength: recognizedText.length, hasText: !!recognizedText });
      Logger.log('[OCR] Logos detected', { count: (data.logos || []).length });

      const twoStepResult = await _processTwoStepOcr({
        base64Image,
        runId,
        safeSet,
        recognizedText,
        logos: data.logos || [],
      });
      if (!twoStepResult) return;

      safeSet(() => {
        if (twoStepResult.candidates.length > 0) {
          setOcrCandidates(twoStepResult.candidates);
          setOcrStatus('confirm');
          showToast(`✨ ${twoStepResult.candidates.length}개 카드 인식됨`);
          trackEvent(EventType.OCR_SUCCESS, {
            candidateCount: twoStepResult.candidates.length,
            source: twoStepResult.source,
          });
        } else {
          setOcrStatus('notfound');
          showToast('카드 정보를 찾지 못했습니다');
          trackEvent(EventType.OCR_FAIL, {
            reason: 'no_match',
            textLength: recognizedText.length,
          });
        }
      });
    } catch (err) {
      if (ocrRunIdRef.current !== runId) return;

      Logger.error('OCR Error:', err);
      console.error('[OCR] Error name:', err.name);
      console.error('[OCR] Error message:', err.message);
      console.error('[OCR] Error stack:', err.stack);
      if (err.name === 'AbortError') {
        showToast('⏱️ OCR 시간 초과');
        safeSet(() => setOcrStatus('timeout'));
      } else {
        showToast('카드 인식에 실패했습니다');
        safeSet(() => setOcrStatus('notfound'));
      }
      trackEvent(EventType.OCR_FAIL, { reason: 'error', message: err.message });
    }
  };

  const confirmCard = (card) => {
    if (!myCards.includes(card.id)) {
      setMyCards(prev => (prev.includes(card.id) ? prev : [...prev, card.id]));
      showToast(MESSAGES.CARD.ADDED(card.name));
      trackEvent(EventType.WALLET_ADD, { cardId: card.id, cardName: card.name, source: 'ocr' });
    } else {
      showToast(MESSAGES.CARD.ALREADY_EXISTS);
    }
    setShowOcrModal(false);
    setOcrStatus('idle');
    setOcrMessage('');
    setOcrCandidates([]);
  };

  // Track benefit open
  const openBenefitDetail = (benefit) => {
    vibrate();
    setSelectedBenefit(benefit);
    trackEvent(EventType.BENEFIT_OPEN, { benefitId: benefit.id, category: benefit.category, cardId: benefit.cardId });
  };

  const handleReset = async () => {
    // 초기 상태로 복원 (데이터 저장까지 함께)
    cancelOcrRun(); // OCR 진행 중이면 취소
    setMyCards(CONFIG.DEFAULTS.CARDS);
    setSelectedPlaceId(null);
    setRecentPlaceIds(CONFIG.DEFAULTS.RECENT_PLACES);
    setUserLocation(null);
    setLocationStatus('idle');
    setShowPlaceSheet(false);
    setPlaceSheetView('list');
    setShowOcrModal(false);
    setOcrCandidates([]);
    setOcrStatus('idle');
    setOcrMessage('');
    setExpandedIssuer(null);
    setSearchQuery('');
    setWalletSearch(''); // 지갑 검색어도 초기화
    setBenefitsFilterTag(null);
    setPendingScrollCat(null);
    setActiveTab('home');

    try {
      await storage.set(CONFIG.DB.KEY, { myCards: CONFIG.DEFAULTS.CARDS, selectedPlaceId: null, recentPlaceIds: CONFIG.DEFAULTS.RECENT_PLACES, favoritePlaceIds: [] });
    } catch { /* storage error ignored on reset */ }

    showToast(MESSAGES.SYSTEM.RESET);
  };

  const handleSearchBenefitSelect = (benefit) => {
    const tag = benefit?.category || null;
    setBenefitsFilterTag(tag);
    if (tag) setPendingScrollCat(tag);
    setActiveTab('benefits');
    resetMainScroll();
    setSearchQuery('');
    vibrate([6]);
  };

  const clearBenefitsFilter = () => {
    setBenefitsFilterTag(null);
  };

  // Demo Mode Handlers
  const startDemo = useCallback(() => {
    // 데모 모드 시작 - 데모 카드와 장소 설정 (저장 안 함)
    setIsDemo(true);
    setMyCards(CONFIG.DEMO.CARDS);
    setSelectedPlaceId(CONFIG.DEMO.PLACE);
    showToast('🎮 데모 모드 시작');
    trackEvent(EventType.DEMO_START);
  }, [showToast]);

  useEffect(() => {
    if (!dataLoaded) return;
    const hasSeenOnboarding = localStorage.getItem('cardai_has_seen_onboarding');
    if (!hasSeenOnboarding && myCards.length === 0 && !isDemo) {
      startDemo();
      localStorage.setItem('cardai_has_seen_onboarding', 'true');
    }
  }, [dataLoaded, myCards.length, isDemo, startDemo]);

  const exitDemo = useCallback(() => {
    const keepDemoCards = window.confirm('데모에서 본 카드를 등록할까요?\\n확인: 카드 유지 / 취소: 카드 초기화');
    setIsDemo(false);
    if (!keepDemoCards) {
      setMyCards([]);
      setSelectedPlaceId(null);
      showToast('데모 모드 종료');
    } else {
      setSelectedPlaceId(null);
      showToast('데모 카드가 지갑에 등록되었습니다');
    }
    trackEvent(EventType.DEMO_END, { keepDemoCards });
  }, [showToast]);

  // 제보 모달 열기
  const openReportModal = useCallback((cardName = '', placeName = '') => {
    setReportPrefillCard(cardName);
    setReportPrefillPlace(placeName);
    setShowReportModal(true);
  }, []);

  const handleRetry = () => {
    dataService.clearCache();
    void loadData();
    void loadUserState();
  };

  const filteredUniversalBenefits = benefitsFilterTag
    ? universalBenefits.filter((b) => b.category === benefitsFilterTag)
    : universalBenefits;
  const filteredAllMyBenefitsEntries = benefitsFilterTag
    ? Object.entries(allMyBenefits).filter(([cat]) => cat === benefitsFilterTag)
    : Object.entries(allMyBenefits);

  return {
    activeTab,
    setActiveTab,
    dataError,
    dataLoaded,
    cardsData,
    mergedPlacesData,
    benefitsData,
    myCards,
    setMyCards,
    selectedPlaceId,
    setSelectedPlaceId,
    selectedPlace,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    userLocation,
    setUserLocation,
    locationStatus,
    setLocationStatus,
    showPlaceSheet,
    setShowPlaceSheet,
    placeSheetView,
    setPlaceSheetView,
    placeCategoryFilter,
    setPlaceCategoryFilter,
    showOcrModal,
    setShowOcrModal,
    ocrCandidates,
    setOcrCandidates,
    ocrStatus,
    setOcrStatus,
    ocrMessage,
    setOcrMessage,
    expandedIssuer,
    setExpandedIssuer,
    toastMessage,
    setToastMessage,
    walletSearch,
    setWalletSearch,
    recentPlaceIds,
    favoritePlaceIds,
    benefitsFilterTag,
    isOffline,
    selectedBenefit,
    setSelectedBenefit,
    isDemo,
    showReportModal,
    setShowReportModal,
    reportPrefillCard,
    reportPrefillPlace,
    mainRef,
    resetMainScroll,
    categorySectionRefs,
    smartBest,
    cardRanking,
    availableBenefits,
    searchResults,
    demoData,
    myNetworkBenefits,
    filteredCardsByIssuer,
    filteredUniversalBenefits,
    filteredAllMyBenefitsEntries,
    nearbyPlaces,
    handleHomeClick,
    requestLocation,
    handleNearby,
    selectPlace,
    toggleFavorite,
    isFavoritablePlace,
    pickNearestPlace,
    handleOCR,
    handleOCRBase64,
    confirmCard,
    cancelOcrRun,
    openBenefitDetail,
    handleReset,
    handleSearchBenefitSelect,
    clearBenefitsFilter,
    showToast,
    startDemo,
    exitDemo,
    openReportModal,
    handleRetry,
  };
}
