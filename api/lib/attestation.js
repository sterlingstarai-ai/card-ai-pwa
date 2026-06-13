/**
 * 기기 검증(Attestation) — Phase 2 서버 토대
 *
 * 목적: Apple App Attest / Google Play Integrity로 "정품 기기의 정품 앱"임을 암호학적으로
 * 증명해, 공유 토큰(위조 가능)을 넘어서는 진짜 인증을 네이티브 경로에 제공한다.
 *
 * ⚠️ 현재 상태: 아래 **nonce(챌린지) 인프라는 구현·테스트 완료**, 그러나 실제
 * attestation/assertion **검증은 미구현 stub**이다(네이티브 토큰 + Apple/Google 검증 필요).
 * 전체 설계·남은 작업: docs/PHASE2_ATTESTATION_SPEC.md.
 *
 * 통합 지점(미연결): verifyAppRequest(api/lib/app-auth.js)가 토큰 검사보다 먼저 이 모듈의
 * verify*를 우선 경로로 호출하도록 연결 예정. ATTESTATION_REQUIRED=true 일 때만 강제.
 */

import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';

const CHALLENGE_PREFIX = 'cardai:attest:nonce:';
const CHALLENGE_TTL_SECONDS = 300; // 5분

function hasUpstashEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

export function isAttestationEnforced() {
  return process.env.ATTESTATION_REQUIRED === 'true';
}

/**
 * 1회용 nonce(챌린지) 발급. 클라이언트는 이 nonce를 attest/assert 서명에 포함한다.
 * 서버에 저장되어 재사용/위조를 막는다(replay 방지).
 * @returns {Promise<{ nonce: string, ttl: number } | null>} Upstash 불가 시 null
 */
export async function createChallenge() {
  if (!hasUpstashEnv()) return null;
  const nonce = crypto.randomBytes(32).toString('base64url');
  const redis = Redis.fromEnv();
  await redis.set(`${CHALLENGE_PREFIX}${nonce}`, '1', { ex: CHALLENGE_TTL_SECONDS });
  return { nonce, ttl: CHALLENGE_TTL_SECONDS };
}

/**
 * nonce 1회용 소비(원자적 get-and-delete). 존재하고 처음 소비될 때만 true.
 * 만료/재사용/위조 nonce는 false. 검증 인프라(Upstash)가 없으면 false(fail-closed).
 * @param {string} nonce
 * @returns {Promise<boolean>}
 */
export async function consumeChallenge(nonce) {
  if (!nonce || typeof nonce !== 'string') return false;
  if (!hasUpstashEnv()) return false;
  const redis = Redis.fromEnv();
  const value = await redis.getdel(`${CHALLENGE_PREFIX}${nonce}`);
  return value !== null && value !== undefined;
}

/**
 * Apple App Attest 검증 — 미구현(stub).
 * 실제 구현: CBOR attestation 파싱 → Apple App Attest 루트 인증서 체인 검증 →
 * nonce/RP ID 해시 확인 → 공개키+counter 저장. 이후 요청은 assertion(서명+counter) 검증.
 * 참고: docs/PHASE2_ATTESTATION_SPEC.md
 */
export async function verifyAppleAttestation() {
  throw new Error(
    '[Attestation] Apple App Attest verification not implemented — see docs/PHASE2_ATTESTATION_SPEC.md'
  );
}

/**
 * Google Play Integrity 검증 — 미구현(stub).
 * 실제 구현: 클라이언트 integrity token → Google Play Integrity API로 복호화/검증 →
 * appRecognitionVerdict/deviceIntegrity + nonce 확인.
 * 참고: docs/PHASE2_ATTESTATION_SPEC.md
 */
export async function verifyPlayIntegrity() {
  throw new Error(
    '[Attestation] Play Integrity verification not implemented — see docs/PHASE2_ATTESTATION_SPEC.md'
  );
}
