/**
 * Vercel Serverless Function: Vision Identify (Lens-like)
 * - Uses Google Cloud Vision API features:
 *   - WEB_DETECTION: bestGuessLabels/webEntities (closest to Google Lens behavior)
 *   - DOCUMENT_TEXT_DETECTION: OCR fallback
 *   - LOGO_DETECTION: card network / issuer logo hints
 */

export const config = {
  api: {
    bodyParser: {
      // base64 JSON payload grows quickly; keep margin.
      sizeLimit: '8mb',
    },
  },
};

const ALLOWED_ORIGINS = [
  'https://card-ai-pi.vercel.app',
  'https://card-ai.vercel.app',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === 'null') return true;
  return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.endsWith('.vercel.app'));
}

const rateLimitMap = new Map();
const RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 8,
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

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.firstRequest > RATE_LIMIT.windowMs * 2) rateLimitMap.delete(ip);
  }
}, 60 * 1000);

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'https://card-ai-pi.vercel.app');
  } else {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', rateCheck.resetIn);
    return res.status(429).json({
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: rateCheck.resetIn,
    });
  }
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

  const VISION_API_KEY = process.env.VISION_API_KEY;
  if (!VISION_API_KEY) {
    console.error('VISION_API_KEY not configured');
    return res.status(500).json({ error: 'Vision service not configured' });
  }

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [
              { type: 'WEB_DETECTION', maxResults: 10 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
              { type: 'LOGO_DETECTION', maxResults: 5 },
              { type: 'LABEL_DETECTION', maxResults: 10 },
            ],
            imageContext: { languageHints: ['ko', 'en'] },
          }],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text();
      console.error('Vision API error:', errorData);
      return res.status(visionResponse.status).json({
        error: 'Vision API request failed',
        details: visionResponse.status === 403 ? 'API quota exceeded or invalid key' : 'Unknown error',
      });
    }

    const data = await visionResponse.json();
    const response = data.responses?.[0] || {};

    const fullTextAnnotation = response.fullTextAnnotation;
    const textAnnotations = response.textAnnotations;
    const logoAnnotations = response.logoAnnotations || [];
    const labelAnnotations = response.labelAnnotations || [];

    const webDetection = response.webDetection || {};

    const fullText = fullTextAnnotation?.text || textAnnotations?.[0]?.description || '';

    const logos = logoAnnotations.map(logo => ({
      description: logo.description,
      score: logo.score,
    }));

    const labels = labelAnnotations.map(l => ({
      description: l.description,
      score: l.score,
    }));

    const bestGuessLabels = (webDetection.bestGuessLabels || []).map(b => b.label).filter(Boolean);
    const webEntities = (webDetection.webEntities || []).map(e => ({
      description: e.description,
      score: e.score,
    })).filter(e => e.description);

    return res.status(200).json({
      success: true,
      text: fullText,
      logos,
      labels,
      web: {
        bestGuessLabels,
        webEntities,
      },
    });
  } catch (error) {
    console.error('Vision identify error:', error);
    // 프로덕션에서는 내부 오류 상세를 노출하지 않음
    const isProduction = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: 'Vision identify failed',
      message: isProduction ? '이미지 분석 중 오류가 발생했습니다' : (error?.message || String(error)),
    });
  }
}
