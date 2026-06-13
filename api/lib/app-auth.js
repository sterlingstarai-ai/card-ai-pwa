/**
 * 앱 요청 인증 (endpoint auth) — Phase 1
 *
 * 목적: 비용이 드는 프록시(Vision/Kakao)가 비브라우저(curl 등) 제3자에게
 * "무료 프록시"로 악용되는 것을 막는다. CORS는 브라우저만 막으므로 부족하다.
 *
 * Phase 1 (현재): 공유 앱 토큰
 *   - 클라이언트가 `x-app-token` 헤더로 VITE_APP_REQUEST_SECRET 전송
 *   - 서버가 APP_REQUEST_SECRET 과 상수시간 비교
 *   - ⚠️ 한계: 웹 번들의 토큰은 devtools로 노출 가능 → 웹에서는 "캐주얼/스크립트성
 *     남용 차단 + 회전(rotation) 가능"의 소프트 게이트. 네이티브(Capacitor) 바이너리에
 *     박힌 토큰은 추출이 훨씬 어려워 네이티브 경로엔 실효가 있다.
 *   - APP_REQUEST_SECRET 미설정 시: 통과(no-op) — 기존 배포 무중단. 단 1회 경고 로그.
 *
 * Phase 2 (계획): 기기 검증(Apple App Attest / Google Play Integrity)을 이 함수에
 *   드롭인. docs/ENDPOINT_AUTH_PLAN.md 참조.
 */

import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

let warnedMissingSecret = false;

export function verifyAppRequest(req) {
  const secret = process.env.APP_REQUEST_SECRET;

  if (!secret) {
    if (!warnedMissingSecret) {
      console.warn(
        '[AppAuth] APP_REQUEST_SECRET not set — app-request verification disabled ' +
          '(non-browser callers can reach cost endpoints; see docs/ENDPOINT_AUTH_PLAN.md)'
      );
      warnedMissingSecret = true;
    }
    return { ok: true, reason: 'disabled' };
  }

  const token = req.headers['x-app-token'];
  if (!token || !safeEqual(token, secret)) {
    return { ok: false, reason: 'invalid-token' };
  }

  return { ok: true, reason: 'token' };
}
