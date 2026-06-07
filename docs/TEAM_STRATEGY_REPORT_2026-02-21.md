# Card AI 크로스펑셔널 팀 종합 전략 보고서

> 작성일: 2026-02-21
> 참여: 17명 크로스펑셔널 팀 (4개 토론 그룹)
> 상태: 전 그룹 합의 완료

---

## 목차

1. [팀 구성 및 토론 그룹](#1-팀-구성-및-토론-그룹)
2. [North Star Metric](#2-north-star-metric)
3. [전 그룹 공통 합의 사항](#3-전-그룹-공통-합의-사항)
4. [Group A: 제품/로드맵 합의안](#4-group-a-제품로드맵-합의안)
5. [Group B: UX/온보딩 합의안](#5-group-b-ux온보딩-합의안)
6. [Group C: 기술 아키텍처 합의안](#6-group-c-기술-아키텍처-합의안)
7. [Group D: GTM/마케팅 합의안](#7-group-d-gtm마케팅-합의안)
8. [통합 실행 로드맵](#8-통합-실행-로드맵)
9. [기술 스택 선정 결과](#9-기술-스택-선정-결과)
10. [비용 추정](#10-비용-추정)
11. [주요 이견 및 해소 기록](#11-주요-이견-및-해소-기록)
12. [부록: CRM 리텐션 타임라인](#12-부록-crm-리텐션-타임라인)

---

## 1. 팀 구성 및 토론 그룹

### 팀원 17명

| # | 역할 | 이름 | 그룹 |
|---|------|------|------|
| 1 | PM (핀테크) | pm | A (리드) |
| 2 | UI/UX 리드 디자이너 | ui-ux-lead | B |
| 3 | UX 리서처 | ux-researcher | B (리드) |
| 4 | 경쟁사 분석·전략 | strategist | A |
| 5 | 프론트엔드 엔지니어 | frontend-eng | B, C (리드) |
| 6 | 모바일 엔지니어 | mobile-eng | - |
| 7 | 백엔드/플랫폼 엔지니어 | backend-eng | C |
| 8 | ML/CV 엔지니어 | ml-eng | C |
| 9 | 데이터 엔지니어 | data-eng | C |
| 10 | QA/보안 엔지니어 | qa-security | C |
| 11 | 그로스 마케팅 리드 | growth-lead | A, D (리드) |
| 12 | 퍼포먼스 마케터 | performance-marketer | D |
| 13 | CRM·리텐션 마케터 | crm-marketer | B, D |
| 14 | ASO·콘텐츠 마케터 | aso-marketer | D |
| 15 | 제휴·비즈니스 개발 | bd-lead | A, D |
| 16 | DevOps/인프라 | devops-eng | C |
| 17 | i18n 전문가 | i18n-specialist | A (참고) |

### 4개 토론 그룹

| 그룹 | 주제 | 리드 | 상태 |
|------|------|------|------|
| A | 제품/로드맵 | pm | 합의 완료 |
| B | UX/온보딩 | ux-researcher | 합의 완료 |
| C | 기술 아키텍처 | frontend-eng | 합의 완료 |
| D | GTM/마케팅 | growth-lead | 합의 완료 |

---

## 2. North Star Metric

### WABV (Weekly Active Benefit Viewers)

> 주간 1회 이상 장소를 선택하고 1개 이상 혜택을 확인한 고유 유저 수

**선정 과정**:

| 제안자 | 제안 메트릭 | 채택 |
|--------|-----------|------|
| PM | Weekly Place Selections | 부분 (주간 주기) |
| strategist | Monthly Place-Benefit Lookups | 부분 (혜택 조회 포함) |
| growth-lead | Weekly Active Benefit Viewers | **최종 채택** |

**선정 이유**:
1. 고유 사용자 기준 (세션 아닌 유저) - 실제 활성 사용자 측정
2. 주간 주기 - 카드 혜택 조회의 자연스러운 사용 패턴 (주 1-2회)
3. 혜택 조회 = 핵심 가치 전달 순간
4. 이미 측정 가능 - `App.jsx`의 `PLACE_BENEFIT_COUNT` 이벤트 구현됨

**WABV 목표치**:

| 시기 | 목표 | 의미 |
|------|------|------|
| v1.1 후 1개월 | 100 | 초기 사용자 검증 |
| v1.5 후 | 500 | 성장 엔진 작동 |
| v2.0 후 | 2,000+ | 플랫폼 전환 준비 |

**보조 지표**: DAU/WAU 비율 (Stickiness), 카드 등록 전환율, 세션당 혜택 조회 수

---

## 3. 전 그룹 공통 합의 사항

| # | 합의 사항 | 합의 그룹 | 긴급도 |
|---|----------|----------|--------|
| 1 | CORS 취약점 수정 (origin 화이트리스트) | C | **핫픽스** |
| 2 | Tailwind CDN → PostCSS 빌드타임 전환 | B + C | **즉시** |
| 3 | 위치 권한 자동요청 제거 (just-in-time) | B (만장일치) | **즉시** |
| 4 | 분석 인프라 구축 (Firebase + Mixpanel) | A + C + D | **즉시** |
| 5 | ASO 한국어 메타데이터 최적화 | A + D | **즉시** |
| 6 | App.jsx 1,420줄 커스텀 훅 분리 | B + C | Sprint 1 |
| 7 | places.json 99.2% 축소 (5,420→140개, 2.58MB→21KB) | C | Sprint 1 |
| 8 | 마이데이터는 v2.0+ 이후 ("없어도 유용"이 현재 차별점) | A (전원) | 보류 |
| 9 | 첫 수익원 = CPA 어필리에이트 (카드고릴라) | A + D | v1.1 |
| 10 | 첫 카드사 파트너 = 현대카드 (MAU 1만+ 이후) | A | v2.0 |

---

## 4. Group A: 제품/로드맵 합의안

**리드**: pm | **참여**: strategist, growth-lead, bd-lead, i18n-specialist (참고)

### v1.1 "측정 가능한 제품" (0-12주)

| 주차 | 작업 | 담당 | 합의 근거 |
|------|------|------|-----------|
| Week 0-1 | **분석 인프라 구축** (flushEvents 실제 전송) | 개발 | growth-lead: "눈 감고 운전" 상태 해소 필수. 이벤트 타입은 이미 정의됨 |
| Week 1-6 | **혜택 데이터 확장** (222→500+) | 데이터 | "인기 장소 TOP 50의 혜택 커버리지 90%" 달성 (growth-lead 프레임, PM 수용) |
| Week 1-6 | **카드 데이터 확장** (141→200+) | 데이터 | 미매핑 43개 중 대중 카드 우선 |
| Week 2-4 | **카드고릴라 어필리에이트 삽입** | BD+개발 | "조용히" 추가 - 수익 구조 검증 + 전환 데이터 수집 |
| Week 1-6 | **더쎈카드 이탈 사용자 흡수** | 마케팅 | ASO + 커뮤니티 시딩. 종료 후 1-2주 골든타임 |
| Week 4-8 | **서버사이드 Push 알림** | 백엔드 | Geofencing 대신 (iOS 심사 리스크 없음) |

### v1.5 "성장 엔진" (12-24주)

| 작업 | 합의 근거 |
|------|-----------|
| **잔여 혜택 한도 수동 추적** | strategist 제안. 마이데이터 없이 리텐션 핵심 |
| **월별 혜택 사용 리포트** | PM 제안. "이번 달 받은 혜택 추정 OO만원" |
| **크라우드소싱 데이터 루프** | growth-lead. ReportModal을 "데이터 엔진"으로 진화 |
| **Geofencing 위치 기반 알림** | strategist v1.1 제안 → v1.5 이동 합의 |
| **프리미엄 구독** (부가 기능 모델) | bd-lead. 핵심 무료 유지, 부가만 유료 |

### v2.0 "플랫폼" (24주+)

| 작업 | 비고 |
|------|------|
| **카드사 직접 CPA** (현대카드 1순위) | MAU 1만+ 이후 |
| **카드 추천 기능** | CPA 수익화와 자연 연결 |
| **선택적 마이데이터 연동** | 규제 인허가 6-12개월 |
| **해외 확장** (일본 우선) | 지도 SDK 전환 5-6주, 데이터 수집 8-12주 |

### 4단계 수익 모델

| 단계 | 시점 | 모델 | 예상 매출 | 조건 |
|------|------|------|----------|------|
| 1 | v1.1 즉시 | 카드고릴라 어필리에이트 | 월 10-30만원 | 설정 1-2주 |
| 2 | v1.5 (MAU 5K+) | 프리미엄 구독 | 월 50-200만원 | v1.5 기능 필요 |
| 3 | v2.0 (MAU 1만+) | 카드사 직접 CPA | 월 300-500만원 | BD 영업 필요 |
| 4 | v3.0 (MAU 5만+) | API 플랫폼 B2B + 가맹점 광고 | 월 1000만원+ | v2.0 인프라 |

### 더쎈카드 철수 기회 (전원: "가장 중요한 단기 기회")

| 우선순위 | 채널 | 액션 | 담당 |
|---------|------|------|------|
| P0 | ASO | "더쎈카드 대안" 키워드 최적화 | 마케팅 |
| P0 | 커뮤니티 | 뽐뿌/클리앙/DC "더쎈카드 종료 후 대안" 글 | 성장 |
| P1 | 블로그 SEO | "더쎈카드 대안 앱 추천" 콘텐츠 | 마케팅 |
| P1 | Apple Search Ads | "더쎈카드" 키워드 입찰 (경쟁 없어 CPI 낮음) | 퍼포먼스 |
| P1 | 기능 패리티 | 더쎈카드 핵심 기능 벤치마킹 후 긴급 개발 | 개발 |
| P2 | 카드사 접촉 | 더쎈카드 제휴 카드사에 대안 채널 제안 | BD |

**strategist 경고**: 토스가 이 시장에 진입할 수 있음. 더쎈카드 공백 기간(3-6개월)이 우리의 윈도우. 데이터 해자(moat) 구축 필수.

---

## 5. Group B: UX/온보딩 합의안

**리드**: ux-researcher | **참여**: ui-ux-lead, crm-marketer, frontend-eng

### Topic 1: 온보딩 플로우 재설계

**합의: 3단계 가치 우선 온보딩**

| Step | 내용 | 디자인 (ui-ux-lead) | CRM 목표 (crm-marketer) | 난이도 (frontend-eng) |
|------|------|---------------------|------------------------|---------------------|
| 1. Value | 앱 가치 보여주기 | 단일 비주얼, 원스와이프 | 요청 전 가치 시연 | Low |
| 2. Card Add | OCR 스캔 / 수동 / "먼저 둘러볼게요" (데모) | 시각적 가중치 계층 | 데모→실제 전환 CTA | Medium (2-3일) |
| 3. Place | 카드 등록 직후 장소 선택 | 지도/근처 UI | 온보딩 체크리스트 (4단계) | Low |

**주요 추가 의견**:
- crm-marketer: `exitDemo`가 카드를 0으로 리셋함. "데모에서 본 카드를 등록할까요?" 전환 브릿지 필요
- frontend-eng: 데모 자동시작은 저난이도 (기존 `startDemo`/`exitDemo` + `CONFIG.DEMO` 활용)
- frontend-eng: App.jsx 리팩토링이 먼저 (1,420줄에 더 많은 기능 추가는 위험)

### Topic 2: 위치 권한 타이밍

**합의: 만장일치 — just-in-time 지연**

| 현재 | 제안 |
|------|------|
| `dataLoaded`에서 자동 요청 (App.jsx:589-596) | "내 주변" 탭 시에만 요청 |
| 가치 이해 전 권한 대화상자 | 사용자가 컨텍스트 이해 후 요청 |
| 예상 60-70% 거부율 | +15-20% 허용률 개선 |

- ui-ux-lead: 사전 권한 화면 추가 ("주변 장소를 찾기 위해 위치 정보가 필요해요") → 재사용 가능 PermissionRequest 컴포넌트
- frontend-eng: 구현 간단 — 자동 요청 `useEffect` 제거만 하면 됨. `handleNearby`가 이미 온디맨드 처리

**구현**: Sprint 1 퀵윈. ~30분.

### Topic 3: 리텐션 훅 우선순위

| 순위 | 훅 | 임팩트 | 난이도 | 챔피언 |
|------|-----|--------|--------|--------|
| 1 | **즐겨찾기/최근 장소 HomeTab 노출** | HIGH | LOW | crm + ui-ux |
| 2 | **주간 절약 추정 HomeTab 헤더** | HIGH | LOW | ui-ux |
| 3 | 온보딩 완료 체크리스트 (4단계) | HIGH | MEDIUM | crm |
| 4 | "이 혜택 유용했나요?" 피드백 버튼 | MEDIUM | LOW | ux-researcher |
| 5 | 혜택 만료 알림 (D-7 배지) | HIGH | MEDIUM | ui-ux |
| 6 | Push 알림 (재참여) | HIGH | XL | crm |
| 7 | 스트릭/게임화 | MEDIUM | HIGH | v2 보류 |

**#1 채택 이유**:
- crm-marketer: "가장 큰 문제는 재방문 동기가 없다"
- 데이터 이미 존재 (`recentPlaceIds`, `favoritePlaceIds`) but HomeTab에 미노출
- frontend-eng: 프론트엔드 전용 변경, 데이터 준비 완료

**Push 알림**: 인프라 XL 규모 (Capacitor Push + 서버 스케줄러 + APNS/FCM). 별도 이니셔티브로 분리.

### Topic 4: 디자인 시스템 마이그레이션 순서

**Phase 0 (기반) — 다른 모든 것의 선행 조건**:
- Tailwind CDN → PostCSS (1일)
- App.jsx 커스텀 훅 리팩토링 (1-2일)

**Phase 1 (퀵윈) — CDN 상태에서도 즉시 적용 가능**:
- text-[10px] → text-[11px] 최소 크기 (40+ 인스턴스, 30분)
- 색상 대비 수정 slate-500/600 → slate-400 min (~15곳, 15분)
- 터치 타겟 감사 min-h-[44px] (1시간)

**Phase 2 (단기) — Tailwind 마이그레이션 후**:
- App.jsx 인라인 `<style>` 추출 (1시간)
- CSS 커스텀 프로퍼티 (디자인 토큰) (1일)
- Emoji → Lucide SVG 아이콘 (~30개, 2-3일)

**Phase 3 (장기) — v2 범위**:
- 공유 컴포넌트 프리미티브 (Button, Card, Badge, ListItem)
- 라이트 모드, 모션 디자인 시스템, 접근성 감사

**합의된 순서**: Phase 1 퀵윈 즉시 → Phase 0 기반 → Phase 2+

### Group B 스프린트 계획

| Sprint | 초점 | 기간 | 주요 산출물 |
|--------|------|------|-----------|
| Sprint 1 | 퀵윈 | 1-2일 | 글자 크기, 대비, 터치타겟, 위치권한 지연 |
| Sprint 0 | 기반 | 2-3일 | Tailwind PostCSS, App.jsx 훅 분리 |
| Sprint 2 | 온보딩 | 2-3일 | 데모 자동시작, 인기 카드, 사전권한 화면 |
| Sprint 3 | 리텐션 | 2-3일 | 즐겨찾기/최근 HomeTab, 주간 절약 추정 |
| Sprint 4 | 디자인 | 3-5일 | 디자인 토큰, Lucide 아이콘, 인라인 스타일 추출 |

---

## 6. Group C: 기술 아키텍처 합의안

**리드**: frontend-eng | **참여**: backend-eng, ml-eng, data-eng, devops-eng, qa-security

### Topic 1: Tailwind CDN → PostCSS 전환

**합의: 3단계 순차 적용**

| 순서 | 작업 | 예상 효과 | 난이도 |
|------|------|-----------|--------|
| Step 1 | Tailwind CDN → PostCSS 빌드 전환 | -300KB+ 런타임 JS, purged CSS 10-30KB | 1-2시간 |
| Step 2 | places.json 번들 분리 | -2.48MB 번들 사이즈 | 2-3시간 |
| Step 3 | React.lazy() 코드 스플리팅 | 초기 로드 속도 개선 | 1-2시간 |

**근거**: Play CDN은 프로덕션용 아님. 런타임 파싱 300KB+, CDN 장애=SPOF.

### Topic 2: App.jsx 분리 전략

**합의: 커스텀 훅 우선, Zustand 후속**

**Phase 1 커스텀 훅 설계**:
- `useOcr()`: OCR/Vision 전체 로직 (~400줄)
- `useCardData()`: 데이터 로딩, cardsData/placesData/benefitsData 상태
- `useLocation()`: geolocation 상태, requestLocation
- `useSearch()`: searchQuery, debouncedQuery, searchResults
- `usePersistence()`: save/load 디바운스 로직

**Context API 부적합 이유**: 30+ 상태 슬라이스 → Provider 지옥 + 선택적 재렌더링 불가

### Topic 3: places.json 최적화 (data-eng 분석 반영 업데이트)

**합의: curated only (99.2% 축소)**

| 카테고리 | 수량 | 사이즈 | 조치 |
|---------|------|--------|------|
| cafe | 4,532 (83.6%) | ~1.5MB | **삭제** - Kakao API 동적 로딩 이미 구현됨 |
| mart | 748 (13.8%) | ~250KB | **삭제** - Kakao API 동적 로딩 이미 구현됨 |
| curated | 140 (2.6%) | ~21KB | **유지** - 파트너/브랜드 장소 |

**결과**: 2.58MB → 21KB, 기능 손실 없음

**구현**:
1. `places.json` → `places-curated.json` (140개만)
2. `data-service.js`: 정적 import → curated만 로드
3. PlaceSheet 카테고리별 Kakao API 검색 트리거 연동

**미사용 JSON 파일 2개 발견** (번들에 포함 시 제거 필요):
- `korean-card-partner-places.json` (44KB)
- `korean-credit-cards.json` (35KB)

### Topic 4: OCR 파이프라인 개선

**Sprint 1 (즉시, 코드 변경만)**:

| 우선순위 | 항목 | 변경량 | 효과 |
|----------|------|--------|------|
| P0 | 1차 OCR에서 logos 전달 | 1줄 | 2차 API 호출 감소 → 비용 절감 |
| P0 | 최소 점수 임계값 4 도입 | 1줄 | false positive 대폭 감소 |
| P1 | `_processTwoStepOcr` 통합 | ~80줄 제거 | 중복 제거, 버그 방지 |
| P1 | 콘솔 로깅 보안 수정 (App.jsx:1061) | 5줄 | 민감정보 노출 방지 |
| P1 | compressImage maxSize 1920→1600 통일 | 1줄 | 웹/네이티브 일관성 |

**데이터 검증 완료**:
- 모든 issuer 4자 이상 → 임계값 4 안전
- generic ocrKeywords 5개 ("point","every","all","club","top") → 임계값 4로 차단
- 2자 keywords 20개 → 이미 3자 필터로 무시됨

**Sprint 2 (중기)**:
- 클라이언트 이미지 전처리 (대비 보정, Canvas API)
- 카드 색상 기반 보조 필터링
- 카드 촬영 가이드 오버레이 (1.586:1 비율)
- `ocrNegativeKeywords` 필드 추가
- `ocrIssuerPatterns` 분리

**비용 영향**:
- 1차만 성공: ~$3/1000건, 1차+2차: ~$11/1000건
- logos 전달 + 전처리로 2차 호출 50%+ 감소 예상

### Topic 5: API 보안 (CRITICAL)

#### P0 - CORS 취약점 (핫픽스)

4개 API 파일 모두 `origin.endsWith('.vercel.app')` 사용 → **모든 `*.vercel.app` 사이트에서 API 호출 가능**

**수정**: 정확한 origin 매칭으로 교체
```js
const ALLOWED = new Set([
  'https://card-ai-pi.vercel.app',
  'https://card-ai.vercel.app',
  'capacitor://localhost',
  'http://localhost:5173',
]);
```

#### P0 - Rate Limiter 무효 (Sprint 1)

인메모리 `Map()` → Vercel cold start마다 리셋. `api/kakao-places.js`는 rate limiter 없음.

**수정**: Upstash Redis (`@upstash/ratelimit`)

#### P1 - vercel.json 보안 헤더 누락

보안 헤더 미설정. 추가 필요:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`

#### P1 - 공유 CORS 미들웨어

4개 API 파일에 ~60줄 중복 CORS/rate-limit 코드 + 불일치. `api/lib/cors.js`로 추출 필요.

#### P2 - 에러 메시지 노출

`api/kakao-places.js`, `api/report.js`에서 `error.message` 직접 반환. `api/identify.js`만 올바르게 처리.

### Group C 스프린트 로드맵

```
Sprint 0 (핫픽스): CORS 정확 매칭 (4개 API)

Sprint 1 (1-2주):
├── Tailwind CDN → PostCSS 전환
├── places.json → places-curated.json (140개, 21KB)
├── OCR P0: logos 전달, 임계값 4, compressImage 1600 통일
├── 콘솔 로깅 보안 수정
├── 미사용 JSON 파일 제거
├── Upstash Rate Limit 도입
├── vercel.json 보안 헤더
└── 디지털뱅크 체크카드 데이터 수집 시작

Sprint 2 (2-4주):
├── App.jsx 커스텀 훅 추출 + _processTwoStepOcr 통합
├── React.lazy() 코드 스플리팅
├── PlaceSheet 동적 검색 연동
├── 공유 CORS 미들웨어
├── 클라이언트 이미지 전처리
├── OCR 데이터 구조 개선 (negativeKeywords, issuerPatterns)
└── P1 카드 혜택 데이터 추가 (~20장)

Sprint 3 (4-6주):
├── Zustand 도입 (optional)
├── TypeScript 마이그레이션 시작
├── 단위 테스트 (BenefitsEngine, OCR 매칭)
├── JSON Schema CI 검증
└── 카드 색상 기반 보조 필터링
```

### 43 Missing Cards 우선순위 (data-eng 분석)

| 우선순위 | 카드 | 이유 |
|----------|------|------|
| P1 | kakaobank-check, tossbank-check, kbank-check | 2030대 게이트웨이 카드 |
| P1 | citi-prestige, kb-noblesse | 프리미엄 혜택 |
| P1 | samsung-costco/emart/ssg | 쇼핑 중심 사용자 |
| P2 | 지역은행 카드 (DGB, BNK 등) | 낮은 사용자 수 |

---

## 7. Group D: GTM/마케팅 합의안

**리드**: growth-lead | **참여**: performance-marketer, aso-marketer, crm-marketer, bd-lead

### 첫 1,000명 유저 확보 전략

**Phase 0 - 즉시 실행 (Week 0-1, 비용 0원)**:
- iOS 앱 이름 → "Card AI - 신용카드 혜택 추천"
- 부제 → "공항라운지/호텔/카페 카드혜택 비교"
- 키워드 필드 100자 재최적화

**핵심 인사이트 (ASO)**: "Card AI"는 영어 전용이라 한국어 검색에서 노출 안 됨. 한국 유저 90%가 한국어로 검색.

**키워드 필드 개선안**:
- 변경 전: `신용카드,카드혜택,공항라운지,발렛파킹,호텔할인,카드추천,카드지갑,혜택비교,현대카드,삼성카드`
- 변경 후: `카드추천,카드비교,공항라운지,발렛파킹,호텔할인,카페할인,마일리지,카드랭킹,혜택조회,카드관리`
- (앱 이름 포함 단어는 iOS 자동 인덱싱 → 키워드 필드에서 제거 → 100자 효율 극대화)

**Phase 1 - 커뮤니티 (Week 1-4, 0원)**:
- 뽐뿌/클리앙/DC 혜택 정리글 5-10개
- 더쎈카드 이탈 흡수 콘텐츠
- 카카오톡 오픈채팅 "프리미엄 카드 혜택 공유방"
- 네이버 블로그 SEO
- 목표: 300-500명

**Phase 2 - 유료 마케팅 (Week 4+, 월 50-100만원)**:
- 전제: 분석 인프라 구축 완료 후에만 시작 (CPI/ROAS 측정 불가 시 예산 낭비)
- 목표: 누적 1,000명

### 마케팅 예산 배분 (월 100만원 기준, 최종 수정안)

| 채널 | 비중 | 금액 | 근거 |
|------|------|------|------|
| Apple Search Ads | 40% | 40만원 | 최고 전환 의도, 금융 카테고리 CVR 3-5배 |
| 네이버 검색광고 | 30% | 30만원 | "신용카드 혜택 비교" 월 검색 1만+, PWA 랜딩→앱 전환 |
| 카카오 모먼트 | 20% | 20만원 | 카카오맵 SDK 시너지, CPI 2,000-4,000원 |
| Meta | 10% | 10만원 | 크리에이티브 A/B 테스트 목적 |

### CPA 벤치마크 목표

| 지표 | 목표 | 손절 기준 |
|------|------|----------|
| CPI (iOS) | 3,000-5,000원 | > 8,000원 즉시 중단 |
| CPI (Android) | 2,000-3,500원 | > 6,000원 |
| CPA (카드 등록) | 5,000-10,000원 | > 15,000원 재검토 |
| 설치→카드등록 CVR | 30-40% | < 20% |
| D1 리텐션 | 25-35% | < 15% |
| D7 리텐션 | 12-18% | < 8% |
| CPAU (활성 유저당) | 10,000-15,000원 | - |

### MMP 선정: Airbridge

| 평가 항목 | Airbridge | AppsFlyer | Adjust |
|-----------|-----------|-----------|--------|
| 한국 매체 연동 | 우수 | 보통 | 보통 |
| 초기 비용 | 무료 플랜 | 높음 | 높음 |
| 한국어 지원 | 완벽 (한국 회사) | 제한적 | 제한적 |
| **최종** | **선택** | Phase 3+ | 보류 |

### 분석 도구: Firebase + Mixpanel 2-Layer

| 레이어 | 도구 | 용도 | 비용 |
|--------|------|------|------|
| 인프라 | Firebase Analytics | DAU/세션, 원격 설정, A/B, FCM | 무료 |
| 그로스 | Mixpanel Free | 퍼널, 코호트 리텐션, 세그먼트 | 무료 (월 20M) |

### ASO 상세 전략

**즉시 실행**:

| 항목 | 소요 | 임팩트 |
|------|------|--------|
| 앱 이름 변경 | 5분 | 매우 높음 |
| 부제 변경 | 5분 | 높음 |
| 키워드 필드 최적화 | 10분 | 높음 |
| 앱 설명 전면 개선 | 30분 | 중간 |
| 프로모션 텍스트 시즌 반영 | 5분 | 중간 |

**비주얼 에셋 (2주 내)**:
- iOS 스크린샷 5-7장 (한글 카피)
- Google Play 특성 그래픽 1024x500
- 앱 미리보기 영상 15-25초 (전환율 +25-30%)

**인앱 리뷰 요청**:
- SKStoreReviewController / In-App Review API
- 트리거: 카드 3장+ 등록 또는 혜택 조회 5회+
- 기존 이벤트(`WALLET_ADD`, `BENEFIT_OPEN`) 활용

### 제휴 마케팅 단계

| 단계 | 시기 | 유형 | 대상 |
|------|------|------|------|
| Phase 1 | 현재~Week 8 | 데이터 검증 파트너 | 호텔/라운지 |
| Phase 2 | MAU 1K+ | 콘텐츠 제휴 | 카드/재테크 미디어 |
| Phase 3 | MAU 5K+ | CPA 제휴 | 카드사 |
| Phase 4 | MAU 1만+ | 전략적 제휴 | 카드사 공식 데이터 |

### Android 출시 타이밍

**합의: iOS 먼저 최적화 → Android 4-6주 후 출시**

1. 현재 ~ +2주: iOS ASO + 분석 인프라
2. +2주 ~ +4주: iOS 커뮤니티 시딩 + 데이터 수집
3. +4주 ~ +6주: Android 프로덕션 출시
4. +6주~: 양대 플랫폼 유료 마케팅

### 개발팀 요청사항

| 작업 | 우선순위 | 소요 |
|------|---------|------|
| flushEvents() → Firebase + Mixpanel 전송 | 즉시 | 1일 |
| 인앱 리뷰 요청 (SKStoreReviewController) | P1 | 반일 |
| OG 태그 추가 (index.html) | P1 | 15분 |
| 공유 기능 (navigator.share) | P1 | 반일 |
| Airbridge SDK 연동 | 즉시 | 1-2일 |
| Meta Pixel PWA 설치 | 즉시 | 반일 |
| 딥링크 설정 (PWA → 앱스토어 스마트 배너) | 1주 내 | 반일 |

### Group D 전체 타임라인

```
Week 0-1: ASO 최적화 + Firebase/Mixpanel/Airbridge 셋업
Week 1-4: 커뮤니티 시딩 + 콘텐츠 제작 + 스크린샷 (목표: 300-500명)
Week 4-6: Android 출시 + 유료 마케팅 시작 (목표: 800명)
Week 6-8: 양대 플랫폼 스케일업 (목표: 1,000명)
Week 8+: 데이터 기반 카드사 접근 + CPA 테스트
```

---

## 8. 통합 실행 로드맵

### Sprint 0: 핫픽스 (즉시, 1-2시간)

| # | 작업 | 출처 |
|---|------|------|
| 1 | CORS 정확 매칭 수정 (4개 API) | C |
| 2 | vercel.json 보안 헤더 추가 | C |

### Week 0: 즉시 실행 (비용 0원, 3-4시간)

| # | 작업 | 출처 | 시간 |
|---|------|------|------|
| 1 | iOS 앱 이름 → "Card AI - 신용카드 혜택 추천" | D | 5분 |
| 2 | iOS 부제 → "공항라운지/호텔/카페 카드혜택 비교" | D | 5분 |
| 3 | iOS 키워드 필드 재최적화 | D | 10분 |
| 4 | 위치 권한 자동요청 제거 (App.jsx:589-596) | B | 30분 |
| 5 | text-[10px] → text-[11px] 최소 글자 크기 | B | 30분 |
| 6 | 색상 대비 수정 (slate-500 → slate-400 min) | B | 15분 |
| 7 | 터치 타겟 44px 미만 수정 | B | 1시간 |
| 8 | OG 태그 추가 (index.html) | D | 15분 |
| 9 | 미사용 JSON 2개 제거 | C | 15분 |

### Sprint 1 (Week 1-2): 기반 구축

| # | 작업 | 출처 | 시간 |
|---|------|------|------|
| 1 | Tailwind CDN → PostCSS/Vite 전환 | B+C | 1-2시간 |
| 2 | places.json → places-curated.json (21KB) | C | 2-3시간 |
| 3 | App.jsx → 커스텀 훅 5개 분리 | B+C | 1-2일 |
| 4 | Firebase + Mixpanel 연동 (flushEvents) | A+D | 1일 |
| 5 | Airbridge MMP 설정 | D | 1일 |
| 6 | OCR 즉시 수정 3건 | C | 2시간 |
| 7 | `_processTwoStepOcr` 중복 제거 | C | 반일 |
| 8 | Upstash Redis Rate Limit 도입 | C | 1일 |
| 9 | 콘솔 로깅 보안 수정 | C | 30분 |
| 10 | 공유 CORS 미들웨어 추출 | C | 반일 |

### Sprint 2 (Week 3-4): UX + 성장

| # | 작업 | 출처 |
|---|------|------|
| 1 | 가치 우선 온보딩 3단계 | B |
| 2 | 즐겨찾기/최근 장소 HomeTab 노출 | B |
| 3 | 주간 절약 추정 HomeTab 헤더 | B |
| 4 | 인앱 리뷰 요청 | D |
| 5 | 공유 기능 (navigator.share) | D |
| 6 | React.lazy() 코드 스플리팅 | C |
| 7 | CORS 화이트리스트 설정 | C |
| 8 | 커뮤니티 시딩 시작 | D |
| 9 | 앱스토어 스크린샷 제작 | D |
| 10 | 카드고릴라 어필리에이트 "조용히" 삽입 | A |
| 11 | P1 카드 혜택 데이터 추가 (~20장) | C |

### Sprint 3 (Week 5-8): 성장 엔진

| # | 작업 | 출처 |
|---|------|------|
| 1 | Android 프로덕션 출시 | D |
| 2 | Apple Search Ads 시작 (월 50만원) | D |
| 3 | 디자인 토큰 + Lucide 아이콘 전환 | B |
| 4 | CRM 리텐션 시나리오 | B |
| 5 | 클라이언트 이미지 전처리 | C |
| 6 | OCR 데이터 구조 개선 | C |
| 7 | JSON Schema CI 검증 | C |

### v1.5 (Week 12-24): 리텐션

| # | 작업 | 출처 |
|---|------|------|
| 1 | 잔여 혜택 한도 수동 추적 | A |
| 2 | 월별 혜택 사용 리포트 | A |
| 3 | 크라우드소싱 데이터 루프 | A |
| 4 | Geofencing 위치 기반 알림 | A |
| 5 | 프리미엄 구독 (부가 기능) | A |
| 6 | 푸시 알림 인프라 | B |

### v2.0 (Week 24+): 플랫폼

| # | 작업 | 출처 |
|---|------|------|
| 1 | 현대카드 직접 CPA 제휴 | A |
| 2 | 카드 추천 기능 | A |
| 3 | 마이데이터 연동 (선택적) | A |
| 4 | TypeScript 전환 | C |
| 5 | 해외 확장 검토 (일본 우선) | A |

---

## 9. 기술 스택 선정 결과

| 영역 | 선정 | 대안 (보류) | 비용 |
|------|------|------------|------|
| 상태관리 | 커스텀 훅 → Zustand | Context API | 0원 |
| Rate Limit | Upstash Redis | Vercel KV, 인메모리 | 무료 |
| MMP | Airbridge | AppsFlyer, Adjust | 무료 |
| 분석 | Firebase + Mixpanel | PostHog | 무료 |
| 번들 최적화 | curated only (99.2% 축소) | lazy fetch, API화 | 0원 |
| CSS | Tailwind PostCSS (빌드타임) | CDN (현재) | 0원 |
| 푸시 알림 | FCM (Firebase) | OneSignal | 무료 |

---

## 10. 비용 추정

### 월간 비용

| 기간 | 인프라 | 마케팅 | 합계 |
|------|--------|--------|------|
| Sprint 0-2 (Week 0-4) | 0원 | 0원 | **0원** |
| Sprint 3+ (Week 5-8) | 0원 | ~100만원 | **~100만원** |
| v1.5 (Week 12+) | ~5만원 | ~150만원 | **~155만원** |

### 수익 전망

| 시점 | 수익원 | 예상 월 수익 |
|------|--------|------------|
| v1.1 | 카드고릴라 CPA | 10-30만원 |
| v1.5 (MAU 5K+) | + 프리미엄 구독 | 60-230만원 |
| v2.0 (MAU 1만+) | + 카드사 직접 CPA | 360-730만원 |

---

## 11. 주요 이견 및 해소 기록

| 주제 | 이견 | 해소 |
|------|------|------|
| Geofencing 시기 | strategist: v1.1 / PM: v1.5 | **v1.5** (iOS 심사 리스크, 배터리, 데이터 갭) |
| 수익 시작 시기 | growth-lead: WAU 1K+ 후 / bd-lead: 즉시 | **즉시 but 조용히** (링크만, 프로모션 없음) |
| NSM 주기 | strategist: 월간 / PM+growth-lead: 주간 | **주간** (월간은 피드백 루프 느림) |
| 데이터 확장 방향 | PM: 카드 중심 / growth-lead: 장소 중심 | **장소 중심** (Top 50 장소 90% 커버리지) |
| 마케팅 예산 배분 | 기존: 콘텐츠 40% / 수정: 퍼포먼스 90% | **퍼포먼스 집중** (CPA 벤치마크 우선 확보) |
| 게이미피케이션 | 일부 검토 / crm-marketer 반대 | **보류** (카드 혜택은 상황적 사용, 스트릭은 역효과) |

---

## 12. 부록: CRM 리텐션 타임라인

| Day | 트리거 | 채널 | 콘텐츠 |
|-----|--------|------|--------|
| 0 | 온보딩 완료 | 인앱 | 축하 메시지 |
| 1 | 첫 재방문 | 인앱 배너 | "즐겨찾기에 자주 가는 장소를 추가해보세요" |
| 3 | 미접속 | 푸시 | "등록한 카드로 받을 수 있는 혜택이 있어요" |
| 7 | 주간 | 푸시 | "이번 주 활용 가능했던 혜택 X개" |
| 14 | 미접속 | 푸시 | "새로운 혜택이 추가되었어요" |
| 30 | 월간 | 푸시 | "이번 달 놓친 혜택 추정 XX만원" |

### CRM 추가 인사이트
- Push ROI는 재참여에 가장 높으나 2-4주 인프라 작업 필요 → 별도 이니셔티브
- 위치 권한 지연 시 영구 거부 35% → 15%로 감소 예상 → 미래 위치 기반 푸시 유저 풀 보존
- 게이미피케이션 비추천: 카드 혜택 앱은 상황적 사용 (구매 전), 일상 습관 아님. 스트릭은 이탈 증가 우려
- 아이콘 전략: 앱 내부는 브랜드 아이콘 (금융앱 신뢰감), 푸시/토스트는 이모지 (높은 CTR)

---

## 13. 부록: 보충 자료 모음

### 13-1. Group A 보충: 어필리에이트 링크 UX 설계 (bd-lead)

**1순위: 혜택 상세 모달 내 "이 카드 알아보기" 버튼**

- **위치**: BenefitDetailModal 하단
- **텍스트**: "이 카드 알아보기" ("발급하기"보다 부담 적어 CTR 향상)
- **조건**: 미보유 카드에만 노출 (사용자 등록 카드 기준 필터링)
- **법적 요건**: (광고) 또는 (제휴) 표시 필수 (금융소비자보호법)
- **예상 CTR**: 5-8%
- **2단계**: 데이터 축적 후 지갑 탭 미보유 카드 섹션에도 추가 (예상 CTR: 2-3%)

### 13-2. Group A 보충: CPA 데이터 기반 의사결정 기준 (growth-lead)

- **별도 이벤트**: `CPA_LINK_CLICK`으로 추적 (Mixpanel 연동)
- **측정 지표**: 혜택 조회 대비 CPA 링크 클릭률(CTR)
- **의사결정 기준**: CTR 3% 초과 시 "사용자가 원하는 기능" → 노출 확대 (지갑 탭 등)
- **시작 시점**: Mixpanel 연동과 동시에 Day 1부터 수집

### 13-3. Group B 보충: 구현 세부 사항 (frontend-eng 코드 검증)

**기술 발견 사항**:

1. **Auto-demo에 `hasSeenOnboarding` 스토리지 플래그 필요**: 없으면 `exitDemo`가 카드를 `[]`로 리셋 → 다음 방문 시 데모 재시작 → 무한 루프
2. **위치 권한 지연은 XS 난이도**: App.jsx:588-596의 `useEffect` 블록 삭제만 하면 됨. `handleNearby`가 독립적으로 온디맨드 처리
3. **즐겨찾기 HomeTab 노출은 S 난이도 (~40-60줄 JSX)**: 데이터 + 토글 로직 전부 존재. 렌더링만 추가
4. **이모지 마이그레이션은 예상보다 큼**: 120+ 인스턴스, 15+ 파일. MapView 캔버스(`buildEmojiMarkerDataUrl`)가 가장 어려운 포인트 — `fillText()` → `drawImage()` 전환 필요
5. **text-[10px] 일괄 치환 불안전**: 네비 라벨, 배지 등 tight 레이아웃에서 12px 적용 시 깨짐. `text-[11px]`로 case-by-case 검토 필요

**정제된 구현 순서 (S 크기 먼저, M+ 크기는 리팩토링 후)**:

| 순서 | 항목 | 난이도 | 의존성 |
|------|------|--------|--------|
| 1 | 위치 자동요청 제거 | XS | 없음 |
| 2 | 터치 타겟 수정 | S | 없음 |
| 3 | 글자 크기 수정 (case-by-case) | S | 없음 |
| 4 | 즐겨찾기/최근 HomeTab 노출 | S | 없음 |
| 5 | "이 혜택 유용했나요?" 피드백 버튼 | S | 없음 |
| 6 | **App.jsx 커스텀 훅 리팩토링** | M | 없음 (이후 작업의 블로커) |
| 7 | Auto-demo + `hasSeenOnboarding` 플래그 | S | 리팩토링 후 |
| 8 | 인기 카드 빠른 추가 | M | 리팩토링 후 |
| 9 | 주간 혜택 리포트 | M | 리팩토링 후 |
| 10 | Tailwind PostCSS 마이그레이션 | M | 별도 트랙 |

**시너지 노트**: Auto-demo + 지연된 위치 권한은 함께 작동 — 신규 유저가 권한 대화상자 없이 즉시 데모 데이터를 볼 수 있음

### 13-4. Group C 보충: backend-eng 추가 발견 4건

#### 1. LABEL_DETECTION 미사용 기능 (Sprint 1, 비용 절감)
- `api/identify.js:118`에서 `LABEL_DETECTION` 요청
- API가 `labels` 반환 (`identify.js:152-155`)
- **클라이언트 미사용**: `App.jsx:808-812`는 `web.bestGuessLabels`, `web.webEntities`, `logos`만 소비
- 제거 시 Vision API 호출당 ~20% 비용 절감, 기능 영향 없음

#### 2. CORS Regex (Sprint 0 업데이트)
엄격한 화이트리스트 대신 정규식 사용:
```js
/^https:\/\/card-ai-[a-z0-9-]+\.vercel\.app$/
```
Vercel 프리뷰 배포(PR 테스트)를 허용하면서 임의 `*.vercel.app` 차단. 기존 `Set.has()` 보다 유연.

#### 3. Vision API 응답 캐싱 (Sprint 2)
- 압축 이미지의 SHA-256 해시 → Upstash Redis 캐시 (24시간 TTL)
- 반복 스캔 비용 50%+ 절감
- Rate Limit용 Upstash 인스턴스와 동일 인스턴스 활용

#### 4. API 클라이언트 레이어 (Sprint 2)
- `src/api/` 클라이언트 + `src/services/` 비즈니스 로직 분리
- App.jsx 분리 계획과 연계, 에러 처리(재시도, 타임아웃, 정규화) 경계 명확화

### 13-5. Group D 최종 업데이트: 전원 의견 수렴 완료

**마케팅 예산 배분 최종 합의 (전원 동의)**:

| 채널 | 비율 | 합의 수준 |
|------|------|----------|
| Apple Search Ads | 45% | 전원 동의 |
| 네이버 검색광고 | 25% | 전원 동의 |
| 콘텐츠 (숏폼) | 15% | 전원 동의 |
| 인플루언서 시딩 | 15% | 전원 동의 |

**핵심 발견**: 네이버 검색광고 25% 배분이 이번 토론의 가장 중요한 결과물. PWA → 데모 체험 → 앱 설치 퍼널은 네이티브 전용 앱에 없는 Card AI만의 무기.

**ASA 키워드 3단계 전략**:
1. 브랜드 방어 (월 5만원): "Card AI" 등
2. 핵심 키워드 (월 15-25만원): "신용카드 혜택", "카드 추천"
3. 롱테일 (월 10-20만원): "발렛파킹 카드", "스타벅스 할인 카드"

**MMP 최종 결정 근거**:
1. 비용: AppsFlyer 월 15-20만원 → 미디어 예산의 15-20% 손실
2. 네이버 연동: 25% 예산의 어트리뷰션은 Airbridge만 네이티브 지원
3. 규모 매칭: 월 100-300건 설치 vs 무료 한도 1만건 (2-3년 무료 충분)

**개발팀 요청 (전원 공통, 우선순위순)**:

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| P0 | Airbridge SDK + MMI 이벤트 3개 | 유료 마케팅의 전제 조건 |
| P0 | Firebase SDK 기본 설치 | Android 준비 + 기본 분석 |
| P0 | Mixpanel 연동 (trackEvent 매핑) | 퍼널/코호트 분석 |
| P0 | index.html OG 태그 추가 | 커뮤니티 시딩 전 필수 |
| P1 | CPA_LINK_CLICK 이벤트 추가 | 수익화 데이터 수집 |
| P1 | 인앱 리뷰 요청 프롬프트 | ASO 평점 확보 |

### 13-6. Group D 보충: Anonymous CRM 패턴 + 마테크 스택 확정

**Anonymous CRM 패턴 (회원가입 없는 CRM)**:
- **유저 식별**: `Capacitor.Device.getId()` (회원가입 불필요)
- **연락 채널**: 푸시 알림 (이메일 불필요)
- **세그먼트**: 행동 기반 (카드 수, 장소 조회 빈도, 마지막 사용일)
- **개인화**: 로컬 데이터 기반 (서버에 PII 저장 안 함)

**푸시 옵트인 타이밍**: "첫 혜택 발견 직후"가 최적 (옵트인율 55-65%). 앱 첫 실행 시 요청하면 25-35%로 급락. **"가치 경험 후 권한 요청" 원칙**.

**4-레이어 마테크 스택 (총 비용 $0)**:

| 레이어 | 도구 | 역할 | 비용 |
|--------|------|------|------|
| 어트리뷰션 | Airbridge | 채널별 설치 추적 | $0 |
| 인프라 | Firebase | 기본 이벤트 + 크래시 + Google Ads | $0 |
| 분석 | Mixpanel Free | 퍼널/코호트/리텐션/세그먼트 | $0 |
| CRM 실행 | OneSignal Free | 푸시 알림 + 세그먼트 타겟팅 | $0 |

### 13-7. Group B 보충: 스프린트 계획 수정안 (frontend-eng 피드백 반영)

**변경 사유**:
- Tailwind 마이그레이션과 App.jsx 리팩토링의 리스크 프로필이 다름 → 분리 필요
- CORS 취약점이 프로덕션에 활성 → 기능 작업 전 보안 먼저
- 데모 자동시작은 App.jsx 리팩토링 불필요 (10줄 useEffect + 스토리지 플래그)

**수정된 스프린트 계획**:

| Sprint | 초점 | 기간 | 산출물 |
|--------|------|------|--------|
| **Sprint 0** | 보안 + XS UX 퀵윈 | 1일 | CORS 수정, 에러 메시지 분기, 위치 자동요청 제거, 데모 자동시작 |
| **Sprint 1** | 접근성 패스 | 2-3일 | 터치 타겟(44px), 글자 크기(36곳), 색상 대비(30곳), 보안 헤더, Rate Limit |
| **Sprint 2** | Tailwind 마이그레이션 | 3-5일 | CDN → PostCSS, 전 컴포넌트 비주얼 회귀 테스트 |
| **Sprint 3** | App.jsx 리팩토링 | 3-5일 | 커스텀 훅 추출, OCR → services/ 분리 |
| **Sprint 4** | 신규 기능 | 2-3일 | 즐겨찾기 HomeTab, 인기 카드, 피드백 버튼, 주간 절약 |

**이 순서의 장점**:
- Sprint 0이 1일로 단축 (기존 2-3일) → 빠른 첫 성과
- 보안 먼저: CORS 취약점을 기능 작업 전 해결
- 리스크 비혼합: 각 스프린트가 단일 유형 변경 (보안/비주얼/인프라/로직/기능)
- Auto-demo + 지연 위치 권한이 Sprint 0에서 함께 출시 → 즉시 깔끔한 첫 경험

---

> 이 문서는 17명 크로스펑셔널 팀의 개별 분석 보고서와 4개 그룹 간 크로스펑셔널 토론 결과를 종합한 최종 합의안입니다.
> 각 그룹 리드가 참여자들의 의견을 수렴하고 이견을 조율하여 합의에 도달한 결과물입니다.
> 보충 자료(13장)는 합의안 확정 후 추가로 도착한 세부 사항을 포함합니다.
