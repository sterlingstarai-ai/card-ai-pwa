# Card AI v1.1 외주 개발 명세서

> 작성일: 2026-02-21
> 작성자: Card AI 기획팀
> 대상: 외주 개발사 PM 및 개발팀
> 버전: 1.0 (초판)

---

## 문서 목적

이 문서는 Card AI v1.1 개발에 필요한 **모든 작업을 코드 레벨로 상세하게 명시**합니다.
외주 개발사 PM이 이 문서만으로 작업 지시, 일정 관리, 검수를 수행할 수 있어야 합니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 및 환경](#2-기술-스택-및-환경)
3. [Sprint 0: 보안 핫픽스 + 즉시 UX 개선](#3-sprint-0-보안-핫픽스--즉시-ux-개선)
4. [Sprint 1: 접근성 + 인프라 구축](#4-sprint-1-접근성--인프라-구축)
5. [Sprint 2: Tailwind 마이그레이션](#5-sprint-2-tailwind-마이그레이션)
6. [Sprint 3: App.jsx 리팩토링](#6-sprint-3-appjsx-리팩토링)
7. [Sprint 4: 신규 기능](#7-sprint-4-신규-기능)
8. [Sprint 5: 분석 인프라 + 마케팅 SDK](#8-sprint-5-분석-인프라--마케팅-sdk)
9. [데이터 작업 (개발과 병행)](#9-데이터-작업)
10. [ASO 메타데이터 변경 (비개발)](#10-aso-메타데이터-변경)
11. [테스트 계획](#11-테스트-계획)
12. [검수 체크리스트](#12-검수-체크리스트)
13. [배포 절차](#13-배포-절차)
14. [부록: 파일 구조 참조](#14-부록-파일-구조-참조)

---

## 1. 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 앱 이름 | Card AI |
| 앱 ID | `com.sterlingstarai.cardai` |
| 현재 버전 | 1.0.2 (빌드 4) |
| 목표 버전 | 1.1.0 |
| 프레임워크 | React 18 + Vite 5 |
| 네이티브 | Capacitor 8 (iOS/Android) |
| 호스팅 | Vercel (Serverless Functions) |
| 도메인 | `card-ai-pi.vercel.app` |
| 저장소 | Git (로컬) |

### 핵심 기능
사용자가 보유한 신용카드의 혜택을 **장소별로** 보여주는 PWA/하이브리드 앱.
카카오맵 기반 지도 + OCR 카드 인식 + 혜택 비교.

---

## 2. 기술 스택 및 환경

### 현재 스택
```
Frontend: React 18.2 + Vite 5.0
CSS: Tailwind CSS (CDN, 프로덕션 비적합 - Sprint 2에서 교체)
지도: Kakao Maps JavaScript SDK
네이티브: Capacitor 8 (Camera, Geolocation)
API: Vercel Serverless Functions (4개 엔드포인트)
에러 추적: Sentry (@sentry/react)
저장소: IndexedDB + localStorage 폴백
PWA: vite-plugin-pwa (Workbox)
```

### v1.1에서 추가할 의존성
```json
{
  "dependencies": {
    "firebase": "^11.x",
    "mixpanel-browser": "^2.x",
    "@upstash/ratelimit": "^2.x",
    "@upstash/redis": "^1.x"
  },
  "devDependencies": {
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x"
  }
}
```

### 로컬 개발 환경
```bash
npm run dev          # Vite 개발 서버 (localhost:5173)
npm run build        # 프로덕션 빌드 (dist/)
npm run lint         # ESLint
npm run validate     # 데이터 검증
npx cap sync         # 네이티브 동기화
```

### 환경변수 (Vercel)
| 변수 | 용도 | 엔드포인트 |
|------|------|-----------|
| `VISION_API_KEY` | Google Vision API | api/ocr.js, api/identify.js |
| `VITE_KAKAO_APP_KEY` | 카카오맵 SDK | 클라이언트 |
| `KAKAO_REST_API_KEY` | 카카오 장소 검색 | api/kakao-places.js |
| `GITHUB_TOKEN` | 유저 리포트 이슈 생성 | api/report.js |

### v1.1에서 추가할 환경변수
| 변수 | 용도 | 획득처 |
|------|------|--------|
| `UPSTASH_REDIS_REST_URL` | Rate Limit | upstash.com 가입 |
| `UPSTASH_REDIS_REST_TOKEN` | Rate Limit | upstash.com 가입 |
| `VITE_MIXPANEL_TOKEN` | Mixpanel | mixpanel.com 가입 |
| `VITE_FIREBASE_CONFIG` | Firebase | Firebase Console |

---

## 3. Sprint 0: 보안 핫픽스 + 즉시 UX 개선

> 기간: 1일 | 우선순위: **긴급**
> 프로덕션에 활성 보안 취약점이 있으므로 최우선 처리

### Task S0-1: CORS 취약점 수정

**심각도**: Critical
**영향 범위**: 4개 API 파일 모두

**현재 문제**:
모든 API 파일에서 `origin.endsWith('.vercel.app')` 패턴을 사용하여, **어떤 `*.vercel.app` 사이트에서든** 우리 API를 호출할 수 있음. Vision API 크레딧 무단 소모 가능.

**수정 대상 파일 및 위치**:

| 파일 | 함수 위치 | 현재 코드 라인 |
|------|----------|--------------|
| `api/identify.js` | `isAllowedOrigin()` | 라인 26-31 |
| `api/ocr.js` | `isAllowedOrigin()` | 라인 26-31 |
| `api/kakao-places.js` | `isAllowedOrigin()` | 라인 14-19 |
| `api/report.js` | `isAllowedOrigin()` | 라인 14-23 |

**수정 방법**:

각 파일의 `isAllowedOrigin` 함수를 다음으로 교체:

```javascript
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === 'null') return true; // Capacitor WebView

  const ALLOWED_EXACT = new Set([
    'https://card-ai-pi.vercel.app',
    'https://card-ai.vercel.app',
    'capacitor://localhost',
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:3000',
  ]);

  if (ALLOWED_EXACT.has(origin)) return true;

  // Vercel 프리뷰 배포 허용 (PR 테스트용)
  if (/^https:\/\/card-ai-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;

  return false;
}
```

**주의**: `api/report.js`는 라인 23에 `origin === 'null'` 체크가 없음 — 위 코드 적용 시 자동으로 해결됨.

**검수 기준**:
- [ ] `https://malicious-site.vercel.app`에서 API 호출 시 403 반환
- [ ] `https://card-ai-pi.vercel.app`에서 정상 호출
- [ ] `https://card-ai-abc123-scope.vercel.app` (프리뷰 배포)에서 정상 호출
- [ ] `capacitor://localhost`에서 정상 호출 (iOS 앱)
- [ ] `http://localhost:5173`에서 정상 호출 (로컬 개발)
- [ ] 4개 파일 모두 동일한 `isAllowedOrigin` 로직 적용 확인

---

### Task S0-2: API 에러 메시지 보안 수정

**심각도**: High
**현재 문제**: 일부 API가 프로덕션에서 `error.message`를 그대로 클라이언트에 노출

**수정 1: `api/ocr.js` 라인 191-195**

변경 전:
```javascript
return res.status(500).json({
  error: 'OCR processing failed',
  message: error.message
});
```

변경 후:
```javascript
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
return res.status(500).json({
  error: 'OCR processing failed',
  message: isProduction ? '이미지 처리 중 오류가 발생했습니다' : error.message
});
```

**수정 2: `api/kakao-places.js` 라인 224**

변경 전:
```javascript
{ error: 'Unexpected error', detail: String(e?.message || e) }
```

변경 후:
```javascript
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
{ error: 'Unexpected error', detail: isProduction ? '장소 검색 중 오류가 발생했습니다' : String(e?.message || e) }
```

**수정 3: `api/kakao-places.js` 라인 188**

변경 전:
```javascript
{ error: 'Kakao API error', detail: text.slice(0, 400) }
```

변경 후:
```javascript
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
{ error: 'Kakao API error', detail: isProduction ? '외부 서비스 오류' : text.slice(0, 400) }
```

**수정 4: `api/report.js` 라인 250-254**

변경 전:
```javascript
{ error: '...', message: error.message }
```

변경 후:
```javascript
const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
{ error: '리포트 전송 중 오류가 발생했습니다', message: isProduction ? undefined : error.message }
```

**검수 기준**:
- [ ] 프로덕션 환경에서 500 에러 응답에 `error.message` 노출 안 됨
- [ ] 로컬 개발 환경에서는 디버깅용 상세 에러 메시지 정상 표시

---

### Task S0-3: 위치 권한 자동요청 제거

**심각도**: High (UX)
**파일**: `src/App.jsx`
**위치**: 라인 588-596

**현재 동작**: 앱 데이터 로드 완료 시 자동으로 위치 권한 요청 → 사용자가 앱 가치를 이해하기 전에 권한 대화상자 표시

**수정 방법**: 해당 useEffect 블록 전체 삭제 또는 주석 처리

삭제할 코드 (라인 588-596):
```javascript
// 앱 시작 시 자동으로 위치 권한 요청 (1회만)
useEffect(() => {
  console.log('[Location] dataLoaded:', dataLoaded, 'locationStatus:', locationStatus, 'requested:', locationRequestedRef.current);
  if (dataLoaded && locationStatus === 'idle' && !locationRequestedRef.current) {
    console.log('[Location] Auto requesting location permission...');
    locationRequestedRef.current = true;
    requestLocation();
  }
}, [dataLoaded, locationStatus]);
```

**부작용 없음 확인**: `handleNearby` 함수 (라인 598+)가 이미 "내 주변" 탭 클릭 시 독립적으로 위치 권한 요청을 처리함.

**검수 기준**:
- [ ] 앱 최초 실행 시 위치 권한 대화상자 표시 안 됨
- [ ] "내 주변" 탭 클릭 시 위치 권한 대화상자 정상 표시
- [ ] 위치 권한 허용 후 근처 장소 정상 표시
- [ ] iOS / Android / 웹 모두 확인

---

### Task S0-4: 데모 자동시작 구현

**심각도**: Medium (UX)
**파일**: `src/App.jsx`

**현재 동작**: 신규 사용자가 앱을 열면 "등록된 카드가 없어요" 빈 화면 표시

**목표**: 카드를 등록하지 않은 신규 사용자에게 자동으로 데모 모드 시작

**구현 방법**:

1. `src/App.jsx`에서 데이터 로드 완료 후 (기존 라인 588 근처, S0-3에서 삭제한 위치에) 새 useEffect 추가:

```javascript
// 신규 사용자 자동 데모
useEffect(() => {
  if (!dataLoaded) return;
  const hasSeenOnboarding = localStorage.getItem('cardai_has_seen_onboarding');
  if (!hasSeenOnboarding && myCards.length === 0 && !isDemo) {
    startDemo();
    localStorage.setItem('cardai_has_seen_onboarding', 'true');
  }
}, [dataLoaded]);
```

2. `startDemo` 함수는 이미 구현되어 있음 (App.jsx 내에서 검색). `CONFIG.DEMO.CARDS`와 `CONFIG.DEMO.PLACE` 설정을 사용.

3. `exitDemo` 함수 수정 — 현재 카드를 `[]`로 리셋하는데, 대신 전환 브릿지 추가:
   - exitDemo 호출 시 "데모에서 본 카드를 등록할까요?" 토스트 또는 모달 표시
   - "네" → 데모 카드를 실제 카드로 전환 (isDemo만 false로, myCards 유지)
   - "아니요" → 기존대로 카드 초기화

**검수 기준**:
- [ ] 최초 앱 실행 시 데모 모드 자동 시작 (데모 카드 3장 + 인천공항 T2 표시)
- [ ] 데모 종료 시 전환 브릿지 표시
- [ ] 두 번째 앱 실행부터는 데모 자동시작 안 됨 (`hasSeenOnboarding` 플래그)
- [ ] 수동 카드 등록 후에도 데모 재시작 안 됨
- [ ] localStorage에 `cardai_has_seen_onboarding` 키 정상 저장 확인

---

### Task S0-5: 민감 콘솔 로그 제거

**심각도**: Medium (보안)
**파일**: `src/App.jsx`

**제거 또는 Logger.log로 교체할 라인**:

| 라인 | 현재 코드 | 조치 |
|------|----------|------|
| 548 | `console.log('[Location] Position:', position.coords.latitude, position.coords.longitude)` | `Logger.log(...)` 으로 교체 (프로덕션에서 미출력) |
| 1038 | `console.log('[OCR] Response text preview:', responseText.substring(0, 200))` | 삭제 |
| 1055 | `console.log('[OCR] Response data:', data)` | 삭제 |
| 1060 | `console.log('[OCR] Recognized text:', recognizedText)` | 삭제 |

**참고**: `Logger` 객체는 `src/constants/config.js`에 정의되어 있으며, `CONFIG.APP.DEBUG === false`일 때 출력하지 않음. `console.log`를 `Logger.log`로 바꾸면 프로덕션에서 자동 차단.

**검수 기준**:
- [ ] 프로덕션 빌드에서 GPS 좌표, OCR 텍스트가 콘솔에 출력 안 됨
- [ ] 개발 모드에서는 정상 출력 (DEBUG=true 시)

---

### Task S0-6: OG 태그 추가

**심각도**: Low (마케팅 전제조건)
**파일**: `index.html`
**위치**: `<head>` 태그 내 (라인 10 이후)

**추가할 코드**:
```html
<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:title" content="Card AI - 신용카드 혜택 추천" />
<meta property="og:description" content="지금, 여기서 어떤 카드 쓸지 알려드려요. 장소별 카드 혜택 비교." />
<meta property="og:image" content="https://card-ai-pi.vercel.app/og-image.png" />
<meta property="og:url" content="https://card-ai-pi.vercel.app" />
<meta property="og:locale" content="ko_KR" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Card AI - 신용카드 혜택 추천" />
<meta name="twitter:description" content="지금, 여기서 어떤 카드 쓸지 알려드려요" />
<meta name="twitter:image" content="https://card-ai-pi.vercel.app/og-image.png" />
```

**추가 작업**: `public/og-image.png` 파일 제작 필요 (1200x630px, 앱 스크린샷 또는 로고+텍스트)

**검수 기준**:
- [ ] 카카오톡에 URL 공유 시 미리보기(제목+설명+이미지) 정상 표시
- [ ] Facebook/Twitter에 URL 공유 시 미리보기 정상 표시
- [ ] og-image.png 파일 존재 (1200x630px)

---

### Task S0-7: 미사용 JSON 파일 제거

**파일 목록**:
- `src/data/korean-card-partner-places.json` (44KB)
- `src/data/korean-credit-cards.json` (35KB)

**확인 절차**:
1. 프로젝트 전체에서 해당 파일명으로 import/require 검색
2. 참조가 없으면 삭제

**검수 기준**:
- [ ] 두 파일 삭제 후 `npm run build` 성공
- [ ] 앱 기능 정상 동작

---

## 4. Sprint 1: 접근성 + 인프라 구축

> 기간: 2-3일

### Task S1-1: vercel.json 보안 헤더 추가

**파일**: `vercel.json` (신규 생성, 프로젝트 루트)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), geolocation=(self), microphone=()" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

**검수 기준**:
- [ ] Vercel 배포 후 응답 헤더에 `X-Frame-Options: DENY` 포함 확인
- [ ] API 응답에 `Cache-Control: no-store` 포함 확인

---

### Task S1-2: Upstash Redis Rate Limit 도입

**설치**: `npm install @upstash/ratelimit @upstash/redis`

**공유 미들웨어 파일 생성**: `api/lib/rate-limit.js`

```javascript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit = null;

function getRatelimit() {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'cardai',
    });
  }
  return ratelimit;
}

export async function checkRateLimit(req, res, { max = 10, window = '60 s', prefix = 'default' } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const identifier = `${prefix}:${ip}`;

  const rl = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: `cardai:${prefix}`,
  });

  const { success, limit, remaining, reset } = await rl.limit(identifier);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', reset);

  if (!success) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return false;
  }
  return true;
}
```

**각 API 파일 수정**:

| 파일 | 기존 Rate Limit | 새 설정 |
|------|----------------|---------|
| `api/ocr.js` | 인메모리 Map, 10/min | `checkRateLimit(req, res, { max: 10, window: '60 s', prefix: 'ocr' })` |
| `api/identify.js` | 인메모리 Map, 8/min | `checkRateLimit(req, res, { max: 8, window: '60 s', prefix: 'identify' })` |
| `api/kakao-places.js` | **없음** | `checkRateLimit(req, res, { max: 30, window: '60 s', prefix: 'kakao' })` |
| `api/report.js` | 인메모리 Map, 3/5min | `checkRateLimit(req, res, { max: 3, window: '300 s', prefix: 'report' })` |

**기존 인메모리 rate limit 코드 제거**: 각 파일의 `rateLimitMap`, `rateLimitCleanupInterval`, 관련 `setInterval` 코드 삭제.

**검수 기준**:
- [ ] 제한 초과 시 429 응답 + `X-RateLimit-Remaining: 0` 헤더
- [ ] 다른 Vercel 인스턴스에서도 카운터 공유됨 (cold start 후에도 제한 유지)
- [ ] `api/kakao-places.js`에도 rate limit 적용 확인
- [ ] Upstash 대시보드에서 요청 로그 확인 가능

---

### Task S1-3: 공유 CORS 미들웨어 추출

**파일**: `api/lib/cors.js` (신규 생성)

4개 API 파일에 중복된 ~60줄의 CORS 코드를 하나의 공유 모듈로 추출.

```javascript
const ALLOWED_EXACT = new Set([
  'https://card-ai-pi.vercel.app',
  'https://card-ai.vercel.app',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
]);

const PREVIEW_PATTERN = /^https:\/\/card-ai-[a-z0-9-]+\.vercel\.app$/;

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === 'null') return true;
  if (ALLOWED_EXACT.has(origin)) return true;
  if (PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

export function handleCors(req, res) {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'https://card-ai-pi.vercel.app');
  } else {
    return false; // blocked
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return 'preflight';
  }

  return true;
}
```

**각 API 파일 수정**: 기존 CORS 로직 제거, `import { handleCors } from './lib/cors.js'` 추가.

```javascript
// 각 API 핸들러 최상단:
const corsResult = handleCors(req, res);
if (corsResult === 'preflight') return;
if (corsResult === false) return res.status(403).json({ error: 'Origin not allowed' });
```

**검수 기준**:
- [ ] 4개 API 파일에서 중복 CORS 코드 완전 제거
- [ ] 기존 CORS 동작과 동일 (허용/차단 로직 불변)
- [ ] OPTIONS 프리플라이트 요청 정상 처리

---

### Task S1-4: 터치 타겟 최소 크기 수정

**기준**: iOS HIG / WCAG 2.1 최소 44x44px

**수정 대상**: 전체 컴포넌트에서 `min-h-[44px] min-w-[44px]` 미달인 터치 가능 요소 확인

주요 확인 포인트:
- 닫기(X) 버튼들
- 카테고리 필터 pill
- 토글 버튼
- 네비게이션 탭 버튼

**수정 방법**: 해당 요소에 `min-h-[44px]` 추가. 레이아웃이 깨지지 않도록 `flex items-center justify-center` 조합.

**검수 기준**:
- [ ] 모든 터치 가능 요소가 최소 44x44px
- [ ] 레이아웃 깨짐 없음 (iOS/Android 실기기 확인)

---

### Task S1-5: 최소 글자 크기 수정

**기준**: 최소 11px (WCAG AA)

**주의**: `text-[10px]`를 일괄 치환하면 안 됨. 네비 라벨, 배지 등 tight 레이아웃에서 깨질 수 있음.

**수정 방법**: `text-[10px]` 사용처를 하나씩 확인하여 `text-[11px]`로 변경. 각 변경 후 시각적 확인 필요.

**검수 기준**:
- [ ] 앱 내 10px 이하 텍스트 없음
- [ ] 네비 라벨, 배지 등 레이아웃 정상

---

### Task S1-6: 색상 대비 수정

**기준**: WCAG AA 최소 대비비 4.5:1

**주요 대상**: `text-slate-500`, `text-slate-600` 텍스트 (배경 `#0a0a0f` 대비 부족)

**수정 방법**: `text-slate-500` → `text-slate-400` (대비비 향상)

**검수 기준**:
- [ ] 주요 텍스트 대비비 4.5:1 이상 (브라우저 접근성 검사 도구로 확인)

---

### Task S1-7: OCR 즉시 수정 3건

**파일**: `src/App.jsx`

**수정 1: 1차 OCR에서 logos 전달 (1줄)**

현재 `handleOCRBase64` 함수 내에서 1차 OCR 응답의 `logos`를 `findCardCandidatesFromSignals`에 전달하지 않음.

찾아야 할 패턴: `findCardCandidatesFromSignals(recognizedText)` 호출 부분
변경: `findCardCandidatesFromSignals(recognizedText, data.logos)` 또는 logos 데이터를 signal string에 포함

**수정 2: 최소 점수 임계값 도입 (1줄)**

`findCardCandidatesFromSignals` 함수 (라인 720-753) 내에서 결과 필터링 시 최소 점수 4 적용.

현재 (라인 745 근처):
```javascript
.sort((a, b) => b.score - a.score)
.slice(0, CONFIG.UI.MAX_OCR_CANDIDATES);
```

변경:
```javascript
.filter(c => c.score >= 4) // 최소 점수 임계값
.sort((a, b) => b.score - a.score)
.slice(0, CONFIG.UI.MAX_OCR_CANDIDATES);
```

**수정 3: compressImage maxSize 통일 (1줄)**

`compressImage` 함수 (라인 614) 기본 파라미터:
```javascript
async function compressImage(file, quality = 0.8, maxSize = 1920)
```
변경:
```javascript
async function compressImage(file, quality = 0.7, maxSize = 1600)
```

**검수 기준**:
- [ ] OCR 스캔 시 false positive(잘못된 카드 인식) 감소 확인
- [ ] 기존에 정상 인식되던 카드가 여전히 인식됨 (임계값 4가 너무 높지 않은지)
- [ ] 웹/네이티브 모두 동일한 이미지 크기 및 품질로 압축

---

### Task S1-8: LABEL_DETECTION 제거 (API 비용 절감)

**파일**: `api/identify.js`
**위치**: 라인 118 근처

현재 `features` 배열에서 `LABEL_DETECTION`을 요청하지만, 클라이언트(`App.jsx:808-812`)에서 `labels` 응답을 전혀 사용하지 않음.

**수정**: `features` 배열에서 `{ type: 'LABEL_DETECTION', maxResults: N }` 항목 제거.

**효과**: Vision API 호출당 ~20% 비용 절감

**검수 기준**:
- [ ] OCR 인식 기능 정상 동작 (2단계 인식 포함)
- [ ] `api/identify.js` 응답에 `labels` 필드 없어도 클라이언트 에러 없음

---

### Task S1-9: places.json 99.2% 축소

**현재 상태**: `src/data/places.json` (2.58MB, 5,420개 장소)

**분석 결과**:
- cafe: 4,532개 (83.6%) → Kakao API `searchLivePlaces()` + `fetchKakaoPlacesByRectPaged()`가 이미 동적 로딩
- mart: 748개 (13.8%) → 위와 동일
- curated (airport, hotel, lounge 등): 140개 (2.6%) → Kakao API에 없는 파트너/브랜드 장소

**수정 방법**:

1. `src/data/places.json`에서 `category`가 `"cafe"` 또는 `"mart"`인 항목 전부 삭제
2. 파일명 변경: `places.json` → `places.json` (그대로, 내용만 축소) 또는 원하면 `places-curated.json`으로 변경 후 import 경로 수정
3. 결과: ~140개 항목, ~21KB

**import 수정 필요 파일**: `src/data/places.json`을 import하는 모든 파일 확인. 보통 데이터 로딩 로직(`App.jsx` 또는 `src/data/` 내 index 파일)에서 import.

**주의사항**: PlaceSheet의 카테고리별 목록 뷰에서 cafe/mart 카테고리 선택 시 정적 데이터 대신 Kakao API 동적 검색이 트리거되어야 함. 기존에 이미 `MapView.jsx`의 `searchLivePlaces()`가 이 역할을 하고 있으므로, PlaceSheet에서도 동일 로직을 활용하는지 확인.

**검수 기준**:
- [ ] 번들 사이즈 2.5MB 감소 확인 (`npm run build` 후 dist/ 크기 비교)
- [ ] curated 장소(공항, 호텔, 라운지) 정상 표시
- [ ] 카페/마트 카테고리 선택 시 Kakao API를 통해 동적으로 장소 로드
- [ ] 지도에서 카페/마트 핀 정상 표시 (동적 로딩)

---

## 5. Sprint 2: Tailwind 마이그레이션

> 기간: 3-5일

### Task S2-1: Tailwind CDN → PostCSS 빌드 전환

**현재 상태**: `index.html` 라인 20에서 CDN 로드
```html
<script src="https://cdn.tailwindcss.com"></script>
```
런타임에 ~300KB+ JS가 매 페이지 로드마다 클래스를 JIT 파싱. 프로덕션 부적합.

**수정 절차**:

1. **패키지 설치**:
```bash
npm install -D tailwindcss @tailwindcss/vite
```

2. **vite.config.js 수정**:
```javascript
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({ ... }),
  ],
  // ... 나머지
});
```

3. **CSS 엔트리 파일 생성**: `src/index.css`
```css
@import "tailwindcss";
```

4. **src/main.jsx에 CSS import 추가**:
```javascript
import './index.css';
```

5. **tailwind.config 마이그레이션**: `index.html`의 인라인 설정(라인 22-30)을 CSS 내 `@theme` 블록으로 이동:
```css
@import "tailwindcss";

@theme {
  --font-sans: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
}
```

6. **index.html에서 Tailwind CDN 제거**: 라인 19-31 삭제
```html
<!-- 삭제할 부분 -->
<!-- Tailwind CSS CDN -->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = { ... }
</script>
```

7. **vite.config.js에서 Workbox의 tailwindcss CDN 캐싱 규칙 제거**: `runtimeCaching` 배열에서 `tailwindcss` CDN 관련 항목 삭제.

**검수 기준**:
- [ ] `npm run build` 성공
- [ ] 빌드 결과에 `tailwindcss.com` CDN 참조 없음
- [ ] dist/ 내 CSS 파일 크기 10-30KB (purged)
- [ ] 모든 페이지/컴포넌트의 스타일 정상 (비주얼 회귀 없음)
- [ ] `index.html`에 `<script src="https://cdn.tailwindcss.com">` 없음
- [ ] iOS 앱에서 스타일 정상 표시
- [ ] 오프라인 상태에서 스타일 정상 (CDN 의존성 제거)

**비주얼 회귀 테스트 체크리스트**:
- [ ] HomeTab (카드 목록, 장소 추천)
- [ ] BenefitsTab (혜택 카드)
- [ ] WalletTab (지갑, 카드 추가/삭제)
- [ ] SettingsTab (설정)
- [ ] MapView (지도, 마커, 인포윈도우)
- [ ] PlaceSheet (장소 목록/상세)
- [ ] OcrModal (카메라/갤러리 선택, 결과)
- [ ] BenefitDetailModal (혜택 상세)
- [ ] ReportModal (제보 폼)
- [ ] Toast (알림)
- [ ] 네비게이션 바 (4개 탭)
- [ ] 검색 바
- [ ] 데모 모드 UI

---

## 6. Sprint 3: App.jsx 리팩토링

> 기간: 3-5일

### Task S3-1: 커스텀 훅 추출

**현재 상태**: `src/App.jsx` 1,422줄에 30+ useState, 10+ useEffect, OCR 로직 ~400줄 포함.

**목표**: 도메인별 커스텀 훅으로 분리.

#### 훅 1: `src/hooks/useOcr.js` (~400줄)

추출할 함수/상태:
- 상태: `ocrCandidates`, `ocrStatus`, `ocrMessage`, `showOcrModal`
- Ref: `ocrRunIdRef`
- 함수: `cancelOcrRun` (라인 139-141), `compressImage` (614-683), `normalizeKey` (688-700), `buildSignalString` (702-705), `scoreKeyMatch` (707-718), `findCardCandidatesFromSignals` (720-753), `fetchVisionIdentify` (755-782), `_processTwoStepOcr` (786-820), `handleOCR` (822-1002), `handleOCRBase64` (1005-1125), `confirmCard` (1127-1139)

**중요**: `handleOCR`와 `handleOCRBase64` 내에 `_processTwoStepOcr`의 로직이 중복 인라인되어 있음. 훅 추출 시 `_processTwoStepOcr` 함수를 실제로 호출하도록 중복 제거 (~80줄 감소).

#### 훅 2: `src/hooks/useCardData.js`

추출할 상태:
- `cardsData`, `placesData`, `dynamicPlacesData`, `benefitsData`, `networkBenefits`
- `dataLoaded`, `dataError`
- 데이터 로딩 useEffect

#### 훅 3: `src/hooks/useLocation.js`

추출할 상태:
- `userLocation`, `locationStatus`
- `locationRequestedRef`
- `requestLocation` 함수, `handleNearby` 함수

#### 훅 4: `src/hooks/useSearch.js`

추출할 상태:
- `searchQuery`, `debouncedQuery`
- 검색 결과 계산 로직 (useMemo)
- 디바운스 useEffect

#### 훅 5: `src/hooks/usePersistence.js`

추출할 로직:
- IndexedDB save/load
- 디바운스된 자동 저장

**검수 기준**:
- [ ] `App.jsx` 500줄 이하로 감소
- [ ] 모든 기존 기능 정상 동작
- [ ] 각 훅 파일이 독립적으로 이해 가능
- [ ] OCR 2단계 인식 정상 동작
- [ ] `_processTwoStepOcr` 중복 코드 제거 확인

---

## 7. Sprint 4: 신규 기능

> 기간: 2-3일

### Task S4-1: 즐겨찾기/최근 장소 HomeTab 노출

**현재 상태**: `recentPlaceIds` (라인 117), `favoritePlaceIds` (라인 118) 상태가 존재하지만 HomeTab에서 표시 안 됨.

**구현**: HomeTab 컴포넌트의 장소 섹션 상단에 pill 칩으로 표시.

```jsx
{favoritePlaceIds.length > 0 && (
  <div className="flex gap-2 overflow-x-auto pb-2">
    {favoritePlaceIds.map(id => {
      const place = allPlaces[id];
      return place ? (
        <button key={id} onClick={() => selectPlace(id)}
          className="flex-shrink-0 px-3 py-1.5 bg-slate-800 rounded-full text-sm text-white min-h-[44px]">
          {place.emoji} {place.name}
        </button>
      ) : null;
    })}
  </div>
)}
```

**검수 기준**:
- [ ] 즐겨찾기 장소가 HomeTab 상단에 pill 칩으로 표시
- [ ] 칩 탭 시 해당 장소의 혜택 표시
- [ ] 즐겨찾기가 없으면 섹션 미표시
- [ ] 가로 스크롤 동작

---

### Task S4-2: 인앱 리뷰 요청

**의존성**: Capacitor App Review 플러그인

```bash
npm install @capacitor/app-review
npx cap sync
```

**트리거 조건**: 카드 3장 이상 등록 완료 시 (1회만)

```javascript
import { AppReview } from '@capacitor/app-review';

// 카드 추가 함수 내에서:
if (myCards.length >= 3) {
  const hasRequestedReview = localStorage.getItem('cardai_review_requested');
  if (!hasRequestedReview) {
    localStorage.setItem('cardai_review_requested', 'true');
    try {
      await AppReview.requestReview();
    } catch (e) {
      // 무시 (리뷰 요청 실패는 치명적이지 않음)
    }
  }
}
```

**검수 기준**:
- [ ] 카드 3장 등록 후 iOS 리뷰 대화상자 표시
- [ ] 한 번만 표시 (2번째 이후 미표시)
- [ ] 웹/PWA에서는 에러 없이 무시

---

### Task S4-3: 공유 기능 추가

**구현 위치**: SettingsTab (이미 일부 사용 중) + BenefitDetailModal

```javascript
const handleShare = async () => {
  const shareData = {
    title: 'Card AI - 신용카드 혜택 추천',
    text: '지금, 여기서 어떤 카드 쓸지 알려드려요',
    url: 'https://card-ai-pi.vercel.app',
  };

  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(shareData.url);
    showToast('링크가 복사되었습니다');
  }
};
```

**검수 기준**:
- [ ] iOS에서 네이티브 공유 시트 표시
- [ ] 웹에서 클립보드 복사 + 토스트

---

## 8. Sprint 5: 분석 인프라 + 마케팅 SDK

> 기간: 2-3일

### Task S5-1: Firebase Analytics 연동

**설치**: `npm install firebase`

**파일**: `src/lib/firebase.js` (신규 생성)

```javascript
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');

let analytics = null;

export function initFirebase() {
  if (Object.keys(firebaseConfig).length === 0) return;
  const app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
}

export function firebaseLogEvent(eventName, params) {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
}
```

**`src/main.jsx` 수정**: `initFirebase()` 호출 추가.

---

### Task S5-2: Mixpanel 연동

**설치**: `npm install mixpanel-browser`

**파일**: `src/lib/mixpanel.js` (신규 생성)

```javascript
import mixpanel from 'mixpanel-browser';

let initialized = false;

export function initMixpanel() {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  if (!token) return;
  mixpanel.init(token, {
    track_pageview: true,
    persistence: 'localStorage',
  });
  initialized = true;
}

export function mixpanelTrack(eventName, properties) {
  if (initialized) {
    mixpanel.track(eventName, properties);
  }
}
```

---

### Task S5-3: flushEvents() 실제 전송 구현

**파일**: `src/lib/analytics.js`
**위치**: `flushEvents()` 함수 (라인 144-159)

**현재 코드** (비어있음):
```javascript
function flushEvents() {
  if (eventQueue.length === 0) { flushTimeout = null; return; }
  if (import.meta.env.PROD && eventQueue.length > 0) {
    // Future: POST to /api/analytics
  }
  eventQueue = [];
  flushTimeout = null;
}
```

**변경**:
```javascript
import { firebaseLogEvent } from './firebase.js';
import { mixpanelTrack } from './mixpanel.js';

function flushEvents() {
  if (eventQueue.length === 0) { flushTimeout = null; return; }

  for (const event of eventQueue) {
    // Firebase Analytics
    firebaseLogEvent(event.type, event.data);

    // Mixpanel
    mixpanelTrack(event.type, {
      ...event.data,
      session_id: getSessionId(),
      timestamp: event.timestamp,
    });
  }

  eventQueue = [];
  flushTimeout = null;
}
```

**`src/main.jsx` 수정**:
```javascript
import { initFirebase } from './lib/firebase.js';
import { initMixpanel } from './lib/mixpanel.js';

initFirebase();
initMixpanel();
```

**검수 기준**:
- [ ] Mixpanel 대시보드에서 이벤트 수신 확인 (EventType 전체)
- [ ] Firebase Analytics에서 이벤트 수신 확인
- [ ] `PLACE_BENEFIT_COUNT` 이벤트가 WABV 측정에 사용 가능
- [ ] 세션 ID가 올바르게 전달됨
- [ ] 프로덕션에서만 전송 (개발 환경에서 미전송 또는 별도 프로젝트)

---

### Task S5-4: CPA_LINK_CLICK 이벤트 추가

**파일**: `src/lib/analytics.js`

`EventType`에 추가:
```javascript
CPA_LINK_CLICK: 'cpa_link_click',
```

혜택 상세 모달에서 어필리에이트 링크 클릭 시 이벤트 발생:
```javascript
trackEvent(EventType.CPA_LINK_CLICK, {
  card_id: cardId,
  place_id: selectedPlaceId,
  link_type: 'benefit_detail', // 또는 'wallet'
});
```

---

## 9. 데이터 작업

> 개발과 병행, 별도 담당자

### Task D-1: 디지털뱅크 체크카드 데이터 추가 (P1)

`src/data/cards.json`에 추가할 카드:

| 카드 ID | 이름 | 발급사 | 이유 |
|---------|------|--------|------|
| `kakaobank-check` | 카카오뱅크 체크카드 | 카카오뱅크 | 2030대 게이트웨이 카드 |
| `tossbank-check` | 토스뱅크 체크카드 | 토스뱅크 | 2030대 게이트웨이 카드 |
| `kbank-check` | 케이뱅크 체크카드 | 케이뱅크 | 2030대 게이트웨이 카드 |

각 카드에 대해 `benefits.json`에 혜택 데이터도 추가 필요.

### Task D-2: Top 50 인기 장소 혜택 커버리지 90% 달성

`src/data/benefits.json` 보강:
- 현재 222개 혜택 → 목표 500개+
- curated 장소 140개 중 인기 Top 50에 대해 90% 이상 카드의 혜택이 매핑되어야 함

---

## 10. ASO 메타데이터 변경

> 비개발 작업, App Store Connect에서 직접 변경

| 항목 | 현재 | 변경 |
|------|------|------|
| 앱 이름 | Card AI | **Card AI - 신용카드 혜택 추천** |
| 부제 | (없음 또는 기존) | **공항라운지/호텔/카페 카드혜택 비교** |
| 키워드 | 신용카드,카드혜택,공항라운지... | **카드추천,카드비교,공항라운지,발렛파킹,호텔할인,카페할인,마일리지,카드랭킹,혜택조회,카드관리** |

---

## 11. 테스트 계획

### 단위 테스트 (각 Sprint 완료 시)

| 테스트 대상 | 테스트 내용 |
|------------|-----------|
| `isAllowedOrigin()` | 허용/차단 origin 목록 각각 확인 |
| `checkRateLimit()` | 제한 초과 시 429, 정상 시 200 |
| `findCardCandidatesFromSignals()` | 임계값 4 미만 필터링, 정상 매칭 |
| `compressImage()` | maxSize 1600, quality 0.7 적용 확인 |
| `flushEvents()` | Firebase + Mixpanel 호출 확인 |

### 통합 테스트 (Sprint 완료 시)

| 시나리오 | 확인 사항 |
|---------|----------|
| 신규 사용자 첫 실행 | 데모 자동시작, 위치 권한 미요청 |
| 카드 OCR 인식 | 2단계 인식, 임계값 필터링 |
| 오프라인 모드 | PWA 캐시로 기본 기능 동작 |
| Rate Limit 초과 | 429 응답, 적절한 에러 메시지 |

### E2E 테스트 (최종)

```bash
npm run test:e2e  # Playwright
```

### 실기기 테스트

| 디바이스 | 확인 항목 |
|---------|----------|
| iPhone (Safari) | 전체 기능, Capacitor 플러그인 |
| iPhone (앱) | 전체 기능, OCR, 위치, 푸시 |
| Android (Chrome) | PWA 설치, 전체 기능 |
| Android (앱) | 전체 기능, OCR, 위치 |

---

## 12. 검수 체크리스트

### Sprint 0 검수
- [ ] CORS: 악의적 origin 차단, 정상 origin 허용
- [ ] 에러 메시지: 프로덕션에서 내부 에러 미노출
- [ ] 위치 권한: 앱 시작 시 자동요청 안 됨
- [ ] 데모: 신규 사용자 자동 데모 시작
- [ ] 콘솔: 민감정보 미출력
- [ ] OG 태그: 카톡 공유 미리보기 정상
- [ ] 미사용 파일: 삭제 후 빌드 성공

### Sprint 1 검수
- [ ] 보안 헤더: vercel.json 적용 확인
- [ ] Rate Limit: Upstash Redis 동작, 429 응답
- [ ] CORS 미들웨어: 4개 API 공유 모듈 사용
- [ ] 접근성: 44px 터치 타겟, 11px 최소 글자, 대비비 4.5:1
- [ ] OCR: logos 전달, 임계값 4, maxSize 1600
- [ ] LABEL_DETECTION 제거: API 비용 절감, 기능 정상
- [ ] places.json: 2.5MB → 21KB, 기능 손실 없음

### Sprint 2 검수
- [ ] Tailwind CDN 참조 완전 제거
- [ ] 빌드 CSS 파일 10-30KB
- [ ] 전 컴포넌트 비주얼 회귀 없음 (체크리스트 항목별)

### Sprint 3 검수
- [ ] App.jsx 500줄 이하
- [ ] 5개 커스텀 훅 파일 존재
- [ ] OCR 중복 코드 제거 (_processTwoStepOcr 실제 호출)
- [ ] 전 기능 정상 동작

### Sprint 4 검수
- [ ] 즐겨찾기 HomeTab 표시
- [ ] 인앱 리뷰 트리거 (카드 3장)
- [ ] 공유 기능 동작

### Sprint 5 검수
- [ ] Mixpanel 대시보드에 이벤트 수신
- [ ] Firebase Analytics에 이벤트 수신
- [ ] WABV(PLACE_BENEFIT_COUNT) 추적 가능
- [ ] CPA_LINK_CLICK 이벤트 정상 발생

---

## 13. 배포 절차

### Vercel 배포

```bash
# 1. 빌드 확인
npm run ci

# 2. 프로덕션 배포
vercel --prod

# 3. 환경변수 추가 (Sprint 1, 5에서)
# Vercel Dashboard → Settings → Environment Variables
# UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
# VITE_MIXPANEL_TOKEN, VITE_FIREBASE_CONFIG
```

### iOS 배포

```bash
# 1. 빌드 + 네이티브 동기화
npm run cap:build:ios

# 2. Xcode에서 Archive → App Store Connect 업로드
# 3. TestFlight 테스트 → 심사 제출
```

### Android 배포

```bash
# 1. 빌드 + 네이티브 동기화
npm run cap:build:android

# 2. Android Studio에서 Build → Generate Signed Bundle
# 3. Google Play Console → 비공개 테스트 → 프로덕션
```

### 배포 후 확인

- [ ] Vercel 프로덕션 사이트 정상 접근
- [ ] iOS 앱 정상 동작 (TestFlight)
- [ ] Sentry에 새 에러 없음
- [ ] Mixpanel/Firebase에 이벤트 수신
- [ ] Rate Limit 정상 동작

---

## 14. 부록: 파일 구조 참조

### 주요 파일 목록

```
card-ai-pwa/
├── api/                          # Vercel Serverless Functions
│   ├── identify.js               # Google Vision WEB_DETECTION (183줄)
│   ├── kakao-places.js           # 카카오 장소 검색 프록시 (226줄)
│   ├── ocr.js                    # Google Vision OCR (197줄)
│   ├── report.js                 # 유저 리포트 → GitHub Issues (256줄)
│   └── lib/                      # (v1.1에서 신규 생성)
│       ├── cors.js               # 공유 CORS 미들웨어
│       └── rate-limit.js         # Upstash Rate Limit
├── src/
│   ├── App.jsx                   # 메인 컴포넌트 (1,422줄 → 리팩토링 후 ~500줄)
│   ├── main.jsx                  # 엔트리포인트
│   ├── components/
│   │   ├── BenefitDetailModal.jsx  # 혜택 상세 (91줄)
│   │   ├── MapView.jsx             # 카카오맵 (625줄)
│   │   ├── OcrModal.jsx            # OCR 모달 (179줄)
│   │   ├── PlaceSheet.jsx          # 장소 목록/상세 (170줄)
│   │   ├── ReportModal.jsx         # 제보 모달 (353줄)
│   │   └── ... (총 12개 파일)
│   ├── constants/
│   │   └── config.js             # 앱 설정 (179줄)
│   ├── data/
│   │   ├── benefits.json         # 혜택 데이터 (56KB, 222개)
│   │   ├── cards.json            # 카드 데이터 (31KB, 141개)
│   │   └── places.json           # 장소 데이터 (2.5MB→21KB)
│   ├── hooks/                    # (v1.1에서 신규 생성)
│   │   ├── useOcr.js
│   │   ├── useCardData.js
│   │   ├── useLocation.js
│   │   ├── useSearch.js
│   │   └── usePersistence.js
│   └── lib/
│       ├── analytics.js          # 이벤트 추적 (174줄)
│       ├── firebase.js           # (v1.1에서 신규 생성)
│       ├── mixpanel.js           # (v1.1에서 신규 생성)
│       └── storage.js            # IndexedDB (167줄)
├── index.html                    # HTML 엔트리 (37줄)
├── vite.config.js                # Vite 설정 (79줄)
├── capacitor.config.json         # Capacitor 설정 (29줄)
├── vercel.json                   # (v1.1에서 신규 생성)
└── package.json
```

### useState 전체 목록 (App.jsx 라인 78-126)

| 라인 | 변수명 | 초기값 | 훅 분리 대상 |
|------|--------|--------|-------------|
| 78 | `dataLoaded` | `false` | useCardData |
| 79 | `dataError` | `false` | useCardData |
| 80 | `cardsData` | `{}` | useCardData |
| 81 | `placesData` | `{}` | useCardData |
| 85 | `dynamicPlacesData` | `{}` | useCardData |
| 86 | `benefitsData` | `{}` | useCardData |
| 87 | `networkBenefits` | `{}` | useCardData |
| 100 | `myCards` | `[]` | App.jsx 유지 |
| 101 | `selectedPlaceId` | `null` | App.jsx 유지 |
| 102 | `activeTab` | `'home'` | App.jsx 유지 |
| 103 | `searchQuery` | `''` | useSearch |
| 104 | `debouncedQuery` | `''` | useSearch |
| 105 | `userLocation` | `null` | useLocation |
| 106 | `locationStatus` | `'idle'` | useLocation |
| 107-109 | PlaceSheet 관련 | - | App.jsx 유지 |
| 110-113 | OCR 관련 | - | useOcr |
| 114-126 | UI 상태 | - | App.jsx 유지 |

### API 엔드포인트 요약

| 엔드포인트 | 메서드 | Rate Limit (v1.1) | 용도 |
|-----------|--------|-------------------|------|
| `/api/ocr` | POST | 10/분/IP | Google Vision OCR |
| `/api/identify` | POST | 8/분/IP | Google Vision WEB_DETECTION |
| `/api/kakao-places` | GET | 30/분/IP | 카카오 장소 검색 |
| `/api/report` | POST | 3/5분/IP | 유저 제보 |

---

> **이 문서에 대한 질문이나 변경 요청은 Card AI 기획팀에 문의하세요.**
> **코드 수정 시 반드시 `npm run lint` 및 `npm run build` 통과를 확인하세요.**
