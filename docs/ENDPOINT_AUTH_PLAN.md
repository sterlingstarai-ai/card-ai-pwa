# 엔드포인트 인증/남용 방지 로드맵

비용이 드는 서버리스 프록시(`/api/ocr`, `/api/identify`, `/api/kakao-places`)와 제보(`/api/report`)가
비브라우저 제3자에게 악용되는 것을 막기 위한 단계별 계획.

## 문제 정의
- 앱은 **계정 없는 익명 공개 PWA** + 네이티브(Capacitor) 래퍼.
- CORS는 **브라우저만** 막는다. curl/스크립트는 CORS를 무시하므로 프록시가 열려 있으면
  Google Vision/Kakao 쿼터를 제3자가 무료로 쓸 수 있다(비용-DoS).
- 공개 웹 번들에는 비밀을 숨길 수 없다(devtools로 노출). 따라서 단일 정적 시크릿은
  웹에서 "진짜 인증"이 아니라 소프트 게이트일 뿐이다.

## 현재 적용된 방어 (이미 머지/구현)
1. **Fail-closed 레이트리밋** (`api/lib/rate-limit.js`): 리미터가 판정 불가(Upstash 미설정/장애)면
   비용 엔드포인트는 503으로 막는다. per-IP 슬라이딩 윈도우.
2. **입력 검증** (`api/lib/validate.js`): base64 형식/디코드 용량 검증 후에만 Vision 호출.
3. **CORS 허용목록** (`api/lib/cors.js`): 브라우저 출처 제한.

## Phase 1 — 공유 앱 토큰 ✅ (이번 작업, "착수")
- `api/lib/app-auth.js` `verifyAppRequest(req)`: 4개 엔드포인트가 CORS·메서드 확인 직후 호출.
- 클라이언트(`src/lib/api-client.js`)가 `x-app-token: VITE_APP_REQUEST_SECRET` 전송 →
  서버가 `APP_REQUEST_SECRET` 과 **상수시간 비교**.
- `APP_REQUEST_SECRET` 미설정 시 통과(no-op, 기존 배포 무중단) + 1회 경고 로그.
- **효과/한계**:
  - 네이티브 바이너리에 박힌 토큰은 추출 난도가 높아 **네이티브 경로엔 실효**.
  - 웹은 토큰이 번들에 노출되므로 캐주얼/스크립트성 남용 차단 + **회전(rotation)** 용도.
  - 설정법: Vercel 환경변수 `APP_REQUEST_SECRET` 와 빌드 환경변수 `VITE_APP_REQUEST_SECRET`
    에 **동일한 무작위 값**을 넣고 배포. 유출 의심 시 두 값을 함께 교체.

## Phase 1.5 — 전역 비용 서킷브레이커 ✅ (구현됨)
- `api/lib/cost-guard.js` `checkCostBudget()`: ocr/identify/kakao가 rate-limit 직후 호출.
- per-IP 리밋은 IP 회전으로 우회 가능 → **엔드포인트별 일일 총량 상한**을 Upstash 카운터로
  두고 초과 시 503(Retry-After). 누가 호출하든 **최악의 청구액을 상한**으로 묶는다.
- 구현: `INCR cardai:budget:<endpoint>:<YYYY-MM-DD>` + 첫 호출에 `EXPIRE ~25h`,
  `> dailyMax` 면 503. Upstash 불가 시 통과(rate-limit이 fail-closed로 관장).
- **활성화**: 서버 env `OCR_DAILY_MAX` / `IDENTIFY_DAILY_MAX` / `KAKAO_DAILY_MAX` 에 상한 설정.
  미설정/0 이면 no-op(기본 비활성). 일일 정상 사용량 + 여유를 보고 값 설정 권장.

## 버전 게이트 — 무중단 활성화 ✅ (구현됨)
- `verifyAppRequest`가 `APP_AUTH_MIN_VERSION` 을 읽어, 그 미만(또는 `x-app-version` 미상)인
  구버전 앱은 grace 통과시키고 그 이상만 토큰 강제. 클라이언트는 `x-app-version`(=빌드 버전) 전송.
- **이미 출시된 앱(iOS 1.0.4 등)을 깨지 않고** 신버전부터 인증을 즉시 켤 수 있다.
- ⚠️ `x-app-version` 은 위조 가능 → 보안 경계가 아니라 **마이그레이션 장치**. grace 구간 남용은
  rate-limit(fail-closed) + cost-guard(전역 일일 상한)로 묶인다.
- **활성화 절차(안전)**:
  1. 토큰을 싣는 릴리스 버전 결정(예: 1.2.0). 그 버전으로 웹 재배포 + 네이티브 신규 출시.
  2. Vercel env: `APP_REQUEST_SECRET`, `VITE_APP_REQUEST_SECRET`(동일값), `APP_AUTH_MIN_VERSION=1.2.0`.
  3. 이 시점부터 1.2.0+ 요청은 인증 강제, 구버전(1.0.4 등)은 grace 통과(무중단).
  4. 구버전 사용량이 충분히 소멸하면 `APP_AUTH_MIN_VERSION` 제거 → 전체 strict.

## Phase 2 — 기기 검증(진짜 인증)
- **iOS**: Apple App Attest (DeviceCheck) — 앱이 정품 기기의 정품 앱임을 암호학적으로 증명.
- **Android**: Google Play Integrity API.
- 클라이언트가 attestation 토큰을 받아 전송 → 서버가 Apple/Google로 검증 →
  `verifyAppRequest`가 이 검증을 우선 경로로 사용(공유 토큰은 웹 폴백/회전 보조로 잔존).
- 웹 PWA는 attestation 불가 → 웹 트래픽은 Phase 1 토큰 + 레이트리밋 + 비용캡으로 계속 방어.

## 결정 필요
- Phase 1 토큰을 **즉시 활성화**할지(= Vercel/빌드에 시크릿 주입). 활성화 전까지는 no-op이라
  실제 차단은 아직 레이트리밋+입력검증에 의존한다.
- Phase 1.5(비용 상한) 착수 여부 — 비브라우저 우회까지 비용을 묶는 가장 효과적인 한 수.
