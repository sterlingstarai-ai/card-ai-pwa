# Phase 2 — 기기 검증(Device Attestation) 구현 스펙

공유 토큰(Phase 1, 위조 가능)을 넘어, **정품 기기의 정품 앱**임을 암호학적으로 증명하는 진짜 인증.
네이티브(iOS/Android) 경로에 적용하며, 웹 PWA는 attestation 불가 → Phase 1 토큰 + rate-limit + cost-guard 유지.

## 0. 현재 진행 상태 (이 PR)
- ✅ `api/lib/attestation.js`: **nonce(챌린지) 인프라 구현·테스트 완료** — `createChallenge`/`consumeChallenge`(1회용, Upstash GETDEL 원자 소비, 5분 TTL), `isAttestationEnforced()`(env 플래그).
- ✅ 검증 **계약(인터페이스)** 정의 — `verifyAppleAttestation`/`verifyPlayIntegrity`는 **stub(throw)**. 가짜 "verified" 절대 반환 안 함.
- ⛔ **미구현(이 환경에서 불가)**: 네이티브 Capacitor 플러그인(Swift/Kotlin), Apple/Google 토큰 검증, 키 저장소, `verifyAppRequest` 연결, Apple/Google 콘솔 설정.

## 1. 위협 모델 / 적용 범위
- 막으려는 것: 비브라우저(curl/스크립트) 및 변조 앱이 Vision/Kakao 프록시를 무료로 악용.
- attestation은 **네이티브 앱** 트래픽에만 가능. 웹 PWA는 불가 → 웹은 Phase 1 토큰 + rate-limit(fail-closed) + cost-guard(전역 일일 상한)로 계속 방어.

## 2. 플로우 개요
```
[첫 실행 — 키 등록(attest)]
 client → GET /api/attest/challenge            (서버: createChallenge → nonce)
 client → 플랫폼 attest(nonce) 생성            (iOS: DCAppAttestService.attestKey / Android: Play Integrity)
 client → POST /api/attest/register {attestation, keyId, platform, nonce}
 server → consumeChallenge(nonce) + 플랫폼 검증 → 공개키/검증결과 저장 → attestation 세션 토큰 발급(짧은 TTL)

[이후 요청 — 매 호출 assert]
 client → 호출마다 assertion/integrity 토큰 동봉(또는 단기 attestation 세션 토큰)
 server(verifyAppRequest) → 검증 통과해야 비용 엔드포인트 진입
```

## 3. iOS — Apple App Attest (DCAppAttestService)
- 전제: Apple Developer에서 App ID에 **App Attest capability** 활성화. 시뮬레이터 미지원(실기기 필요).
- 네이티브:
  - `DCAppAttestService.shared.isSupported` 확인
  - `generateKey()` → keyId (Keychain 보관)
  - `attestKey(keyId, clientDataHash = SHA256(nonce))` → attestation(CBOR)
  - 이후 요청: `generateAssertion(keyId, clientDataHash = SHA256(nonce ‖ requestBody))` → assertion
- 서버 검증(register):
  1. CBOR attestation 파싱 → x5c 인증서 체인 → **Apple App Attest Root CA** 로 검증
  2. nonce(authData의 RP ID hash + clientDataHash) 확인, aaguid 확인(prod=appattest)
  3. credId, **공개키, signCount=0** 저장(기기별)
- 서버 검증(assert): 저장 공개키로 서명 검증 + **signCount 단조 증가** 확인(replay 방지) + nonce 소비.
- 참고: Apple "Validating Apps That Connect to Your Server". node 라이브러리 후보: `node-app-attest`, `@peculiar/*`(CBOR/x509).

## 4. Android — Play Integrity API
- 전제: Google Play Console에서 Play Integrity 활성화 + Google Cloud 프로젝트/서비스계정.
- 네이티브: `IntegrityManager.requestIntegrityToken(nonce)` → integrity token.
- 서버 검증: Play Integrity API(`decodeIntegrityToken`)로 복호화/검증 →
  `appRecognitionVerdict == PLAY_RECOGNIZED`, `deviceIntegrity` 만족, `requestDetails.nonce == 발급 nonce`, `packageName == com.sterlingstarai.cardai` 확인.
- 토큰은 단기. assert 단계는 요청별 integrity token 또는 단기 세션 토큰.

## 5. 서버 컴포넌트 (TODO)
- `GET /api/attest/challenge` — `createChallenge()` 래퍼. CORS + rate-limit + Phase1 app-auth 적용. (lib는 준비됨; 엔드포인트만 추가)
- `POST /api/attest/register` — 플랫폼별 `verifyAppleAttestation`/`verifyPlayIntegrity` 호출 → 기기 공개키/검증결과 저장 → 단기 attestation 세션 토큰 발급.
- **키/세션 저장소**: 기기별 {keyId, publicKey, signCount} + 세션 토큰. Upstash(또는 정식 DB). signCount 갱신은 CAS/원자 연산으로(동시 assert replay 방지).
- `verifyAppRequest` 연결: 우선순위 = attestation 세션/assertion → (실패+grace 아님) → Phase1 토큰. `ATTESTATION_REQUIRED=true`이고 플랫폼이 네이티브일 때만 강제. 웹은 토큰 경로.

## 6. Capacitor 플러그인
- 유지되는 공식 플러그인 부재 가능성 → **커스텀 플러그인** 작성 또는 커뮤니티 검토.
  - iOS: Swift로 DCAppAttestService 브리지.
  - Android: Kotlin으로 Play Integrity 브리지.
- 클라이언트 흐름: 첫 실행 register → 토큰을 `api-client`가 헤더로 첨부(`x-attestation`).

## 7. 설정 전제(콘솔)
- Apple Developer: App ID App Attest capability, 프로덕션 환경 설정.
- Google: Play Integrity API 사용 설정, Cloud 프로젝트 + 서비스계정 키(서버 env).
- Vercel env: `ATTESTATION_REQUIRED`(기본 false), 서비스계정/Apple 검증용 키, 저장소 연결.

## 8. 롤아웃 (무중단)
- Phase 1 버전 게이트와 동일 전략: attestation을 싣는 릴리스부터 `x-app-version >= N`에 한해 강제.
- 단계: (1) attestation 지원 앱 출시 → (2) 서버 검증 가동 + `ATTESTATION_REQUIRED=true`(신버전만) → (3) 구버전 소멸 후 전체 강제.
- 웹은 전 구간 Phase 1 토큰 경로 유지.

## 9. 정직한 한계
- 웹 PWA는 attestation 불가 — 웹 트래픽의 봇/abuse는 attestation으로 못 막는다. 웹은 토큰+rate-limit+cost-guard가 한계선.
- attestation도 만능 아님(루팅/탈옥/MITM 일부 우회 가능) — 비용 상한(cost-guard)은 항상 병행 유지.

## 10. 남은 작업 체크리스트
- [ ] Capacitor App Attest 플러그인(iOS Swift)
- [ ] Capacitor Play Integrity 플러그인(Android Kotlin)
- [ ] `verifyAppleAttestation` 실제 구현(CBOR/x509/cert chain/nonce/signCount)
- [ ] `verifyPlayIntegrity` 실제 구현(Google API decode/verify)
- [ ] 기기 키·세션 저장소(Upstash/DB) + signCount CAS
- [ ] `/api/attest/challenge`·`/api/attest/register` 엔드포인트
- [ ] `verifyAppRequest` 연결(우선순위 + ATTESTATION_REQUIRED + 플랫폼 구분)
- [ ] Apple/Google 콘솔 설정 + Vercel env
- [ ] 실기기 E2E(시뮬레이터/에뮬레이터 attestation 제약 주의)
