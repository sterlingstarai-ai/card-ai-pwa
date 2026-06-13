# Phase 2 (기기 Attestation) — 다음 세션 착수 브리프

> 이 문서 = **다음 세션 킥오프/실행 계획**. 설계 상세는 `docs/PHASE2_ATTESTATION_SPEC.md`,
> 인증 전체 로드맵은 `docs/ENDPOINT_AUTH_PLAN.md`. 여기서는 **무엇을·어떤 순서로·무엇이 막혀 있고
> 무엇은 지금 가능한지 + 각 단계 수용 게이트**만 정리한다.

## 0. 세션 시작 시 30초 점검
- 베이스 브랜치: `codex/v1-1-release`(HEAD `6700efe` 기준, Phase 2 토대 머지됨).
- 이미 있는 것(읽고 시작): `api/lib/attestation.js`(nonce 인프라 ✅ + 검증 stub), `api/lib/app-auth.js`(Phase1 토큰 + 버전게이트), `api/lib/cost-guard.js`(비용캡).
- 안전장치 확인: `ATTESTATION_REQUIRED`는 기본 `false`(미구현 검증이 트래픽을 막지 않도록). 작업 중에도 prod에서 켜지 말 것.
- 테스트 베이스라인: `npm run test:unit` (현재 73 green). 새 코드는 TDD로 추가.

## 1. ⛔ 차단 선행조건 (founder/사람 — 코드로 불가)
이게 없으면 **Track B-full·C 검증을 끝까지 못 한다**. 세션 시작 전 founder에게 요청:
- **Apple**: Apple Developer에서 App ID(`com.sterlingstarai.cardai`)에 **App Attest capability** 활성화. (실기기 필요 — 시뮬레이터 attestation 불가)
- **Google**: Google Play Console **Play Integrity API** 사용 설정 + Google Cloud 프로젝트/**서비스계정 키**(서버 검증용).
- **Vercel env**(검증 가동 시): 서비스계정 키 등 검증 시크릿, `ATTESTATION_REQUIRED`(처음엔 false 유지), Upstash 연결(키 저장소·nonce용 — 현재 미연결).
- **실기기**: iOS/Android 물리 기기 (attestation E2E).

## 2. 작업 트랙 (의존성·수용 게이트 명시)

### Track A — 서버 플로우 (✅ 콘솔/기기 없이 지금 가능, 검증은 인터페이스 뒤로)
선행조건 없음. 검증 본체는 Track B의 인터페이스를 호출(초기엔 stub). 전부 mock으로 단위 테스트 가능.
1. **기기 키 저장소** `api/lib/attest-store.js` — 기기별 `{keyId, publicKey, signCount}` + 단기 세션 토큰. Upstash 백엔드. **signCount 갱신은 원자/CAS**(동시 assert replay 차단).
   - 게이트: 저장/조회/CAS 증가 단위 테스트(mock Upstash), signCount 역행/동일 거부.
2. **엔드포인트**: `api/attest-challenge.js`(=`createChallenge` 래퍼) · `api/attest-register.js` · (assert는 헤더 경로로) — 전부 CORS+rate-limit+Phase1 app-auth 적용.
   - 게이트: 통합 테스트(report-api.test.js 패턴), nonce 소비·register 흐름(검증 mock).
3. **`verifyAppRequest` 연결**: 우선순위 = attestation(세션/assertion) → 실패+grace 아님 → Phase1 토큰. `ATTESTATION_REQUIRED=true` & **네이티브 플랫폼**일 때만 강제(웹은 토큰 경로).
   - 게이트: 플래그 off=무영향, on+네이티브+검증실패=403, on+웹=토큰 경로 단위 테스트.

### Track B — 검증 본체
4. **Apple App Attest 검증** `verifyAppleAttestation` — CBOR 파싱 → x5c 체인 → **Apple App Attest Root CA**(공개, 임베드) → nonce/RP ID 해시 → 공개키/signCount 저장. assert: 서명+signCount 단조 검증.
   - 일부 **콘솔 없이 가능**: 공개 테스트 벡터/fixture로 TDD 가능(라이브러리 후보 `node-app-attest`, `@peculiar/asn1-*`/`cbor`). 단 **실기기 fixture가 있어야 최종 확신** → 1번 선행조건 후 실토큰으로 검증.
   - 게이트: 알려진 벡터 단위 테스트 + (선행조건 후) 실기기 토큰 1건 통과/위조 거부.
5. **Play Integrity 검증** `verifyPlayIntegrity` — integrity token → Google API `decodeIntegrityToken` → `appRecognitionVerdict=PLAY_RECOGNIZED`·deviceIntegrity·nonce·packageName 확인.
   - **Google 서비스계정 필요**(선행조건) → 그 전에는 decode 구조/계약만 작성, 실검증은 계정 후.
   - 게이트: 서비스계정 연결 후 실토큰 통과 + 변조 토큰 거부.

### Track C — Capacitor 네이티브 플러그인 (네이티브 툴체인 필요)
6. **iOS 플러그인(Swift)**: DCAppAttestService `generateKey`/`attestKey`/`generateAssertion` 브리지.
7. **Android 플러그인(Kotlin)**: Play Integrity `requestIntegrityToken(nonce)` 브리지.
8. **클라이언트 배선**: 첫 실행 register → `api-client`가 `x-attestation`(또는 세션 토큰) 헤더 첨부.
   - **Xcode/Android Studio + 실기기 필요** → 네이티브 툴체인 있는 환경에서 진행. 빌드(`npm run cap:build:ios|android`)·실기기 E2E가 게이트.
   - 유지되는 공식 Capacitor 플러그인 부재 가능 → 커스텀 작성(스펙 §6).

## 3. 권장 실행 순서
- **세션 1(선행조건 무관, 지금 가능)**: Track A 전부(1→2→3) + Track B-4의 벡터 기반 단위 테스트. `ATTESTATION_REQUIRED` off 유지 → 무중단. PR로 머지.
- **선행조건 확보 후**: B-4/B-5 실토큰 검증 완성 → Track C 네이티브 플러그인(네이티브 환경) → 실기기 E2E.
- **활성화(맨 마지막)**: attestation 싣는 앱 출시 → `ATTESTATION_REQUIRED=true`(버전게이트로 신버전만) → 구버전 소멸 후 전체 강제. (Phase1 버전게이트 메커니즘 그대로 재사용)

## 4. Definition of Done
- 네이티브 앱: 첫 실행 register 성공 → 이후 모든 비용 호출이 attestation 통과.
- 서버: 위조/재전송(signCount·nonce) 거부, `ATTESTATION_REQUIRED=true`에서 미검증 네이티브 403.
- 웹: 영향 없음(Phase1 토큰 경로 유지).
- 비용캡(cost-guard) **항상 병행 유지**(attestation 우회/루팅 대비 최후 상한).
- 게이트 green: lint·unit(신규 포함)·build·secrets + (네이티브 환경) cap build + 실기기 E2E.

## 5. 리스크/함정
- **App Attest는 시뮬레이터 불가** — 실기기 필수. 에뮬레이터 Play Integrity도 제약.
- **signCount replay**: assert마다 단조 증가 확인 + 저장 갱신을 CAS로(동시성). 빠지면 재전송 우회.
- **웹 PWA는 attestation 불가** — 웹 abuse는 attestation으로 못 막음. 웹은 토큰+rate-limit+cost-guard가 한계선(스펙 §9).
- **가짜 검증 금지**: 실토큰/벡터로 검증되기 전엔 `verify*` stub 유지(throw). 절대 "통과" 반환 금지.
- **활성화 타이밍**: 서버 강제는 토큰/attestation 싣는 앱이 충분히 확산된 뒤. 버전게이트로 무중단 보장.

## 6. 참고
- 설계 상세·검증 단계: `docs/PHASE2_ATTESTATION_SPEC.md` (§10 체크리스트가 작업 목록 정본)
- 인증 로드맵·활성화 런북: `docs/ENDPOINT_AUTH_PLAN.md`
- 현재 토대 코드: `api/lib/attestation.js`, `tests/unit/attestation.test.js`
