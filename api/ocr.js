/**
 * Vercel Serverless Function: OCR Proxy
 * - Proxies requests to Google Cloud Vision API
 * - Keeps VISION_API_KEY secure on server side
 * - Rate limiting and error handling included
 * - CORS restricted to allowed origins
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // 압축된 이미지용 (클라이언트에서 1920px, 80% JPEG 압축)
    },
  },
};

// 허용된 Origin 목록 (CORS 보안)
const ALLOWED_ORIGINS = [
  'https://card-ai-pi.vercel.app',
  'https://card-ai.vercel.app',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000',
];

// Origin 검증
function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith('.vercel.app')
  );
}

// 간단한 인메모리 레이트 리미터 (Vercel cold start 시 리셋됨)
// 프로덕션에서는 Vercel KV나 Upstash Redis 권장
const rateLimitMap = new Map();
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1분
  maxRequests: 10,     // 분당 10회 (IP당)
};

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.firstRequest > RATE_LIMIT.windowMs) {
    rateLimitMap.set(ip, { firstRequest: now, count: 1 });
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    const resetTime = Math.ceil((record.firstRequest + RATE_LIMIT.windowMs - now) / 1000);
    return { allowed: false, resetIn: resetTime };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - record.count };
}

// 오래된 레코드 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.firstRequest > RATE_LIMIT.windowMs * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // CORS 검증
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // 서버 간 호출이나 같은 origin (Vercel)
    res.setHeader('Access-Control-Allow-Origin', 'https://card-ai-pi.vercel.app');
  } else {
    // 허용되지 않은 origin
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 레이트 리미트 체크
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.socket?.remoteAddress ||
                   'unknown';
  const rateCheck = checkRateLimit(clientIp);

  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', rateCheck.resetIn);
    return res.status(429).json({
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: rateCheck.resetIn
    });
  }

  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

  const VISION_API_KEY = process.env.VISION_API_KEY;

  if (!VISION_API_KEY) {
    console.error('VISION_API_KEY not configured');
    return res.status(500).json({ error: 'OCR service not configured' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 10 }]
          }]
        })
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text();
      console.error('Vision API error:', errorData);
      return res.status(visionResponse.status).json({
        error: 'Vision API request failed',
        details: visionResponse.status === 403 ? 'API quota exceeded or invalid key' : 'Unknown error'
      });
    }

    const data = await visionResponse.json();

    // Extract text from response
    const textAnnotations = data.responses?.[0]?.textAnnotations;
    const fullText = textAnnotations?.[0]?.description || '';

    return res.status(200).json({
      success: true,
      text: fullText,
      annotations: textAnnotations?.slice(1) || [] // Individual word annotations
    });

  } catch (error) {
    console.error('OCR proxy error:', error);
    return res.status(500).json({
      error: 'OCR processing failed',
      message: error.message
    });
  }
}
