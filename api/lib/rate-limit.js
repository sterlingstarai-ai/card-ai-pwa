import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  return forwarded || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function hasUpstashEnv() {
  // Redis.fromEnv()가 허용하는 모든 변수명을 반영(UPSTASH_* 및 Vercel KV의 KV_REST_API_*).
  // 한쪽만 검사하면 KV로 프로비저닝된 배포에서 리미터가 정상인데도 전 비용 트래픽이 503으로 막힌다.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

/**
 * 한도 판정을 내릴 수 없을 때(Upstash 미설정/장애)의 처리.
 * - 기본은 FAIL-CLOSED: 비용이 발생하는 엔드포인트(Vision/Kakao 프록시)는
 *   리미터가 죽으면 무제한 호출 = 비용-DoS로 직결되므로 503으로 막는다.
 * - failOpen:true는 비용이 없는 경로(예: /api/report → GitHub 이슈)에서만
 *   명시적으로 선택한다. fake한 X-RateLimit-Remaining 헤더는 내보내지 않는다(장애 은폐 방지).
 */
function handleLimiterUnavailable(res, { failOpen, reason }) {
  console.error(`[RateLimit] limiter unavailable (${reason}); ${failOpen ? 'failing open' : 'failing closed'}`);

  if (failOpen) {
    return true;
  }

  res.setHeader('Retry-After', '30');
  res.status(503).json({ error: 'Service temporarily unavailable. Please try again shortly.' });
  return false;
}

export async function checkRateLimit(
  req,
  res,
  { max = 10, window = '60 s', prefix = 'default', failOpen = false } = {}
) {
  if (!hasUpstashEnv()) {
    return handleLimiterUnavailable(res, { failOpen, reason: 'missing env' });
  }

  try {
    const identifier = `${prefix}:${getClientIp(req)}`;

    const rl = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, window),
      analytics: true,
      prefix: `cardai:${prefix}`,
    });

    const { success, limit, remaining, reset } = await rl.limit(identifier);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(reset));

    if (!success) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return false;
    }

    return true;
  } catch (error) {
    return handleLimiterUnavailable(res, { failOpen, reason: error?.message || String(error) });
  }
}
