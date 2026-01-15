/**
 * 앱 전역 설정 (Configuration)
 */

export const CONFIG = {
  // 앱 정보
  APP: {
    VERSION: 'Final',
    NAME: 'Card AI',
    DEBUG: false,  // 프로덕션: 디버그 모드 비활성화
  },

  // 기본값
  DEFAULTS: {
    CARDS: [], // Empty by default for onboarding demo
    LOCATION: { lat: 37.5665, lng: 126.9780 }, // 서울시청
    RECENT_PLACES: [],
  },

  // 데모 모드 카드 (온보딩용)
  DEMO: {
    CARDS: ['hyundai-purple', 'samsung-taptap-o', 'shinhan-the-best'],
    PLACE: 'incheon-t2', // 인천공항 T2
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

  // 검색 동의어/별칭 (검색 품질 향상)
  SEARCH_SYNONYMS: {
    '세븐': ['세븐일레븐', '7eleven', 'seven'],
    '씨유': ['cu', 'CU'],
    'gs': ['gs25', 'GS25', 'gs편의점'],
    '이마트': ['emart', 'e마트', '이마트24'],
    'gs칼텍스': ['gscaltex', '칼텍스', 'caltex'],
    'sk': ['sk에너지', 'sk주유소', 'sk오일'],
    '에쓰오일': ['s-oil', 'soil', 'S-OIL'],
    '현대오일뱅크': ['현대오일', 'oilbank'],
    '스벅': ['스타벅스', 'starbucks'],
    '투썸': ['투썸플레이스', 'twosome'],
    '이디야': ['ediya'],
    '메가커피': ['메가', 'mega'],
    '인천공항': ['icn', 'incheon', '인천', 't1', 't2'],
    '김포공항': ['gimpo', '김포'],
    '신세계': ['shinsegae', '센텀', '신세계백화점'],
    '현백': ['현대백화점', '현대'],
    '롯백': ['롯데백화점', '롯데'],
    '메리어트': ['marriott', 'jw', 'jw메리어트'],
    '힐튼': ['hilton', '콘래드', 'conrad'],
    '발렛': ['valet', '발렛파킹'],
    '라운지': ['lounge', '공항라운지'],
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

  // 기능 킬스위치 (긴급시 기능 비활성화)
  FEATURES: {
    MAP_ENABLED: true,
    OCR_ENABLED: true,
    LOCATION_ENABLED: true,
  },

  // 링크 및 연락처
  LINKS: {
    PRIVACY_POLICY: 'https://cardai.app/privacy',
    TERMS_OF_SERVICE: 'https://cardai.app/terms',
    SUPPORT_EMAIL: 'support@cardai.app',
    FEEDBACK_EMAIL: 'feedback@cardai.app',
    DATA_REPORT_EMAIL: 'data@cardai.app',
  },

  // 빌드 정보
  BUILD: {
    VERSION: '1.0.0',
    BUILD_NUMBER: '1',
    COMMIT_HASH: import.meta.env.VITE_COMMIT_HASH || 'dev',
    BUILD_DATE: import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0],
  },
};

/**
 * 에러 메시지 (Messages)
 */
export const MESSAGES = {
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

/**
 * 조건부 로거 (Logger)
 */
export const Logger = {
  log: (...args) => CONFIG.APP.DEBUG && console.log('[CardAI]', ...args),
  warn: (...args) => CONFIG.APP.DEBUG && console.warn('[CardAI]', ...args),
  error: (...args) => console.error('[CardAI]', ...args),
  info: (...args) => CONFIG.APP.DEBUG && console.info('[CardAI]', ...args),
};
