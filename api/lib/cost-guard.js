/**
 * 전역 비용 서킷브레이커 (Phase 1.5)
 *
 * per-IP 레이트리밋은 IP 회전으로 우회 가능하다. 이 가드는 엔드포인트별
 * "하루 총 호출 수"를 Upstash 카운터로 세어 상한(dailyMax)을 넘으면 503으로 막아,
 * 누가 어떻게 호출하든 Vision/Kakao 최악의 일일 청구액을 상한으로 묶는다.
 *
 * - dailyMax <= 0(또는 env 미설정)이면 no-op(통과) — 기본 비활성.
 * - Upstash 불가 시 통과: 그 경우 비용 엔드포인트는 이미 rate-limit이 fail-closed로 막는다.
 */

import { Redis } from '@upstash/redis';

function hasUpstashEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

export async function checkCostBudget(res, { endpoint, dailyMax, day } = {}) {
  if (!dailyMax || dailyMax <= 0) return true; // 비활성
  if (!hasUpstashEnv()) return true; // rate-limit이 이미 fail-closed로 관장

  try {
    const redis = Redis.fromEnv();
    const bucket = day || new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const key = `cardai:budget:${endpoint}:${bucket}`;

    const count = await redis.incr(key);
    if (count === 1) {
      // 첫 호출에만 만료 설정(~25h) — 일 단위 버킷 자동 정리
      await redis.expire(key, 90000);
    }

    if (count > dailyMax) {
      res.setHeader('Retry-After', '3600');
      res.status(503).json({ error: 'Daily capacity reached. Please try again later.' });
      return false;
    }

    return true;
  } catch (error) {
    // 카운터 장애로 정상 사용자를 막지 않는다(비용 한도 체크는 best-effort).
    console.error('[CostGuard] check failed; allowing:', error?.message || error);
    return true;
  }
}
