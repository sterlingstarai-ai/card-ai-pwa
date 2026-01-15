/**
 * Vercel Serverless Function: Data Report
 * - 사용자 데이터 제보를 GitHub Issues로 전송
 * - PII 보호: 카드 번호, 좌표, OCR 텍스트 수집 금지
 * - Rate Limit 적용 (IP당 5분당 3회)
 */

// 허용된 Origin 목록 (CORS 보안)
const ALLOWED_ORIGINS = [
  'https://card-ai-pi.vercel.app',
  'https://card-ai.vercel.app',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Origin 검증
function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith('.vercel.app')
  );
}

// Rate Limiter (5분당 3회)
const rateLimitMap = new Map();
const RATE_LIMIT = {
  windowMs: 5 * 60 * 1000, // 5분
  maxRequests: 3,          // 5분당 3회 (IP당)
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

// 메모리 정리
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.firstRequest > RATE_LIMIT.windowMs * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

// PII 패턴 검출
const PII_PATTERNS = [
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,  // 카드 번호
  /\b\d{3}-\d{4}-\d{4}\b/,                         // 전화번호
  /\b\d{6}[-]?\d{7}\b/,                            // 주민번호
  /lat|lng|latitude|longitude|\d{2}\.\d{5,}/i,   // 좌표
];

function containsPII(text) {
  return PII_PATTERNS.some(pattern => pattern.test(text));
}

// 입력값 정제
function sanitizeInput(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

// GitHub Issue 라벨
const REPORT_TYPE_LABELS = {
  error: 'bug',
  missing: 'enhancement',
  new: 'new-data',
};

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // CORS
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limit
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.socket?.remoteAddress ||
                   'unknown';
  const rateCheck = checkRateLimit(clientIp);

  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', rateCheck.resetIn);
    return res.status(429).json({
      error: '제보 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: rateCheck.resetIn
    });
  }

  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

  try {
    const {
      type,
      cardName,
      placeName,
      benefitContent,
      sourceUrl,
      description,
      appVersion,
      buildNumber,
    } = req.body;

    // 필수 필드 검증
    const sanitizedCardName = sanitizeInput(cardName, 50);
    const sanitizedPlaceName = sanitizeInput(placeName, 50);

    if (!sanitizedCardName && !sanitizedPlaceName) {
      return res.status(400).json({ error: '카드명 또는 장소명이 필요합니다' });
    }

    // 제보 유형 검증
    if (!['error', 'missing', 'new'].includes(type)) {
      return res.status(400).json({ error: '잘못된 제보 유형입니다' });
    }

    // PII 검출
    const allText = `${cardName} ${placeName} ${benefitContent} ${description}`;
    if (containsPII(allText)) {
      return res.status(400).json({
        error: '개인정보(카드번호, 전화번호 등)가 포함된 것 같습니다. 제거 후 다시 시도해주세요.'
      });
    }

    // GitHub Issue 생성 (환경변수 필요)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'card-ai/data-reports';

    // GitHub 토큰이 없으면 이메일 폴백
    if (!GITHUB_TOKEN) {
      console.log('[Report] GitHub token not configured, logging only');
      console.log('[Report]', JSON.stringify({
        type,
        cardName: sanitizedCardName,
        placeName: sanitizedPlaceName,
        benefitContent: sanitizeInput(benefitContent, 100),
        sourceUrl: sanitizeInput(sourceUrl, 200),
        description: sanitizeInput(description, 500),
        appVersion,
        buildNumber,
        timestamp: new Date().toISOString(),
      }));

      return res.status(200).json({
        success: true,
        message: '제보가 기록되었습니다',
        fallback: true,
      });
    }

    // GitHub Issue 생성
    const typeEmoji = type === 'error' ? '🔧' : type === 'missing' ? '➕' : '🆕';
    const typeLabel = type === 'error' ? '오류 수정' : type === 'missing' ? '누락 추가' : '신규 제보';

    const issueTitle = `[${typeLabel}] ${sanitizedCardName || sanitizedPlaceName}`;
    const issueBody = `
## ${typeEmoji} ${typeLabel}

### 제보 정보
- **카드명**: ${sanitizedCardName || '-'}
- **장소명**: ${sanitizedPlaceName || '-'}
- **혜택 내용**: ${sanitizeInput(benefitContent, 100) || '-'}

### 출처
${sanitizeInput(sourceUrl, 200) || '-'}

### 상세 설명
${sanitizeInput(description, 500) || '-'}

---
📱 App v${appVersion || 'unknown'} (${buildNumber || 'unknown'})
🕐 ${new Date().toISOString()}
    `.trim();

    const [owner, repo] = GITHUB_REPO.split('/');

    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Card-AI-Report-Bot',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: [REPORT_TYPE_LABELS[type], 'user-report'],
      }),
    });

    if (!githubResponse.ok) {
      const errorData = await githubResponse.text();
      console.error('[Report] GitHub API error:', errorData);

      // GitHub 실패해도 로그는 남김
      console.log('[Report] Fallback logging:', { type, cardName: sanitizedCardName, placeName: sanitizedPlaceName });

      return res.status(200).json({
        success: true,
        message: '제보가 기록되었습니다',
        fallback: true,
      });
    }

    const issueData = await githubResponse.json();

    return res.status(200).json({
      success: true,
      message: '제보가 접수되었습니다',
      issueNumber: issueData.number,
    });

  } catch (error) {
    console.error('[Report] Error:', error);
    return res.status(500).json({
      error: '제보 처리 중 오류가 발생했습니다',
      message: error.message,
    });
  }
}
