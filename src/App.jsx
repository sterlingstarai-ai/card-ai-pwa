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
  formatDistance,
  estimateValue,
  findTag,
  expandSearchQuery,
  categoryConfig,
  placeTypeConfig,
  placeCategories
} from './lib/utils';

// 🎨 UI Components
import { Toast, LoadingScreen, ErrorScreen, BenefitDetailModal, MapView } from './components';

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

  const categorySectionRefs = useRef({});
  const saveTimerRef = useRef(null);

  const vibrate = useCallback((pattern = [8]) => {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch { /* vibration not supported */ }
  }, []);

  const fileInputRef = useRef(null);
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
  useEffect(() => {
    if (!dataLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void storage.set(CONFIG.DB.KEY, { myCards, selectedPlaceId, recentPlaceIds, favoritePlaceIds });
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [myCards, selectedPlaceId, recentPlaceIds, favoritePlaceIds, dataLoaded]);

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

  // 네트워크별 기본 혜택 데이터
  const networkBenefitsData = {
    VISA: {
      icon: '💳',
      color: 'blue',
      benefits: [
        { title: '해외 가맹점', desc: '전세계 100만+ 가맹점 이용', value: '글로벌' },
        { title: '분실 보상', desc: '긴급 카드 재발급 서비스', value: '무료' },
      ]
    },
    Mastercard: {
      icon: '🌐',
      color: 'orange',
      benefits: [
        { title: '글로벌 네트워크', desc: '전세계 210개국 가맹점', value: '글로벌' },
        { title: '여행자 보험', desc: '해외 여행 시 기본 보험', value: '포함' },
      ]
    },
    AMEX: {
      icon: '✨',
      color: 'emerald',
      benefits: [
        { title: '공항 라운지', desc: '국내외 공항 라운지 이용', value: '무료' },
        { title: '콘시어지', desc: '24시간 프리미엄 컨시어지', value: '무료' },
        { title: '쇼핑 보장', desc: '구매 상품 90일 보장', value: '포함' },
      ]
    }
  };

  // 사용자의 카드 네트워크 추출
  const myNetworks = useMemo(() => {
    const networks = new Set(myCardObjects.map(c => c.network).filter(Boolean));
    return Array.from(networks);
  }, [myCardObjects]);
  
  const nearbyPlaces = useMemo(() => 
    userLocation ? Object.values(placesData).map(p => ({ ...p, distance: haversineDistance(userLocation, p) })).sort((a, b) => a.distance - b.distance) : []
  , [userLocation, placesData]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return { places: [], benefits: [] };
    const q = debouncedQuery.toLowerCase().trim();
    const expandedTerms = expandSearchQuery(q);
    const tag = findTag(q);

    // Match places using expanded terms
    const places = Object.values(placesData).filter(p => {
      const nameLower = p.name.toLowerCase();
      return expandedTerms.some(term => nameLower.includes(term)) || p.tags.includes(tag);
    }).slice(0, CONFIG.UI.MAX_SEARCH_RESULTS.PLACES);

    const mySet = new Set(myCards);
    const benefits = Object.entries(benefitsData)
      .filter(([_, b]) => {
        if (!mySet.has(b.cardId)) return false;
        const titleLower = b.title.toLowerCase();
        return b.category === tag ||
          expandedTerms.some(term => titleLower.includes(term)) ||
          b.placeTags?.includes(tag);
      })
      .map(([id, b]) => ({ id, ...b, card: cardsData[b.cardId], estimatedValue: estimateValue(b) }))
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, CONFIG.UI.MAX_SEARCH_RESULTS.BENEFITS);
    return { places, benefits };
  }, [debouncedQuery, myCards, placesData, benefitsData, cardsData]);

  const universalBenefits = useMemo(() => {
    const s = new Set(myCards);
    return Object.entries(benefitsData)
      .filter(([_, b]) => s.has(b.cardId) && (!b.placeTags || b.placeTags.length === 0))
      .map(([id, b]) => ({ id, ...b, card: cardsData[b.cardId] }));
  }, [myCards, benefitsData, cardsData]);

  const allMyBenefits = useMemo(() => {
    const s = new Set(myCards), g = {};
    Object.entries(benefitsData).forEach(([id, b]) => {
      if (!s.has(b.cardId) || !b.placeTags || b.placeTags.length === 0) return;
      if (!g[b.category]) g[b.category] = [];
      g[b.category].push({ id, ...b, card: cardsData[b.cardId], estimatedValue: estimateValue(b) });
    });
    Object.keys(g).forEach(c => g[c].sort((a, b) => b.estimatedValue - a.estimatedValue));
    return g;
  }, [myCards, benefitsData, cardsData]);

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
    const tags = selectedPlace.tags, s = new Set(myCards);
    const cardBenefits = Object.entries(benefitsData)
      .filter(([_, b]) => s.has(b.cardId) && b.placeTags?.some(t => tags.includes(t)))
      .map(([id, b]) => ({ id, ...b, card: cardsData[b.cardId], estimatedValue: estimateValue(b) }))
      .sort((a, b) => b.estimatedValue - a.estimatedValue);
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
  }, [selectedPlace, myCards, myCardObjects, benefitsData, cardsData, networkBenefits]);

  const cardRanking = useMemo(() => {
    const { cardBenefits, networkBenefits: netBen } = availableBenefits;
    if (cardBenefits.length === 0 && netBen.length === 0) return [];
    const v = {};
    cardBenefits.forEach(b => {
      if (!v[b.cardId]) v[b.cardId] = { card: b.card, totalValue: 0, reasons: [], benefitIds: [], benefitSummary: [], caveats: new Set(), count: 0 };
      v[b.cardId].totalValue += b.estimatedValue;
      v[b.cardId].count++;
      v[b.cardId].benefitIds.push(b.id);
      v[b.cardId].benefitSummary.push({ emoji: categoryConfig[b.category]?.emoji, title: b.title, value: b.value });
      v[b.cardId].reasons.push(`${categoryConfig[b.category]?.emoji} ${b.title}`);
      // Extract caveats from benefit conditions
      if (b.conditions) v[b.cardId].caveats.add(b.conditions);
      if (b.limit) v[b.cardId].caveats.add(`한도: ${b.limit}`);
    });
    netBen.forEach(b => {
      const id = b.card.id;
      if (!v[id]) v[id] = { card: b.card, totalValue: 0, reasons: [], benefitIds: [], benefitSummary: [], caveats: new Set(), count: 0 };
      v[id].totalValue += b.estimatedValue;
      v[id].count++;
      v[id].benefitSummary.push({ emoji: '🌐', title: b.title, value: `${b.estimatedValue?.toLocaleString()}원` });
      v[id].reasons.push(`🌐 ${b.title}`);
    });
    // Convert caveats Set to Array
    Object.values(v).forEach(item => { item.caveats = Array.from(item.caveats); });
    return Object.values(v).sort((a, b) => b.totalValue - a.totalValue);
  }, [availableBenefits]);

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
  }, [selectedPlace?.id, availableBenefits]);

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
    if (locationStatus === 'success' || locationStatus === 'fallback') {
      setShowPlaceSheet(true);
    } else {
      // 먼저 위치 권한 요청, 완료 후 시트 열기
      await requestLocation();
      setShowPlaceSheet(true);
    }
  };

  const pickNearestPlace = () => {
    if (nearbyPlaces.length > 0) {
      selectPlace(nearbyPlaces[0].id);
    }
  };

  // OCR 이미지 리사이즈/압축 (대용량 이미지 최적화)
  const compressImage = (file, maxSize = 1920, quality = 0.8) => {
    return new Promise((resolve) => {
      // 이미 작은 파일은 그대로 반환 (500KB 이하)
      if (file.size < 500 * 1024) {
        resolve(file);
        return;
      }

      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
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

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              Logger.log(`Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB`);
              resolve(blob);
            } else {
              resolve(file); // 압축 실패시 원본 반환
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file); // 로드 실패시 원본 반환
      img.src = URL.createObjectURL(file);
    });
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
      // 이미지를 base64로 변환
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // data:image/...;base64, 제거
        reader.onerror = reject;
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
        showToast(`⚠️ 오류: ${errMsg.substring(0, 50)}`);
        safeSet(() => setOcrStatus('error'));
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
          <div className="p-5 space-y-5" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex gap-2">
              <button onClick={() => setShowPlaceSheet(true)} className="flex-1 p-4 bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-2xl border border-white/10 flex items-center gap-3 active:scale-[0.98]" aria-label="장소 선택">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg">{selectedPlace ? placeTypeConfig[selectedPlace.type]?.emoji : '📍'}</div>
                <div className="flex-1 text-left min-w-0"><p className="text-[10px] text-slate-400">현재 장소</p><p className="font-bold truncate text-sm">{selectedPlace ? selectedPlace.name : '선택하세요'}</p></div>
              </button>
              <button onClick={async () => { await requestLocation(); setShowPlaceSheet(true); }} className="w-14 h-14 bg-blue-600 rounded-2xl flex flex-col items-center justify-center active:scale-95" aria-label="내 주변"><span className="text-lg">🎯</span><span className="text-[8px] font-bold">내주변</span></button>
            </div>

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
        )}

        {activeTab === 'benefits' && (
          <div className="p-5 space-y-6" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
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
            {!benefitsFilterTag && myNetworks.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-purple-400 mb-3">🌍 카드 네트워크 혜택</h3>
                <div className="space-y-3">
                  {myNetworks.map(network => {
                    const data = networkBenefitsData[network];
                    if (!data) return null;
                    const networkCards = myCardObjects.filter(c => c.network === network);
                    return (
                      <div key={network} className="bg-purple-500/10 rounded-xl border border-purple-500/20 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{data.icon}</span>
                          <span className="font-bold">{network}</span>
                          <span className="text-[10px] text-slate-400">({networkCards.length}장)</span>
                        </div>
                        <div className="space-y-2">
                          {data.benefits.map((b, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium text-slate-200">{b.title}</p>
                                <p className="text-[10px] text-slate-500">{b.desc}</p>
                              </div>
                              <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">{b.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                        {benefitsFilterTag && myCards.length > 0 && filteredUniversalBenefits.length === 0 && filteredAllMyBenefitsEntries.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <span className="text-4xl">🫥</span>
                <p className="mt-4">해당 카테고리 혜택이 없습니다</p>
                <button type="button" onClick={clearBenefitsFilter} className="mt-4 px-4 py-2 bg-slate-800/60 border border-white/10 rounded-xl text-xs text-slate-200 active:scale-[0.98]">
                  필터 해제
                </button>
              </div>
            )}
{myCards.length === 0 && <div className="text-center py-16"><span className="text-4xl">💳</span><p className="text-slate-400 mt-4">카드를 추가하면 혜택 확인 가능</p></div>}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
            <input 
              type="text" 
              placeholder="🔍 카드 이름 또는 카드사 검색..." 
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm mb-4 focus:border-blue-500/50 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mb-4">
              {walletSearch ? `검색 결과 · ${Object.values(filteredCardsByIssuer).flat().length}장` : `카드사를 탭하여 펼치기 · ${myCards.length}장 보유`}
            </p>
            <div className="space-y-3">
              {Object.keys(filteredCardsByIssuer).length > 0 ? (
                Object.entries(filteredCardsByIssuer).sort(([a],[b]) => a.localeCompare(b, 'ko')).map(([issuer, cards]) => {
                  const myCount = cards.filter(c => myCards.includes(c.id)).length;
                  const isExpanded = expandedIssuer === issuer || walletSearch.length > 0;
                  return (
                    <div key={issuer}>
                      <button onClick={() => setExpandedIssuer(isExpanded && !walletSearch ? null : issuer)} className="w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-white/5" aria-expanded={isExpanded}>
                        <span className="font-bold">{issuer}</span>
                        <div className="flex items-center gap-2">
                          {myCount > 0 && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{myCount}</span>}
                          <span className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-2 pl-2 max-h-60 overflow-y-auto">
                          {cards.map(card => (
                            <label key={card.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${myCards.includes(card.id) ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-slate-800/30 border border-transparent'}`}>
                              <input type="checkbox" checked={myCards.includes(card.id)} onChange={() => {
                                const isAdding = !myCards.includes(card.id);
                                setMyCards(prev => isAdding ? (prev.includes(card.id) ? prev : [...prev, card.id]) : prev.filter(id => id !== card.id));
                                showToast(isAdding ? MESSAGES.CARD.ADDED(card.name) : MESSAGES.CARD.REMOVED(card.name));
                              }} className="w-5 h-5 rounded-full" />
                              <div className="w-8 h-5 rounded" style={{ background: `linear-gradient(135deg, ${card.color}, #1a1a1a)` }} />
                              <div className="flex-1"><p className="text-sm font-medium">{card.name}</p><p className="text-[10px] text-slate-500">{card.network} · {card.grade}</p></div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-slate-500">
                  <span className="text-4xl">🔍</span>
                  <p className="mt-4">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-5 space-y-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
              <h3 className="font-bold mb-2">📍 위치 권한</h3>
              <p className="text-sm text-slate-400 mb-3">{locationStatus === 'idle' ? '위치 권한 필요' : locationStatus === 'loading' ? '확인 중...' : locationStatus === 'success' ? '✅ 허용됨' : locationStatus === 'denied' ? '❌ 거부됨' : '⚠️ 서울 기준'}</p>
              <button onClick={requestLocation} disabled={locationStatus === 'loading'} className="w-full py-2.5 bg-blue-600 rounded-xl text-sm font-medium disabled:opacity-60">{locationStatus === 'loading' ? '위치 확인 중...' : '위치 요청'}</button>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
              <h3 className="font-bold mb-2">💾 저장소</h3>
              <p className="text-sm text-slate-400">{storage.getMode()} 사용 중 (오프라인 지원)</p>
            </div>

            {/* 문의 및 지원 */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
              <h3 className="font-bold mb-3">💬 문의 및 지원</h3>
              <a href={`mailto:${CONFIG.LINKS.SUPPORT_EMAIL}?subject=[Card AI] 문의사항`} className="block w-full py-2.5 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-medium text-center border border-blue-500/30 mb-2">📧 문의하기</a>
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

            {/* 개인정보 및 이용약관 */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
              <h3 className="font-bold mb-3">📋 약관 및 정책</h3>
              <a href={CONFIG.LINKS.PRIVACY_POLICY} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2 text-sm text-slate-300">
                <span>🔒 개인정보처리방침</span><span className="text-slate-500">→</span>
              </a>
              <a href={CONFIG.LINKS.TERMS_OF_SERVICE} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2 text-sm text-slate-300 border-t border-white/5">
                <span>📄 이용약관</span><span className="text-slate-500">→</span>
              </a>
            </div>

            <button onClick={handleReset} className="w-full py-3 bg-red-600/20 text-red-400 rounded-2xl text-sm font-medium border border-red-500/30">🗑️ 초기화</button>

            {/* 앱 정보 */}
            <div className="text-center text-[10px] text-slate-600 mt-4 space-y-1">
              <p>{CONFIG.APP.NAME} v{CONFIG.BUILD.VERSION} ({CONFIG.BUILD.BUILD_NUMBER})</p>
              <p>{Object.keys(cardsData || {}).length}카드 · {Object.keys(placesData || {}).length}장소 · {Object.keys(benefitsData || {}).length}혜택</p>
              <p className="text-slate-700">Build: {CONFIG.BUILD.COMMIT_HASH} · {CONFIG.BUILD.BUILD_DATE}</p>
            </div>
          </div>
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
        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowPlaceSheet(false)} role="dialog" aria-modal="true">
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1f] rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ maxWidth: '430px', margin: '0 auto', height: '75vh' }}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div><div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-3" /><h2 className="text-lg font-bold">장소 선택</h2></div>
              <div className="flex gap-2" role="tablist">
                <button onClick={() => setPlaceSheetView('list')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placeSheetView === 'list' ? 'bg-blue-600' : 'bg-slate-700'}`} role="tab" aria-label="목록 보기" aria-selected={placeSheetView === 'list'}>📋 목록</button>
                <button onClick={() => {
                  if (!CONFIG.FEATURES.MAP_ENABLED) {
                    showToast('지도 기능이 일시적으로 비활성화되어 있습니다');
                    return;
                  }
                  // 지도 열 때 위치 권한 요청
                  if (locationStatus === 'idle') requestLocation();
                  setPlaceSheetView('map');
                }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placeSheetView === 'map' ? 'bg-blue-600' : 'bg-slate-700'} ${!CONFIG.FEATURES.MAP_ENABLED ? 'opacity-50' : ''}`} role="tab" aria-label="지도 보기" aria-selected={placeSheetView === 'map'} disabled={!CONFIG.FEATURES.MAP_ENABLED}>🗺️ 지도</button>
              </div>
            </div>
            <div className="h-[calc(75vh-80px)] overflow-hidden">
              {placeSheetView === 'list' ? (
                <div className="p-4 overflow-y-auto h-full scroll-container" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                  {(locationStatus === 'success' || locationStatus === 'fallback') && nearbyPlaces.length > 0 && (
                    <button onClick={pickNearestPlace} className="w-full p-4 mb-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-500/30 text-left active:scale-[0.98]">
                      <p className="font-bold text-green-400">⚡ 가장 가까운 곳</p>
                      <p className="text-xs text-slate-400 mt-1">{nearbyPlaces[0].name} · {formatDistance(nearbyPlaces[0].distance)}</p>
                    </button>
                  )}
                  {(locationStatus === 'idle' || locationStatus === 'denied') && (
                    <button onClick={requestLocation} disabled={locationStatus === 'loading'} className="w-full p-4 mb-4 bg-blue-600/20 rounded-2xl border border-blue-500/30 text-left disabled:opacity-60">
                      <p className="font-bold text-blue-400">📍 내 위치 찾기</p>
                      <p className="text-xs text-slate-500 mt-1">GPS 권한 허용 시 주변 혜택 자동 추천</p>
                    </button>
                  )}
                  {locationStatus === 'loading' && (
                    <div className="w-full p-4 mb-4 bg-slate-800/40 rounded-2xl border border-white/5 text-left">
                      <p className="font-bold text-slate-200">📍 내 위치 확인 중...</p>
                      <p className="text-xs text-slate-500 mt-1">잠시만 기다려주세요</p>
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
                      <p className="text-xs text-slate-500 font-bold mb-2">🕘 최근</p>
                      <div className="flex flex-wrap gap-2">
                        {recentPlaceIds.filter(id => !favoritePlaceIds.includes(id)).map(id => placesData[id]).filter(Boolean).map(p => (
                          <button key={p.id} onClick={() => selectPlace(p.id)} className={`px-3 py-2 rounded-full text-xs border active:scale-[0.98] ${selectedPlaceId === p.id ? 'bg-blue-600 border-blue-400/40' : 'bg-slate-800/50 border-white/10'}`}>
                            <span className="mr-1">{placeTypeConfig[p.type]?.emoji}</span>{p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

                  {/* 카테고리 탭 */}
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

                  {/* 필터된 장소 목록 */}
                  <p className="text-xs text-slate-500 font-bold mb-2">
                    {placeCategoryFilter === 'all' ? '📋 전체' : `${placeTypeConfig[placeCategoryFilter]?.emoji || '📋'} ${placeTypeConfig[placeCategoryFilter]?.label || '전체'}`}
                  </p>
                  {Object.values(placesData)
                    .filter(p => placeCategoryFilter === 'all' || p.type === placeCategoryFilter)
                    .map(p => (
                    <div key={p.id} className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 ${selectedPlaceId === p.id ? 'bg-blue-600' : 'bg-slate-800/30'}`}>
                      <button onClick={() => selectPlace(p.id)} className="flex-1 flex items-center gap-3 text-left active:scale-[0.98]">
                        <span className="text-xl">{placeTypeConfig[p.type]?.emoji}</span>
                        <span className="font-medium text-sm">{p.name}</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }} className="p-2 rounded-lg active:scale-90">
                        <span className={favoritePlaceIds.includes(p.id) ? 'text-amber-400' : 'text-slate-600'}>
                          {favoritePlaceIds.includes(p.id) ? '★' : '☆'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <MapView userLocation={userLocation} places={Object.values(placesData)} selectedPlaceId={selectedPlaceId} onPlaceSelect={id => selectPlace(id)} onClose={() => setShowPlaceSheet(false)} onError={() => setPlaceSheetView('list')} benefitsData={benefitsData} cardsData={cardsData} myCards={myCards} />
              )}
            </div>
          </div>
        </div>
      )}

      {showOcrModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end" role="dialog" aria-modal="true">
          <div className="bg-[#1a1a1f] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ maxWidth: '430px', margin: '0 auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">📷 카드 스캔</h2><button onClick={() => { cancelOcrRun(); setShowOcrModal(false); setOcrStatus('idle'); setOcrMessage(''); setOcrCandidates([]); }} className="text-slate-400 text-2xl">×</button></div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleOCR} className="hidden" />
            {ocrStatus === 'idle' && <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center gap-3 active:scale-[0.98]"><span className="text-5xl">📷</span><span className="font-medium">카드 사진 촬영</span></button>}
            {ocrStatus === 'loading' && <div className="py-16 text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" /><p className="text-slate-400">{ocrMessage || '처리중...'}</p></div>}
            {ocrStatus === 'confirm' && ocrCandidates.length > 0 && (
              <div>
                <p className="text-sm text-blue-400 mb-4">✨ 카드를 선택하세요</p>
                <div className="space-y-3">
                  {ocrCandidates.map(card => (
                    <button key={card.id} onClick={() => confirmCard(card)} className="w-full p-4 bg-slate-800 rounded-2xl flex items-center gap-4 active:scale-[0.98]">
                      <div className="w-14 h-9 rounded-lg border border-white/20" style={{ background: `linear-gradient(135deg, ${card.color}, #1a1a1a)` }} />
                      <div className="flex-1 text-left"><p className="font-bold">{card.name}</p><p className="text-xs text-slate-500">{card.issuer}</p></div>
                      {card.matchScore && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full">{card.matchScore}개 일치</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setOcrStatus('idle'); setOcrMessage(''); setOcrCandidates([]); }} className="w-full mt-4 py-3 text-slate-400">다시 촬영</button>
              </div>
            )}
            {ocrStatus === 'notfound' && (
              <div className="text-center py-8">
                <span className="text-5xl">🤔</span>
                <p className="text-slate-400 mt-4 mb-6">카드를 인식하지 못했어요</p>
                <button onClick={() => { setOcrStatus('idle'); setOcrMessage(''); }} className="w-full py-3 bg-slate-700 rounded-xl font-medium mb-3">다시 촬영</button>
                <button onClick={() => { cancelOcrRun(); setShowOcrModal(false); setActiveTab('wallet'); setOcrStatus('idle'); setOcrMessage(''); }} className="w-full py-3 bg-blue-600 rounded-xl font-medium">직접 선택</button>
              </div>
            )}
            {ocrStatus === 'network_error' && (
              <div className="text-center py-8">
                <span className="text-5xl">🌐</span>
                <p className="text-white font-bold mt-4 mb-2">인터넷 연결 필요</p>
                <p className="text-slate-400 text-sm mb-6">카드 스캔은 인터넷 연결이 필요합니다.<br/>Wi-Fi 또는 데이터를 확인해주세요.</p>
                <button onClick={() => { setOcrStatus('idle'); setOcrMessage(''); }} className="w-full py-3 bg-slate-700 rounded-xl font-medium mb-3">다시 시도</button>
                <button onClick={() => { cancelOcrRun(); setShowOcrModal(false); setActiveTab('wallet'); setOcrStatus('idle'); setOcrMessage(''); }} className="w-full py-3 bg-blue-600 rounded-xl font-medium">직접 선택하기</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      {selectedBenefit && <BenefitDetailModal benefit={selectedBenefit} cardsData={cardsData} onClose={() => setSelectedBenefit(null)} />}
    </div>
  );
}
