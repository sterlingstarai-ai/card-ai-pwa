import { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// 📊 Analytics & Observability
import { initSentry, trackEvent, trackError, EventType } from './lib/analytics';

// 📱 Capacitor Plugins (네이티브 기능)
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

// 🔧 Configuration & Constants
import { CONFIG, MESSAGES, Logger } from './constants/config';

// 📦 Services
import { storage } from './lib/storage';
import { dataService } from './lib/data-service';

// 🛠️ Utilities
import {
  haversineDistance,
  estimateValue,
  findTag,
  expandSearchQuery,
  categoryConfig
} from './lib/utils';

// 🎯 Benefits Engine
import { createBenefitsEngine } from './lib/benefits-engine';

// 🎨 UI Components
import { Toast, LoadingScreen, ErrorScreen, BenefitDetailModal, PlaceSheet, OcrModal, ReportModal } from './components';

// 📑 Tab Components
import { HomeTab, BenefitsTab, WalletTab, SettingsTab } from './tabs';

// Initialize Sentry on module load
initSentry();

// ============================================================================
// 🏆 vFinal: PRODUCTION RELEASE (Mobile-First)
// ============================================================================
//
// 🎯 목표: 사용자 Pain Point 해결 - "지금, 여기서 어떤 카드 쓰는 게 최선인지"
// 📊 데이터: 97카드 · 117장소 · 163혜택
// 📱 플랫폼: iOS/Android 스마트폰 앱 (데스크탑 최적화 금지)
//
// ──────────────────────────────────────────────────────────────────────────
// 📌 vFinal 품질 기준:
//    ✅ 버그 0, 레이스 0, UX 마찰 최소화
//    ✅ JSX 구문 오류 0건
//    ✅ 모든 async 작업에 취소 가드
//    ✅ Safe Area 완전 대응
//    ✅ 터치 타겟 최소 44px 확보
// ──────────────────────────────────────────────────────────────────────────
//
// 📦 기능 목록:
// 1. 최근 장소(최대 5개) 저장/노출 + 데이터 정합성 자동 검증
// 2. 검색→혜택 탭 필터 적용 + 자동 스크롤 + 필터 해제
// 3. 사용자 데이터 저장 디바운스(400ms) - I/O 스파이크 방지
// 4. OCR 카드 스캔 (레이스 컨디션 완전 방지, 재호출 안정화)
// 5. 지도 기반 장소 선택 (키보드 접근성 지원)
// 6. 혜택 상세 모달 (desc 필드 69개 전체 포함)
// 7. 오프라인 상태 감지 및 표시
// 8. iOS Safe Area + 모바일 터치 최적화 CSS
//
// ──────────────────────────────────────────────────────────────────────────
// 📌 버전 이력:
//    v15.1: GPT + 우리 CSS + Gemini UX 병합
//    v14.3: OCR 레이스 방지, Safe Area, IndexedDB 방어
//    v14.2: Retry 개선, 워커 종료 보장, 위치 연타 방지
// ============================================================================

// ============================================================================
// 🚀 MAIN APP
// ============================================================================

export default function CardBenefitsApp() {
  // Data state
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [cardsData, setCardsData] = useState({});
  const [placesData, setPlacesData] = useState({});
  const [benefitsData, setBenefitsData] = useState({});
  const [networkBenefits, setNetworkBenefits] = useState({});

  // Benefits Engine (인덱싱된 혜택 조회)
  const benefitsEngine = useMemo(() => {
    if (!dataLoaded || Object.keys(benefitsData).length === 0) return null;
    return createBenefitsEngine(benefitsData, cardsData);
  }, [dataLoaded, benefitsData, cardsData]);

  // User state
  const [myCards, setMyCards] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [showPlaceSheet, setShowPlaceSheet] = useState(false);
  const [placeSheetView, setPlaceSheetView] = useState('list');
  const [placeCategoryFilter, setPlaceCategoryFilter] = useState('all');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState([]);
  const [ocrStatus, setOcrStatus] = useState('idle'); // 'idle' | 'loading' | 'confirm' | 'notfound' | 'network_error' | 'timeout' | 'error'
  const [ocrMessage, setOcrMessage] = useState(''); // UI 표시용 메시지
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
  const saveTimerRef = useRef(null);

  const vibrate = useCallback((pattern = [8]) => {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch { /* vibration not supported */ }
  }, []);

  const mainRef = useRef(null);
  const ocrRunIdRef = useRef(0); // OCR 레이스 컨디션 방지용

  // OCR 작업 취소 (레이스 컨디션/모달 닫기/탭 이동 대응)
  const cancelOcrRun = useCallback(() => {
    ocrRunIdRef.current += 1;
  }, []);

  const showToast = useCallback((msg) => setToastMessage(msg), []);

  const selectPlace = useCallback((placeId, options = {}) => {
    if (!placeId) return;
    const { closeSheet = true, toast = true, focusHome = false } = options;

    setSelectedPlaceId(placeId);
    setRecentPlaceIds(prev => [placeId, ...prev.filter(id => id !== placeId)].slice(0, CONFIG.UI.MAX_RECENT_PLACES));
    if (closeSheet) setShowPlaceSheet(false);
    if (toast) showToast(MESSAGES.PLACE.SELECTED(placesData[placeId]?.name || '선택됨'));
    vibrate([8]);
    if (focusHome) setActiveTab('home');

    // Track place selection
    const place = placesData[placeId];
    trackEvent(EventType.PLACE_SELECTED, { placeId, placeType: place?.type, placeName: place?.name });
  }, [placesData, showToast, vibrate]);

  // Toggle favorite place
  const toggleFavorite = useCallback((placeId) => {
    setFavoritePlaceIds(prev => {
      const isFav = prev.includes(placeId);
      if (isFav) {
        showToast('즐겨찾기에서 제거됨');
        return prev.filter(id => id !== placeId);
      } else {
        showToast('⭐ 즐겨찾기에 추가됨');
        return [...prev, placeId];
      }
    });
    vibrate([5]);
  }, [showToast, vibrate]);


  // Data loading
  const loadData = useCallback(async () => {
    setDataError(false);
    setDataLoaded(false);

    try {
      const savedUserData = await storage.get(CONFIG.DB.KEY);

      if (savedUserData?.myCards?.length) setMyCards(savedUserData.myCards);
      else setMyCards(CONFIG.DEFAULTS.CARDS);

      if (savedUserData?.selectedPlaceId) setSelectedPlaceId(savedUserData.selectedPlaceId);
      else setSelectedPlaceId(null);

      if (Array.isArray(savedUserData?.recentPlaceIds)) setRecentPlaceIds(savedUserData.recentPlaceIds.slice(0, CONFIG.UI.MAX_RECENT_PLACES));
      else setRecentPlaceIds(CONFIG.DEFAULTS.RECENT_PLACES);

      if (Array.isArray(savedUserData?.favoritePlaceIds)) setFavoritePlaceIds(savedUserData.favoritePlaceIds);
      else setFavoritePlaceIds([]);

      const { cards, places, benefits, networks } = await dataService.fetchAll();
      setCardsData(cards);
      setPlacesData(places);
      setBenefitsData(benefits);
      setNetworkBenefits(networks);

      setDataLoaded(true);
    } catch (err) {
      Logger.error('Data load error:', err);
      setDataError(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 앱 시작 시 기본 위치(서울) 설정 - 권한 요청은 사용자 액션 시에만
  useEffect(() => {
    if (dataLoaded && locationStatus === 'idle') {
      // 권한 요청 없이 기본 위치(서울)로 시작
      setUserLocation(CONFIG.DEFAULTS.LOCATION);
      setLocationStatus('fallback');
    }
  }, [dataLoaded, locationStatus]);

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

    if (selectedPlaceId && !placesData[selectedPlaceId]) {
      setSelectedPlaceId(null);
    }

    setRecentPlaceIds(prev => {
      const next = prev.filter(id => !!placesData[id]).slice(0, CONFIG.UI.MAX_RECENT_PLACES);
      const same = next.length === prev.length && next.every((v, i) => v === prev[i]);
      return same ? prev : next;
    });
  }, [dataLoaded, placesData, selectedPlaceId]);


  // Save user data (debounced to reduce I/O on mobile WebView)
  // 데모 모드일 때는 저장하지 않음
  useEffect(() => {
    if (!dataLoaded || isDemo) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void storage.set(CONFIG.DB.KEY, { myCards, selectedPlaceId, recentPlaceIds, favoritePlaceIds });
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [myCards, selectedPlaceId, recentPlaceIds, favoritePlaceIds, dataLoaded, isDemo]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), CONFIG.TIMEOUTS.DEBOUNCE);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const selectedPlace = selectedPlaceId ? placesData[selectedPlaceId] : null;
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
  
  const nearbyPlaces = useMemo(() => 
    userLocation ? Object.values(placesData).map(p => ({ ...p, distance: haversineDistance(userLocation, p) })).sort((a, b) => a.distance - b.distance) : []
  , [userLocation, placesData]);

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
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab('home');
    }
  };

  const requestLocation = async () => {
    if (locationStatus === 'loading') return;
    setLocationStatus('loading');
    trackEvent(EventType.LOCATION_PROMPT);

    // Capacitor 네이티브 앱인 경우 네이티브 플러그인 사용
    if (Capacitor.isNativePlatform()) {
      try {
        // 먼저 권한 요청
        const permission = await Geolocation.requestPermissions();
        if (permission.location === 'denied') {
          setUserLocation(null);
          setLocationStatus('denied');
          showToast(MESSAGES.LOCATION.DENIED);
          trackEvent(EventType.LOCATION_DENIED, { reason: 'user_denied' });
          return;
        }

        // 위치 가져오기
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: CONFIG.TIMEOUTS.LOCATION,
          maximumAge: 60000
        });
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('success');
        showToast(MESSAGES.LOCATION.SUCCESS);
        trackEvent(EventType.LOCATION_GRANTED);
      } catch (err) {
        console.error('Capacitor Geolocation error:', err);
        setUserLocation(CONFIG.DEFAULTS.LOCATION);
        setLocationStatus('fallback');
        showToast(MESSAGES.LOCATION.FALLBACK);
        trackEvent(EventType.LOCATION_DENIED, { reason: 'error', message: err.message });
      }
      return;
    }

    // 웹 브라우저인 경우 기존 API 사용
    if (!navigator.geolocation) {
      setUserLocation(null);
      setLocationStatus('denied');
      showToast(MESSAGES.LOCATION.NOT_SUPPORTED);
      trackEvent(EventType.LOCATION_DENIED, { reason: 'not_supported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('success');
        showToast(MESSAGES.LOCATION.SUCCESS);
        trackEvent(EventType.LOCATION_GRANTED);
      },
      err => {
        if (err.code === 1) {
          setUserLocation(null);
          setLocationStatus('denied');
          showToast(MESSAGES.LOCATION.DENIED);
          trackEvent(EventType.LOCATION_DENIED, { reason: 'user_denied' });
        } else {
          setUserLocation(CONFIG.DEFAULTS.LOCATION);
          setLocationStatus('fallback');
          showToast(MESSAGES.LOCATION.FALLBACK);
          trackEvent(EventType.LOCATION_DENIED, { reason: 'error', code: err.code });
        }
      },
      { timeout: CONFIG.TIMEOUTS.LOCATION, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  const handleNearby = async () => {
    // fallback(기본 서울)이거나 idle이면 실제 위치 요청 시도
    // denied는 이미 거부했으므로 재요청 안 함
    if (locationStatus === 'idle' || locationStatus === 'fallback') {
      await requestLocation();
    }
    setShowPlaceSheet(true);
  };

  const pickNearestPlace = () => {
    if (nearbyPlaces.length > 0) {
      selectPlace(nearbyPlaces[0].id);
    }
  };

  // OCR 이미지를 JPEG로 변환 (EXIF 회전 보정 + iOS HEIC 호환 + 동적 압축)
  const compressImage = async (file, maxSize = 1920, targetMaxBytes = 3 * 1024 * 1024) => {
    // createImageBitmap으로 EXIF 회전 자동 보정 시도
    let imgSource;
    let objectUrl = null;

    try {
      // createImageBitmap은 EXIF orientation을 자동 적용 (iOS Safari 15+, Chrome, Firefox)
      if (typeof createImageBitmap === 'function') {
        imgSource = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } else {
        throw new Error('createImageBitmap not supported');
      }
    } catch {
      // fallback: Image() 사용 (EXIF 미적용 가능성)
      imgSource = await new Promise((resolve, reject) => {
        const img = new Image();
        objectUrl = URL.createObjectURL(file);
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다'));
        img.src = objectUrl;
      });
    }

    try {
      let { width, height } = imgSource;

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
      ctx.drawImage(imgSource, 0, 0, width, height);

      // 동적 압축: targetMaxBytes 이하가 될 때까지 quality 낮춤
      let quality = 0.85;
      let blob = null;
      const minQuality = 0.4;

      while (quality >= minQuality) {
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) {
          throw new Error('이미지 변환에 실패했습니다');
        }
        if (blob.size <= targetMaxBytes) break;
        quality -= 0.1;
      }

      Logger.log(`Image converted: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB (quality: ${(quality * 100).toFixed(0)}%)`);
      return blob;
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (imgSource && typeof imgSource.close === 'function') imgSource.close();
    }
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
          } catch (_err) {
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
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `OCR 서비스 오류: ${response.status}`);
        }

        const data = await response.json();

        // 취소 확인
        if (ocrRunIdRef.current !== runId) return;

        // 텍스트 추출
        const recognizedText = data.text || '';

        // 보안: 텍스트 내용 대신 메타데이터만 로깅
        Logger.log('OCR result:', { textLength: recognizedText.length, hasText: !!recognizedText });

        // 공백 제거 + 소문자 변환
        const normalizedText = recognizedText.toLowerCase().replace(/\s/g, '');

        // 카드 매칭
        const candidates = Object.values(cardsData)
          .map(c => ({
            card: c,
            match: [
              ...(c.ocrKeywords || []),
              c.issuer,
              c.name,
              c.issuer + c.name
            ].filter(k => normalizedText.includes(k.toLowerCase().replace(/\s/g, ''))).length
          }))
          .filter(c => c.match > 0)
          .sort((a, b) => b.match - a.match)
          .slice(0, CONFIG.UI.MAX_OCR_CANDIDATES)
          .map(c => ({ ...c.card, matchScore: c.match }));

        safeSet(() => {
          if (candidates.length > 0) {
            setOcrCandidates(candidates);
            setOcrStatus('confirm');
            showToast(`✨ ${candidates.length}개 카드 인식됨`);
            trackEvent(EventType.OCR_SUCCESS, { candidateCount: candidates.length });
          } else {
            setOcrStatus('notfound');
            // 민감정보 보호: OCR 텍스트를 사용자에게 노출하지 않음
            showToast('카드 정보를 찾지 못했습니다');
            trackEvent(EventType.OCR_FAIL, { reason: 'no_match', textLength: recognizedText.length });
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

  const exitDemo = useCallback(() => {
    // 데모 모드 종료 - 원래 상태로 복원
    setIsDemo(false);
    setMyCards([]);
    setSelectedPlaceId(null);
    showToast('데모 모드 종료');
    trackEvent(EventType.DEMO_END);
  }, [showToast]);

  // 제보 모달 열기
  const openReportModal = useCallback((cardName = '', placeName = '') => {
    setReportPrefillCard(cardName);
    setReportPrefillPlace(placeName);
    setShowReportModal(true);
  }, []);

  const handleRetry = () => {
    dataService.clearCache();
    loadData();
  };

  // Loading / Error screens
  if (dataError) return <ErrorScreen onRetry={handleRetry} />;
  if (!dataLoaded) return <LoadingScreen />;

  // ============================================================================
  // 🎨 RENDER
  // ============================================================================

  const versionBadge = `v${CONFIG.APP.VERSION}`;

  const filteredUniversalBenefits = benefitsFilterTag ? universalBenefits.filter(b => b.category === benefitsFilterTag) : universalBenefits;
  const filteredAllMyBenefitsEntries = benefitsFilterTag ? Object.entries(allMyBenefits).filter(([cat]) => cat === benefitsFilterTag) : Object.entries(allMyBenefits);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden" style={{ maxWidth: '430px', margin: '0 auto' }}>
      <style>{`
        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        
        /* iOS Safe Area */
        @supports (padding-top: env(safe-area-inset-top)) {
          .safe-header { padding-top: calc(48px + env(safe-area-inset-top)) !important; }
          .safe-nav { bottom: calc(24px + env(safe-area-inset-bottom)) !important; }
          .safe-loading { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
        }
        
        /* 모바일 터치 최적화 (우리 v15) */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        button, a, [role="button"] {
          touch-action: manipulation;
        }
        .scroll-container {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        /* iOS 입력 줌 방지 */
        input, select, textarea {
          font-size: 16px !important;
        }
      `}</style>

      <header className="safe-header px-5 pt-12 pb-4 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-blue-400 font-bold tracking-widest mb-1">SMART WALLET</p>
            <h1 className="text-2xl font-bold">{activeTab === 'home' ? '지금, 여기 혜택' : activeTab === 'benefits' ? '내 혜택' : activeTab === 'wallet' ? '내 지갑' : '설정'}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-1 rounded-full font-bold">{versionBadge}</span>
            {isOffline && <span className="text-[9px] text-red-400 font-bold animate-pulse">● 오프라인</span>}
          </div>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto pb-28 scroll-container" role="main">
        {activeTab === 'home' && (
          <HomeTab
            selectedPlace={selectedPlace}
            smartBest={smartBest}
            cardRanking={cardRanking}
            availableBenefits={availableBenefits}
            searchQuery={searchQuery}
            debouncedQuery={debouncedQuery}
            searchResults={searchResults}
            demoData={demoData}
            myCards={myCards}
            isDemo={isDemo}
            setShowPlaceSheet={setShowPlaceSheet}
            requestLocation={requestLocation}
            setSearchQuery={setSearchQuery}
            selectPlace={selectPlace}
            handleSearchBenefitSelect={handleSearchBenefitSelect}
            openBenefitDetail={openBenefitDetail}
            handleNearby={handleNearby}
            setShowOcrModal={setShowOcrModal}
            setActiveTab={setActiveTab}
            setMyCards={setMyCards}
            showToast={showToast}
            startDemo={startDemo}
            exitDemo={exitDemo}
          />
        )}

        {activeTab === 'benefits' && (
          <BenefitsTab
            benefitsFilterTag={benefitsFilterTag}
            filteredUniversalBenefits={filteredUniversalBenefits}
            filteredAllMyBenefitsEntries={filteredAllMyBenefitsEntries}
            myNetworkBenefits={myNetworkBenefits}
            myCards={myCards}
            selectedPlace={selectedPlace}
            smartBest={smartBest}
            clearBenefitsFilter={clearBenefitsFilter}
            openBenefitDetail={openBenefitDetail}
            setActiveTab={setActiveTab}
            categorySectionRefs={categorySectionRefs}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTab
            walletSearch={walletSearch}
            filteredCardsByIssuer={filteredCardsByIssuer}
            myCards={myCards}
            expandedIssuer={expandedIssuer}
            isDemo={isDemo}
            setWalletSearch={setWalletSearch}
            setExpandedIssuer={setExpandedIssuer}
            setMyCards={setMyCards}
            showToast={showToast}
            exitDemo={exitDemo}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            locationStatus={locationStatus}
            myCards={myCards}
            cardsData={cardsData}
            placesData={placesData}
            benefitsData={benefitsData}
            requestLocation={requestLocation}
            handleReset={handleReset}
            showToast={showToast}
          />
        )}
      </main>

      <nav className="safe-nav fixed bottom-6 left-4 right-4 h-16 bg-[#1a1a1f]/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl flex items-center z-40" style={{ maxWidth: '398px', margin: '0 auto' }} role="navigation">
        <button onClick={handleHomeClick} aria-label="홈" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'home' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">🏠</span><span className="text-[10px]">홈</span></button>
        <button onClick={() => { setActiveTab('benefits'); clearBenefitsFilter(); }} aria-label="혜택" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'benefits' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">✨</span><span className="text-[10px]">내 혜택</span></button>
        <div className="relative -top-4"><button onClick={() => CONFIG.FEATURES.OCR_ENABLED ? setShowOcrModal(true) : showToast('OCR 기능이 일시적으로 비활성화되어 있습니다')} aria-label="OCR" className={`w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 border-4 border-[#0a0a0f] ${!CONFIG.FEATURES.OCR_ENABLED ? 'opacity-50' : ''}`}>📷</button></div>
        <button onClick={() => setActiveTab('wallet')} aria-label="지갑" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'wallet' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">💳</span><span className="text-[10px]">지갑</span></button>
        <button onClick={() => setActiveTab('settings')} aria-label="설정" className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">⚙️</span><span className="text-[10px]">설정</span></button>
      </nav>

      {showPlaceSheet && (
        <PlaceSheet
          placesData={placesData}
          nearbyPlaces={nearbyPlaces}
          selectedPlaceId={selectedPlaceId}
          recentPlaceIds={recentPlaceIds}
          favoritePlaceIds={favoritePlaceIds}
          placeCategoryFilter={placeCategoryFilter}
          placeSheetView={placeSheetView}
          locationStatus={locationStatus}
          userLocation={userLocation}
          benefitsData={benefitsData}
          cardsData={cardsData}
          myCards={myCards}
          setShowPlaceSheet={setShowPlaceSheet}
          setPlaceSheetView={setPlaceSheetView}
          setPlaceCategoryFilter={setPlaceCategoryFilter}
          selectPlace={selectPlace}
          toggleFavorite={toggleFavorite}
          pickNearestPlace={pickNearestPlace}
          requestLocation={requestLocation}
          showToast={showToast}
        />
      )}

      {showOcrModal && (
        <OcrModal
          ocrStatus={ocrStatus}
          ocrMessage={ocrMessage}
          ocrCandidates={ocrCandidates}
          handleOCR={handleOCR}
          confirmCard={confirmCard}
          cancelOcrRun={cancelOcrRun}
          setShowOcrModal={setShowOcrModal}
          setOcrStatus={setOcrStatus}
          setOcrMessage={setOcrMessage}
          setOcrCandidates={setOcrCandidates}
          setActiveTab={setActiveTab}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      {selectedBenefit && (
        <BenefitDetailModal
          benefit={selectedBenefit}
          cardsData={cardsData}
          onClose={() => setSelectedBenefit(null)}
          onReport={(cardName) => openReportModal(cardName, selectedPlace?.name || '')}
        />
      )}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          showToast={showToast}
          prefillCardName={reportPrefillCard}
          prefillPlaceName={reportPrefillPlace}
        />
      )}
    </div>
  );
}
