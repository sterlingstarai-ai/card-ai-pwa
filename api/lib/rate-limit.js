import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  return forwarded || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

export async function checkRateLimit(req, res, { max = 10, window = '60 s', prefix = 'default' } = {}) {
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
    console.error('[RateLimit] Upstash unavailable, bypassing limit:', error?.message || error);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max));
    res.setHeader('X-RateLimit-Reset', '0');
    return true;
  }
}
