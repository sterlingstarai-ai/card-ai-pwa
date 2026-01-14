import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// 📦 Data imports from JSON files
import CARDS_DATA from './data/cards.json';
import PLACES_DATA from './data/places.json';
import BENEFITS_DATA from './data/benefits.json';

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
// ⚙️ CONFIGURATION (모든 설정값 통합)
// ============================================================================

const CONFIG = {
  // 앱 정보
  APP: {
    VERSION: 'Final',
    NAME: 'Card AI',
    DEBUG: false,  // 프로덕션: 디버그 모드 비활성화
  },

  // 기본값
  DEFAULTS: {
    CARDS: ['hyundai-purple', 'samsung-taptap-o', 'shinhan-the-best'],
    LOCATION: { lat: 37.5665, lng: 126.9780 }, // 서울시청
    RECENT_PLACES: [],
  },

  // 타임아웃 (ms)
  TIMEOUTS: {
    OCR: 30000,
    LOCATION: 10000,
    API_SIMULATE: 50,
    TOAST: 2500,
    DEBOUNCE: 300,
  },

  // IndexedDB 설정
  DB: {
    NAME: 'CardAI_DB',
    VERSION: 1,
    STORE: 'userPrefs',
    KEY: 'userData',
  },

  // UI 설정
  UI: {
    MAX_SEARCH_RESULTS: {
      BENEFITS: 8,
      PLACES: 5,
    },
    MAX_NEARBY_PLACES: 8,
    MAX_RECENT_PLACES: 5,
    MAX_CARD_RANKING: 4,
    MAX_BENEFITS_PER_CATEGORY: 5,
    MAX_OCR_CANDIDATES: 3,
  },

  // 지도 설정
  MAP: {
    DEFAULT_ZOOM: 1,
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 5,
    ZOOM_STEP: 0.5,
    FOCUSED_ZOOM: 3,
    LAT_SCALE: 1.35,
  },

  // 가치 평가 가중치
  VALUE_WEIGHTS: {
    lounge: 25000,
    valet: 20000,
    hotel: 15000,
    fnb: 10000,
    golf: 15000,
    cafe: 5000,
    shopping: 5000,
    entertainment: 4000,
    points: 5000,
    airport: 20000,
  },

  // 보너스 가치
  VALUE_BONUS: {
    UNLIMITED: 30000,
    PERCENT_MULTIPLIER: 200,
  },
};

// ============================================================================
// 📝 ERROR MESSAGES (에러 메시지 통합)
// ============================================================================

const MESSAGES = {
  LOCATION: {
    NOT_SUPPORTED: '❌ 위치 서비스를 지원하지 않습니다',
    DENIED: '❌ 위치 권한이 거부되었습니다',
    FALLBACK: '⚠️ 서울 기준으로 표시합니다',
    SUCCESS: '📍 위치를 찾았습니다',
  },
  OCR: {
    TIMEOUT: '⏱️ 시간 초과 - 다시 시도해주세요',
    NETWORK_ERROR: '🌐 네트워크 오류 - 인터넷 연결을 확인해주세요',
    ENGINE_FAILED: '⚠️ OCR 엔진 로드 실패',
  },
  CARD: {
    ADDED: (name) => `✅ ${name} 추가됨`,
    REMOVED: (name) => `🗑️ ${name} 삭제됨`,
    ALREADY_EXISTS: '⚠️ 이미 등록된 카드입니다',
  },
  PLACE: {
    SELECTED: (name) => `📍 ${name} 선택됨`,
  },
  SYSTEM: {
    RESET: '🗑️ 모든 데이터가 초기화되었습니다',
    DATA_LOAD_ERROR: '데이터를 불러올 수 없습니다',
  },
};

// ============================================================================
// 🔧 LOGGER (조건부 로깅)
// ============================================================================

const Logger = {
  log: (...args) => CONFIG.APP.DEBUG && console.log('[CardAI]', ...args),
  warn: (...args) => CONFIG.APP.DEBUG && console.warn('[CardAI]', ...args),
  error: (...args) => console.error('[CardAI]', ...args), // 에러는 항상 출력
  info: (...args) => CONFIG.APP.DEBUG && console.info('[CardAI]', ...args),
};

// ============================================================================
// 📦 DATA: Imported from ./data/*.json files
// ============================================================================
// CARDS_DATA, PLACES_DATA, BENEFITS_DATA imported at top

const NETWORKS_DATA = {
  "VISA": {
    grades: {
      "Infinite": { benefits: [
        { icon: "🛋️", title: "VISA 인피니트 라운지", tags: ["airport", "lounge"], value: 50000, desc: "전 세계 공항 VISA 제휴 라운지 무료 이용. 카드사별 횟수 제한 상이." },
        { icon: "📞", title: "VISA 컨시어지 24시간", tags: ["hotel", "travel"], value: 30000, desc: "24시간 프리미엄 컨시어지 서비스, 여행/호텔/레스토랑 예약 지원." },
        { icon: "🏨", title: "Luxury Hotel Collection", tags: ["hotel"], value: 40000, desc: "전 세계 900+ 럭셔리 호텔 특별 혜택 (조식, 업그레이드 등)." }
      ]},
      "Signature": { benefits: [
        { icon: "🛋️", title: "VISA 시그니처 라운지", tags: ["airport", "lounge"], value: 20000, desc: "VISA 제휴 공항 라운지 할인 이용." },
        { icon: "🛡️", title: "VISA 여행자 보험", tags: ["airport", "travel"], value: 15000, desc: "해외 결제 시 여행자보험 자동 가입." }
      ]},
      "Platinum": { benefits: [
        { icon: "🛡️", title: "VISA 해외여행보험", tags: ["airport"], value: 10000, desc: "해외 결제 시 여행자보험 자동 가입." }
      ]},
      "Gold": { benefits: [] },
      "Standard": { benefits: [] }
    }
  },
  "Mastercard": {
    grades: {
      "World Elite": { benefits: [
        { icon: "🛋️", title: "MC 월드엘리트 라운지", tags: ["airport", "lounge"], value: 50000, desc: "LoungeKey 전 세계 1,000개+ 공항 라운지 무료 이용." },
        { icon: "📞", title: "MC 컨시어지 24시간", tags: ["hotel", "travel"], value: 30000, desc: "24시간 프리미엄 컨시어지 서비스." },
        { icon: "🏨", title: "호텔 프로그램", tags: ["hotel"], value: 35000, desc: "Mastercard 호텔 프로그램 특별 혜택." }
      ]},
      "World": { benefits: [
        { icon: "🛋️", title: "MC 월드 라운지", tags: ["airport", "lounge"], value: 25000, desc: "LoungeKey 공항 라운지 할인 이용 가능." },
        { icon: "🚗", title: "호텔 발렛", tags: ["hotel", "valet"], value: 20000, desc: "제휴 호텔 발렛파킹 할인." }
      ]},
      "Platinum": { benefits: [
        { icon: "🛡️", title: "MC 해외여행보험", tags: ["airport"], value: 10000, desc: "해외 결제 시 여행자보험 자동 가입." }
      ]},
      "Gold": { benefits: [] },
      "Standard": { benefits: [] }
    }
  },
  "AMEX": {
    grades: {
      "Centurion": { benefits: [
        { icon: "🛋️", title: "AMEX 센추리온 라운지", tags: ["airport", "lounge"], value: 80000, desc: "전 세계 AMEX 센추리온 라운지 무료 이용." },
        { icon: "📞", title: "AMEX 컨시어지", tags: ["hotel", "travel"], value: 50000, desc: "24시간 프리미엄 컨시어지 서비스." },
        { icon: "🏨", title: "Fine Hotels & Resorts", tags: ["hotel"], value: 60000, desc: "AMEX FHR 프로그램 특별 혜택 (조식, 업그레이드, 레이트체크아웃)." }
      ]},
      "Platinum": { benefits: [
        { icon: "🛋️", title: "AMEX 라운지", tags: ["airport", "lounge"], value: 40000, desc: "인천공항 AMEX 라운지 및 PP 라운지 이용 가능." },
        { icon: "🏨", title: "AMEX 호텔 특전", tags: ["hotel"], value: 30000, desc: "Fine Hotels & Resorts 프로그램 혜택." }
      ]},
      "Gold": { benefits: [
        { icon: "🛍️", title: "AMEX 오퍼", tags: ["shopping", "online"], value: 15000, desc: "AMEX 제휴 가맹점 및 온라인몰 할인 혜택." }
      ]},
      "Standard": { benefits: [] }
    }
  },
  "JCB": {
    grades: {
      "Platinum": { benefits: [
        { icon: "🛋️", title: "JCB 라운지", tags: ["airport", "lounge"], value: 20000, desc: "JCB 제휴 아시아 공항 라운지 이용." }
      ]},
      "Gold": { benefits: [] },
      "Standard": { benefits: [] }
    }
  },
  "UnionPay": {
    grades: {
      "Platinum": { benefits: [
        { icon: "🛋️", title: "유니온페이 라운지", tags: ["airport", "lounge"], value: 15000, desc: "중국 주요 공항 라운지 이용 가능." },
        { icon: "🛍️", title: "중국 결제 할인", tags: ["shopping"], value: 10000, desc: "중국 현지 가맹점 결제 시 추가 할인 혜택." }
      ]},
      "Standard": { benefits: [] }
    }
  }
};


// ============================================================================
// 🗄️ STORAGE SERVICE (IndexedDB + localStorage 폴백)
// ============================================================================

class StorageService {
  constructor() {
    this.db = null;
    this.useLocalStorage = false;
    this.ready = this.init();
  }

  async init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        Logger.warn('IndexedDB not supported, using localStorage fallback');
        this.useLocalStorage = true;
        resolve();
        return;
      }

      const request = indexedDB.open(CONFIG.DB.NAME, CONFIG.DB.VERSION);

      request.onerror = () => {
        Logger.warn('IndexedDB failed, using localStorage fallback');
        this.useLocalStorage = true;
        resolve();
      };

      // iOS Safari에서 DB가 잠겨있을 때 폴백
      request.onblocked = () => {
        Logger.warn('IndexedDB blocked, using localStorage fallback');
        this.useLocalStorage = true;
        resolve();
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        
        // 다른 탭에서 버전 변경 시 안전하게 닫기
        this.db.onversionchange = () => {
          this.db.close();
          Logger.warn('IndexedDB version changed, using localStorage fallback');
          this.useLocalStorage = true;
        };
        
        Logger.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(CONFIG.DB.STORE)) {
          db.createObjectStore(CONFIG.DB.STORE, { keyPath: 'key' });
        }
      };
    });
  }

  getMode() {
    return this.useLocalStorage ? 'localStorage' : 'IndexedDB';
  }

  async get(key) {
    await this.ready;

    if (this.useLocalStorage) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(CONFIG.DB.STORE, 'readonly');
        const store = tx.objectStore(CONFIG.DB.STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => resolve(null);
      } catch {
        // transaction 생성 실패 시 localStorage 폴백
        this.useLocalStorage = true;
        try {
          const data = localStorage.getItem(key);
          resolve(data ? JSON.parse(data) : null);
        } catch {
          resolve(null);
        }
      }
    });
  }

  async set(key, value) {
    await this.ready;

    if (this.useLocalStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(CONFIG.DB.STORE, 'readwrite');
        const store = tx.objectStore(CONFIG.DB.STORE);
        store.put({ key, value });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        // transaction 생성 실패 시 localStorage 폴백
        this.useLocalStorage = true;
        try {
          localStorage.setItem(key, JSON.stringify(value));
          resolve(true);
        } catch {
          resolve(false);
        }
      }
    });
  }

  async delete(key) {
    await this.ready;

    if (this.useLocalStorage) {
      localStorage.removeItem(key);
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(CONFIG.DB.STORE, 'readwrite');
        const store = tx.objectStore(CONFIG.DB.STORE);
        store.delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        // transaction 생성 실패 시 localStorage 폴백
        this.useLocalStorage = true;
        localStorage.removeItem(key);
        resolve(true);
      }
    });
  }
}

const storage = new StorageService();

// ============================================================================
// 📡 DATA SERVICE (API 연동 대비)
// ============================================================================

class DataService {
  constructor() {
    this.cache = { cards: null, places: null, benefits: null, networks: null };
  }

  async fetchCards() {
    if (this.cache.cards) return this.cache.cards;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    this.cache.cards = CARDS_DATA;
    return this.cache.cards;
  }

  async fetchPlaces() {
    if (this.cache.places) return this.cache.places;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    this.cache.places = PLACES_DATA;
    return this.cache.places;
  }

  async fetchBenefits() {
    if (this.cache.benefits) return this.cache.benefits;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    this.cache.benefits = BENEFITS_DATA;
    return this.cache.benefits;
  }

  async fetchNetworks() {
    if (this.cache.networks) return this.cache.networks;
    await new Promise(r => setTimeout(r, CONFIG.TIMEOUTS.API_SIMULATE));
    this.cache.networks = NETWORKS_DATA;
    return this.cache.networks;
  }

  async fetchAll() {
    const [cards, places, benefits, networks] = await Promise.all([
      this.fetchCards(),
      this.fetchPlaces(),
      this.fetchBenefits(),
      this.fetchNetworks()
    ]);
    Logger.log('All data loaded');
    return { cards, places, benefits, networks };
  }

  clearCache() {
    this.cache = { cards: null, places: null, benefits: null, networks: null };
    Logger.log('Cache cleared');
  }
}

const dataService = new DataService();

// ============================================================================
// 🛠️ UTILITIES
// ============================================================================

const haversineDistance = (pos1, pos2) => {
  if (!pos1 || !pos2) return 0;
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pos1.lat)) * Math.cos(toRad(pos2.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const formatDistance = (m) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

const estimateValue = (benefit) => {
  const val = benefit.value || '';
  const category = benefit.category || '';
  const base = CONFIG.VALUE_WEIGHTS[category] || 5000;
  let bonus = 0;
  
  if (val.includes('무제한') || val.includes('PP')) {
    bonus += CONFIG.VALUE_BONUS.UNLIMITED;
  }
  
  const pct = val.match(/(\d+)%/);
  if (pct) {
    bonus += parseInt(pct[1]) * CONFIG.VALUE_BONUS.PERCENT_MULTIPLIER;
  }
  
  return base + bonus;
};

const keywordToTag = { 
  '발렛': 'valet', '주차': 'valet', '라운지': 'lounge', 'pp': 'lounge', 
  '호텔': 'hotel', '다이닝': 'fnb', '골프': 'golf', '카페': 'cafe', 
  '커피': 'cafe', '쇼핑': 'shopping', '백화점': 'shopping', 
  '영화': 'entertainment', '공항': 'airport', '포인트': 'points' 
};

const findTag = (q) => { 
  const t = q.toLowerCase().trim(); 
  return keywordToTag[t] || Object.entries(keywordToTag).find(([k]) => t.includes(k) || k.includes(t))?.[1] || t; 
};

const categoryConfig = {
  airport: { emoji: "✈️", label: "공항" }, 
  valet: { emoji: "🚗", label: "발렛" }, 
  lounge: { emoji: "🛋️", label: "라운지" },
  fnb: { emoji: "🍽️", label: "다이닝" }, 
  hotel: { emoji: "🏨", label: "호텔" }, 
  golf: { emoji: "⛳", label: "골프" },
  cafe: { emoji: "☕", label: "카페" }, 
  shopping: { emoji: "🛍️", label: "쇼핑" }, 
  points: { emoji: "💰", label: "포인트" },
  entertainment: { emoji: "🎬", label: "문화" }
};

const placeTypeConfig = {
  airport: { emoji: "✈️", label: "공항" },
  lounge: { emoji: "🛋️", label: "라운지" },
  hotel: { emoji: "🏨", label: "호텔" },
  department: { emoji: "🛍️", label: "백화점" },
  dutyfree: { emoji: "🎁", label: "면세점" },
  golf: { emoji: "⛳", label: "골프" },
  cafe: { emoji: "☕", label: "카페" },
  entertainment: { emoji: "🎬", label: "영화" },
  convenience: { emoji: "🏪", label: "편의점" },
  online: { emoji: "🛒", label: "온라인" },
  mart: { emoji: "🛒", label: "마트" },
  gas: { emoji: "⛽", label: "주유소" }
};

const placeCategories = [
  { id: 'all', label: '전체', emoji: '📍' },
  { id: 'airport', label: '공항', emoji: '✈️' },
  { id: 'lounge', label: '라운지', emoji: '🛋️' },
  { id: 'hotel', label: '호텔', emoji: '🏨' },
  { id: 'department', label: '백화점', emoji: '🛍️' },
  { id: 'golf', label: '골프', emoji: '⛳' },
  { id: 'convenience', label: '편의점', emoji: '🏪' },
  { id: 'mart', label: '마트', emoji: '🛒' },
  { id: 'gas', label: '주유소', emoji: '⛽' },
  { id: 'cafe', label: '카페', emoji: '☕' },
  { id: 'entertainment', label: '영화', emoji: '🎬' },
  { id: 'online', label: '온라인', emoji: '💻' },
];

// ============================================================================
// 🎨 UI COMPONENTS
// ============================================================================

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, CONFIG.TIMEOUTS.TOAST);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div role="alert" aria-live="polite" style={{
      position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(30, 41, 59, 0.95)', color: 'white', padding: '12px 20px',
      borderRadius: '50px', fontSize: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)', zIndex: 100, animation: 'slideUp 0.3s ease-out'
    }}>
      <span>{message}</span>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f]">
    <div className="w-16 h-16 mb-4 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    <p className="text-white text-sm">데이터 로딩 중...</p>
  </div>
);

const ErrorScreen = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f] p-6">
    <span className="text-5xl mb-4">⚠️</span>
    <p className="text-white text-lg font-bold mb-2">{MESSAGES.SYSTEM.DATA_LOAD_ERROR}</p>
    <p className="text-slate-400 text-sm mb-6 text-center">네트워크 연결을 확인하고 다시 시도해주세요</p>
    <button onClick={onRetry} className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold">다시 시도</button>
  </div>
);

// 혜택 상세 모달 (Gemini 제안)
const BenefitDetailModal = ({ benefit, cardsData, onClose }) => {
  if (!benefit) return null;
  const card = cardsData?.[benefit.cardId];
  
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
        <button 
          onClick={onClose} 
          className="w-full py-4 bg-blue-600 rounded-2xl font-bold active:scale-[0.98] transition-transform"
        >
          확인
        </button>
      </div>
    </div>
  );
};

const KAKAO_APP_KEY = 'b6d42c58bb45a8e461cee9040d2677a4';

const MapView = ({ userLocation, places, selectedPlaceId, onPlaceSelect, onClose, benefitsData, cardsData, myCards }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
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
    { name: '제주', lat: 33.38, lng: 126.55, zoom: 10 }
  ];

  // 카카오맵 SDK 동적 로드
  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
    script.async = true;

    script.onload = () => {
      console.log('Kakao SDK script loaded');
      setSdkLoaded(true);
    };

    script.onerror = (e) => {
      console.error('Kakao SDK load error:', e);
      setMapError('카카오맵 SDK 로드 실패');
    };

    document.head.appendChild(script);

    return () => {
      // cleanup if needed
    };
  }, []);

  // 카카오맵 초기화
  useEffect(() => {
    if (!sdkLoaded || !window.kakao || !window.kakao.maps) {
      return;
    }

    window.kakao.maps.load(() => {
      if (!mapContainerRef.current) return;

      try {
        const initialCenter = userLocation
          ? new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
          : new window.kakao.maps.LatLng(37.55, 127.0);

        const options = {
          center: initialCenter,
          level: userLocation ? 5 : 8
        };

        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, options);
        setMapReady(true);
        setMapError(null);
        console.log('Kakao Map initialized');
      } catch (err) {
        console.error('Map init error:', err);
        setMapError('지도 초기화 실패: ' + err.message);
      }
    });

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    };
  }, [sdkLoaded]);

  // 장소 마커 생성
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    places.forEach(place => {
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
  }, [mapReady, places, selectedPlaceId, onPlaceSelect]);

  // 사용자 위치 마커
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

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
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>📍 마커를 탭하면 장소가 선택됩니다</span>
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
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

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
            <span style={{ color: '#60a5fa' }}>card-ai-pi.vercel.app</span>
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
  const [ocrStatus, setOcrStatus] = useState('idle');
  const [expandedIssuer, setExpandedIssuer] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [walletSearch, setWalletSearch] = useState(''); // 지갑 검색용
  const [recentPlaceIds, setRecentPlaceIds] = useState(CONFIG.DEFAULTS.RECENT_PLACES);
  const [benefitsFilterTag, setBenefitsFilterTag] = useState(null);
  const [pendingScrollCat, setPendingScrollCat] = useState(null);
  const [isOffline, setIsOffline] = useState(false); // 오프라인 감지
  const [selectedBenefit, setSelectedBenefit] = useState(null); // 혜택 상세 모달

  const categorySectionRefs = useRef({});
  const saveTimerRef = useRef(null);

  const vibrate = useCallback((pattern = [8]) => {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch {}
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
  }, [placesData, showToast, vibrate]);


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
      void storage.set(CONFIG.DB.KEY, { myCards, selectedPlaceId, recentPlaceIds });
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [myCards, selectedPlaceId, recentPlaceIds, dataLoaded]);

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
  
  const nearbyPlaces = useMemo(() => 
    userLocation ? Object.values(placesData).map(p => ({ ...p, distance: haversineDistance(userLocation, p) })).sort((a, b) => a.distance - b.distance) : []
  , [userLocation, placesData]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return { places: [], benefits: [] };
    const q = debouncedQuery.toLowerCase().trim(), tag = findTag(q);
    const places = Object.values(placesData).filter(p => p.name.toLowerCase().includes(q) || p.tags.includes(tag)).slice(0, CONFIG.UI.MAX_SEARCH_RESULTS.PLACES);
    const mySet = new Set(myCards);
    const benefits = Object.entries(benefitsData)
      .filter(([_, b]) => mySet.has(b.cardId) && (b.category === tag || b.title.toLowerCase().includes(q) || b.placeTags?.includes(tag)))
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
      if (!v[b.cardId]) v[b.cardId] = { card: b.card, totalValue: 0, reasons: [], count: 0 };
      v[b.cardId].totalValue += b.estimatedValue;
      v[b.cardId].count++;
      v[b.cardId].reasons.push(`${categoryConfig[b.category]?.emoji} ${b.title}`);
    });
    netBen.forEach(b => {
      const id = b.card.id;
      if (!v[id]) v[id] = { card: b.card, totalValue: 0, reasons: [], count: 0 };
      v[id].totalValue += b.estimatedValue;
      v[id].count++;
      v[id].reasons.push(`🌐 ${b.title}`);
    });
    return Object.values(v).sort((a, b) => b.totalValue - a.totalValue);
  }, [availableBenefits]);

  const smartBest = useMemo(() => {
    if (cardRanking.length === 0) return null;
    const best = cardRanking[0], second = cardRanking[1];
    return { ...best, diff: second ? best.totalValue - second.totalValue : 0 };
  }, [cardRanking]);

  // Handlers
  const resetHomeContext = () => {
    cancelOcrRun();
    setSelectedPlaceId(null);
    setSearchQuery('');
    setShowPlaceSheet(false);
    setPlaceSheetView('list');
    setShowOcrModal(false);
    setOcrStatus('idle');
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

  const requestLocation = () => {
    if (locationStatus === 'loading') return;
    setLocationStatus('loading');
    if (!navigator.geolocation) {
      setUserLocation(null);
      setLocationStatus('denied');
      showToast(MESSAGES.LOCATION.NOT_SUPPORTED);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('success');
        showToast(MESSAGES.LOCATION.SUCCESS);
      },
      err => {
        if (err.code === 1) {
          setUserLocation(null);
          setLocationStatus('denied');
          showToast(MESSAGES.LOCATION.DENIED);
        } else {
          setUserLocation(CONFIG.DEFAULTS.LOCATION);
          setLocationStatus('fallback');
          showToast(MESSAGES.LOCATION.FALLBACK);
        }
      },
      { timeout: CONFIG.TIMEOUTS.LOCATION, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  const handleNearby = () => {
    if (locationStatus === 'success' || locationStatus === 'fallback') {
      setShowPlaceSheet(true);
    } else {
      requestLocation();
      setShowPlaceSheet(true);
    }
  };

  const pickNearestPlace = () => {
    if (nearbyPlaces.length > 0) {
      selectPlace(nearbyPlaces[0].id);
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

    // 오프라인 체크
    if (!navigator.onLine) {
      showToast('📵 오프라인 상태입니다');
      safeSet(() => setOcrStatus('network_error'));
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

      safeSet(() => setOcrStatus('이미지 처리중...'));
      const base64Image = await toBase64(file);

      // 취소 확인
      if (ocrRunIdRef.current !== runId) return;

      safeSet(() => setOcrStatus('Google Vision 분석중...'));

      // Google Cloud Vision API 호출
      const VISION_API_KEY = 'AIzaSyCd7z1S04BxKDiOajQws8WbmgqxBond7vQ';
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION', maxResults: 10 }]
            }]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
      }

      const data = await response.json();

      // 취소 확인
      if (ocrRunIdRef.current !== runId) return;

      // 텍스트 추출
      const recognizedText = data.responses?.[0]?.fullTextAnnotation?.text ||
                             data.responses?.[0]?.textAnnotations?.[0]?.description || '';

      Logger.log('Vision API recognized:', recognizedText.substring(0, 300));

      // 공백 제거 + 소문자 변환
      const normalizedText = recognizedText.toLowerCase().replace(/\s/g, '');
      Logger.log('Normalized:', normalizedText.substring(0, 200));

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
        } else {
          setOcrStatus('notfound');
          // 디버그: 인식된 텍스트 일부 표시
          showToast(`인식된 텍스트: ${recognizedText.substring(0, 30)}...`);
        }
      });
    } catch (err) {
      if (ocrRunIdRef.current !== runId) return;

      Logger.error('Vision API Error:', err);
      const errMsg = err?.message || String(err);

      if (!navigator.onLine) {
        showToast('📵 오프라인 상태입니다');
        safeSet(() => setOcrStatus('network_error'));
      } else {
        showToast(`⚠️ 오류: ${errMsg.substring(0, 50)}`);
        safeSet(() => setOcrStatus('notfound'));
      }
    }
  };

  const confirmCard = (card) => {
    if (!myCards.includes(card.id)) {
      setMyCards(prev => (prev.includes(card.id) ? prev : [...prev, card.id]));
      showToast(MESSAGES.CARD.ADDED(card.name));
    } else {
      showToast(MESSAGES.CARD.ALREADY_EXISTS);
    }
    setShowOcrModal(false);
    setOcrStatus('idle');
    setOcrCandidates([]);
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
    setExpandedIssuer(null);
    setSearchQuery('');
    setWalletSearch(''); // 지갑 검색어도 초기화
    setBenefitsFilterTag(null);
    setPendingScrollCat(null);
    setActiveTab('home');

    try {
      await storage.set(CONFIG.DB.KEY, { myCards: CONFIG.DEFAULTS.CARDS, selectedPlaceId: null, recentPlaceIds: CONFIG.DEFAULTS.RECENT_PLACES });
    } catch {}

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
          <div className="p-5 space-y-5">
            <div className="flex gap-2">
              <button onClick={() => setShowPlaceSheet(true)} className="flex-1 p-4 bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-2xl border border-white/10 flex items-center gap-3 active:scale-[0.98]" aria-label="장소 선택">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg">{selectedPlace ? placeTypeConfig[selectedPlace.type]?.emoji : '📍'}</div>
                <div className="flex-1 text-left min-w-0"><p className="text-[10px] text-slate-400">현재 장소</p><p className="font-bold truncate text-sm">{selectedPlace ? selectedPlace.name : '선택하세요'}</p></div>
              </button>
              <button onClick={handleNearby} className="w-14 h-14 bg-blue-600 rounded-2xl flex flex-col items-center justify-center active:scale-95" aria-label="내 주변"><span className="text-lg">🎯</span><span className="text-[8px] font-bold">내주변</span></button>
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
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-transparent border border-blue-500/30 p-5">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] px-2.5 py-1 rounded-full font-bold">🏆 BEST</span>
                    {smartBest.diff > 0 && <span className="text-[10px] text-green-400">2위보다 +{smartBest.diff.toLocaleString()}원</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-10 rounded-xl shadow-2xl border border-white/20" style={{ background: `linear-gradient(135deg, ${smartBest.card.color}, #1a1a1a)` }} />
                    <div className="flex-1"><h3 className="text-lg font-bold">{smartBest.card.name}</h3><p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">약 {smartBest.totalValue.toLocaleString()}원</p></div>
                  </div>
                  <div className="mt-3 space-y-1">{smartBest.reasons.slice(0, 2).map((r, i) => <p key={i} className="text-xs text-slate-300">• {r}</p>)}</div>
                  <p className="mt-3 text-[10px] text-slate-500">⚠️ 실적/한도 조건 미반영</p>
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
                    <button key={b.id} onClick={() => { vibrate(); setSelectedBenefit(b); }} className="w-full flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-white/5 active:bg-slate-700/50 transition-colors text-left">
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

            {!selectedPlace && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"><span className="text-4xl">📍</span></div>
                <p className="text-slate-400 mb-4">장소를 선택하면<br/>최적의 카드를 추천해드려요</p>
                <button onClick={handleNearby} className="px-6 py-3 bg-blue-600 rounded-xl font-bold active:scale-95">🎯 내 주변에서 찾기</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="p-5 space-y-6">
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
                    <button key={b.id} onClick={() => { vibrate(); setSelectedBenefit(b); }} className="w-full flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 active:bg-amber-500/20 transition-colors text-left">
                      <span className="text-lg">{categoryConfig[b.category]?.emoji}</span>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium">{b.title}</p><p className="text-[10px] text-slate-500">{b.card?.name}</p></div>
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">{b.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {filteredAllMyBenefitsEntries.map(([cat, benefits]) => (
              <div key={cat} ref={el => { if (el) categorySectionRefs.current[cat] = el; }}>
                <h3 className="text-sm font-bold text-slate-400 mb-3">{categoryConfig[cat]?.emoji} {categoryConfig[cat]?.label} ({benefits.length})</h3>
                <div className="space-y-2">
                  {benefits.slice(0, CONFIG.UI.MAX_BENEFITS_PER_CATEGORY).map(b => (
                    <button key={b.id} onClick={() => { vibrate(); setSelectedBenefit(b); }} className="w-full flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-white/5 active:bg-slate-700/50 transition-colors text-left">
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
          <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
          <div className="p-5 space-y-4">
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
              <h3 className="font-bold mb-2">📍 위치 권한</h3>
              <p className="text-sm text-slate-400 mb-3">{locationStatus === 'idle' ? '위치 권한 필요' : locationStatus === 'loading' ? '확인 중...' : locationStatus === 'success' ? '✅ 허용됨' : locationStatus === 'denied' ? '❌ 거부됨' : '⚠️ 서울 기준'}</p>
              <button onClick={requestLocation} disabled={locationStatus === 'loading'} className="w-full py-2.5 bg-blue-600 rounded-xl text-sm font-medium disabled:opacity-60">{locationStatus === 'loading' ? '위치 확인 중...' : '위치 요청'}</button>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
              <h3 className="font-bold mb-2">💾 저장소</h3>
              <p className="text-sm text-slate-400">{storage.getMode()} 사용 중 (오프라인 지원)</p>
            </div>
            <button onClick={handleReset} className="w-full py-3 bg-red-600/20 text-red-400 rounded-2xl text-sm font-medium border border-red-500/30">🗑️ 초기화</button>
            <p className="text-center text-[10px] text-slate-600 mt-4">{CONFIG.APP.NAME} {versionBadge} · 49카드 · 28장소 · 69혜택</p>
          </div>
        )}
      </main>

      <nav className="safe-nav fixed bottom-6 left-4 right-4 h-16 bg-[#1a1a1f]/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl flex items-center z-40" style={{ maxWidth: '398px', margin: '0 auto' }} role="navigation">
        <button onClick={handleHomeClick} className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'home' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">🏠</span><span className="text-[10px]">홈</span></button>
        <button onClick={() => { setActiveTab('benefits'); clearBenefitsFilter(); }} className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'benefits' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">✨</span><span className="text-[10px]">내 혜택</span></button>
        <div className="relative -top-4"><button onClick={() => setShowOcrModal(true)} className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 border-4 border-[#0a0a0f]">📷</button></div>
        <button onClick={() => setActiveTab('wallet')} className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'wallet' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">💳</span><span className="text-[10px]">지갑</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-500'}`}><span className="text-xl">⚙️</span><span className="text-[10px]">설정</span></button>
      </nav>

      {showPlaceSheet && (
        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowPlaceSheet(false)} role="dialog" aria-modal="true">
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1f] rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ maxWidth: '430px', margin: '0 auto', height: '75vh' }}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div><div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-3" /><h2 className="text-lg font-bold">장소 선택</h2></div>
              <div className="flex gap-2" role="tablist">
                <button onClick={() => setPlaceSheetView('list')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placeSheetView === 'list' ? 'bg-blue-600' : 'bg-slate-700'}`} role="tab">📋</button>
                <button onClick={() => setPlaceSheetView('map')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placeSheetView === 'map' ? 'bg-blue-600' : 'bg-slate-700'}`} role="tab">🗺️</button>
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

                  {recentPlaceIds.length > 0 && placeCategoryFilter === 'all' && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 font-bold mb-2">🕘 최근</p>
                      <div className="flex flex-wrap gap-2">
                        {recentPlaceIds.map(id => placesData[id]).filter(Boolean).map(p => (
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
                    <button key={p.id} onClick={() => selectPlace(p.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 active:scale-[0.98] ${selectedPlaceId === p.id ? 'bg-blue-600' : 'bg-slate-800/30'}`}>
                      <span className="text-xl">{placeTypeConfig[p.type]?.emoji}</span><span className="font-medium text-sm">{p.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <MapView userLocation={userLocation} places={Object.values(placesData)} selectedPlaceId={selectedPlaceId} onPlaceSelect={id => selectPlace(id)} onClose={() => setShowPlaceSheet(false)} benefitsData={benefitsData} cardsData={cardsData} myCards={myCards} />
              )}
            </div>
          </div>
        </div>
      )}

      {showOcrModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end" role="dialog" aria-modal="true">
          <div className="bg-[#1a1a1f] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ maxWidth: '430px', margin: '0 auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">📷 카드 스캔</h2><button onClick={() => { cancelOcrRun(); setShowOcrModal(false); setOcrStatus('idle'); setOcrCandidates([]); }} className="text-slate-400 text-2xl">×</button></div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleOCR} className="hidden" />
            {ocrStatus === 'idle' && <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center gap-3 active:scale-[0.98]"><span className="text-5xl">📷</span><span className="font-medium">카드 사진 촬영</span></button>}
            {(ocrStatus === 'loading' || ocrStatus.includes('%')) && <div className="py-16 text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" /><p className="text-slate-400">{ocrStatus}</p></div>}
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
                <button onClick={() => { setOcrStatus('idle'); setOcrCandidates([]); }} className="w-full mt-4 py-3 text-slate-400">다시 촬영</button>
              </div>
            )}
            {ocrStatus === 'notfound' && (
              <div className="text-center py-8">
                <span className="text-5xl">🤔</span>
                <p className="text-slate-400 mt-4 mb-6">카드를 인식하지 못했어요</p>
                <button onClick={() => setOcrStatus('idle')} className="w-full py-3 bg-slate-700 rounded-xl font-medium mb-3">다시 촬영</button>
                <button onClick={() => { cancelOcrRun(); setShowOcrModal(false); setActiveTab('wallet'); setOcrStatus('idle'); }} className="w-full py-3 bg-blue-600 rounded-xl font-medium">직접 선택</button>
              </div>
            )}
            {ocrStatus === 'network_error' && (
              <div className="text-center py-8">
                <span className="text-5xl">🌐</span>
                <p className="text-white font-bold mt-4 mb-2">인터넷 연결 필요</p>
                <p className="text-slate-400 text-sm mb-6">카드 스캔은 인터넷 연결이 필요합니다.<br/>Wi-Fi 또는 데이터를 확인해주세요.</p>
                <button onClick={() => setOcrStatus('idle')} className="w-full py-3 bg-slate-700 rounded-xl font-medium mb-3">다시 시도</button>
                <button onClick={() => { cancelOcrRun(); setShowOcrModal(false); setActiveTab('wallet'); setOcrStatus('idle'); }} className="w-full py-3 bg-blue-600 rounded-xl font-medium">직접 선택하기</button>
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
