/**
 * Vercel Serverless Function: Data Report
 * - 사용자 데이터 제보를 GitHub Issues로 전송
 */

import { handleCors } from './lib/cors.js';
import { checkRateLimit } from './lib/rate-limit.js';

// 좌표 등 위치 PII가 공개 제보(GitHub 이슈)로 새지 않도록 차단.
// - lat/lng 영문 키워드는 \b로 묶어 'Platinum'('lat' 포함) 같은 오탐을 피한다.
// - 한글 좌표 키워드(위도/경도/좌표)도 잡는다.
// - 키워드 없이 단독으로 쓰인 고정밀 좌표(예: '37.566535')와 좌표 쌍(콤마/공백 구분)도 차단.
const PII_PATTERNS = [
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // 카드번호
  /\b\d{3}-\d{4}-\d{4}\b/, // 전화번호
  /\b\d{6}[-]?\d{7}\b/, // 주민등록번호
  /\b(?:lat|lng|latitude|longitude)\b\s*[:=]?\s*-?\d{1,3}(?:\.\d+)?/i, // 영문 좌표 키워드
  /(?:위도|경도|좌표)\s*[:=]?\s*-?\d{1,3}(?:\.\d+)?/, // 한글 좌표 키워드
  /-?\d{2,3}\.\d{5,}\s*[,\s]\s*-?\d{2,3}\.\d{5,}/, // 좌표 쌍 (콤마 또는 공백 구분)
  // 단독 고정밀 좌표: 한국 위경도 정수부 범위(위도 33~43, 경도 124~132)로 한정해
  // '1.25000 배', '19.99000 달러' 같은 정상 소수의 오탐을 막으면서 실제 좌표만 차단
  /(?<![\d.])(?:3[3-9]|4[0-3]|12[4-9]|13[0-2])\.\d{5,}(?![\d.])/,
];

function containsPII(text) {
  return PII_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitizeInput(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

const REPORT_TYPE_LABELS = {
  error: 'bug',
  missing: 'enhancement',
  new: 'new-data',
};

export default async function handler(req, res) {
  const corsResult = handleCors(req, res);
  if (corsResult === 'preflight') return;
  if (corsResult === false) return res.status(403).json({ error: 'Origin not allowed' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // report는 비용이 없는 경로(GitHub 이슈/로그)라 리미터 장애 시 soft-fail 허용.
  // 비용이 발생하는 Vision/Kakao 프록시는 fail-closed가 기본(api/lib/rate-limit.js 참고).
  const rateAllowed = await checkRateLimit(req, res, { max: 3, window: '300 s', prefix: 'report', failOpen: true });
  if (!rateAllowed) return;

  try {
    const { type, cardName, placeName, benefitContent, sourceUrl, description, appVersion, buildNumber } = req.body || {};

    const sanitizedCardName = sanitizeInput(cardName, 50);
    const sanitizedPlaceName = sanitizeInput(placeName, 50);

    if (!sanitizedCardName && !sanitizedPlaceName) {
      return res.status(400).json({ error: '카드명 또는 장소명이 필요합니다' });
    }

    if (!['error', 'missing', 'new'].includes(type)) {
      return res.status(400).json({ error: '잘못된 제보 유형입니다' });
    }

    const allText = `${cardName} ${placeName} ${benefitContent} ${description}`;
    if (containsPII(allText)) {
      return res.status(400).json({
        error: '개인정보(카드번호, 전화번호 등)가 포함된 것 같습니다. 제거 후 다시 시도해주세요.',
      });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'card-ai/data-reports';

    if (!GITHUB_TOKEN) {
      console.log('[Report] GitHub token not configured, logging only');
      console.log(
        '[Report]',
        JSON.stringify({
          type,
          cardName: sanitizedCardName,
          placeName: sanitizedPlaceName,
          benefitContent: sanitizeInput(benefitContent, 100),
          sourceUrl: sanitizeInput(sourceUrl, 200),
          description: sanitizeInput(description, 500),
          appVersion,
          buildNumber,
          timestamp: new Date().toISOString(),
        })
      );

      return res.status(200).json({
        success: true,
        message: '제보가 기록되었습니다',
        fallback: true,
      });
    }

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
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
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

      console.log('[Report] Fallback logging:', {
        type,
        cardName: sanitizedCardName,
        placeName: sanitizedPlaceName,
      });

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
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: '리포트 전송 중 오류가 발생했습니다',
      message: isProduction ? undefined : error.message,
    });
  }
}
