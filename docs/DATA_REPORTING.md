# Data Reporting System

## Overview

Card AI의 데이터 제보 시스템 기술 문서입니다. 사용자가 오류/누락/신규 데이터를 제보할 수 있는 기능을 제공합니다.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ReportModal   │────▶│   /api/report    │────▶│  GitHub Issues  │
│   (Frontend)    │     │   (Serverless)   │     │   (Storage)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Components

### 1. ReportModal (`src/components/ReportModal.jsx`)

사용자 인터페이스 컴포넌트.

**Props:**
- `isOpen`: 모달 표시 여부
- `onClose`: 닫기 콜백
- `showToast`: 토스트 메시지 표시 함수
- `prefillCardName`: 카드명 자동 채움
- `prefillPlaceName`: 장소명 자동 채움

**Features:**
- 제보 유형 선택 (오류/누락/신규)
- 카드명, 장소명, 혜택 내용 입력
- 출처 URL, 상세 설명 입력
- 30초 로컬 쿨다운

### 2. API Endpoint (`api/report.js`)

Vercel Serverless Function.

**Endpoint:** `POST /api/report`

**Request Body:**
```json
{
  "type": "error|missing|new",
  "cardName": "카드명",
  "placeName": "장소명",
  "benefitContent": "혜택 내용",
  "sourceUrl": "https://...",
  "description": "상세 설명",
  "appVersion": "1.0.0",
  "buildNumber": "1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "제보가 접수되었습니다",
  "issueNumber": 123
}
```

**Error Responses:**
- `400`: 잘못된 입력 (필수 필드 누락, PII 검출)
- `403`: CORS 오류
- `429`: Rate Limit 초과
- `500`: 서버 오류

## Security

### Rate Limiting

| Level | Limit | Window |
|-------|-------|--------|
| Client (Local) | 30초 | Per submission |
| Server (IP) | 3회 | 5분 |

### PII Protection

다음 패턴이 검출되면 제보가 거부됩니다:

- 카드 번호: `\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}`
- 전화번호: `\d{3}-\d{4}-\d{4}`
- 주민번호: `\d{6}[-]?\d{7}`
- GPS 좌표: `lat|lng|latitude|longitude|\d{2}\.\d{5,}`

### CORS Policy

허용된 Origin:
- `https://card-ai-pi.vercel.app`
- `https://card-ai.vercel.app`
- `https://*.vercel.app`
- `capacitor://localhost`
- `http://localhost:*`

## GitHub Integration

### Environment Variables

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPO=owner/repo-name
```

### Issue Labels

| Report Type | Label |
|-------------|-------|
| 오류 수정 | `bug` |
| 누락 추가 | `enhancement` |
| 신규 제보 | `new-data` |

공통 라벨: `user-report`

### Issue Template

```markdown
## [emoji] [제보유형]

### 제보 정보
- **카드명**: ...
- **장소명**: ...
- **혜택 내용**: ...

### 출처
...

### 상세 설명
...

---
📱 App v1.0.0 (1)
🕐 2024-01-01T00:00:00.000Z
```

## Fallback Behavior

GitHub Token이 설정되지 않은 경우:
1. 서버 로그에 제보 내용 기록
2. 사용자에게는 성공 응답 반환
3. `fallback: true` 플래그 포함

## Testing

### Local Testing

```bash
# 1. Start dev server
npm run dev

# 2. Open ReportModal from:
#    - BenefitDetailModal > 📝 button
#    - Settings > "정보 수정 제보"

# 3. Submit test report
```

### API Testing

```bash
curl -X POST http://localhost:3000/api/report \
  -H "Content-Type: application/json" \
  -d '{
    "type": "error",
    "cardName": "테스트 카드",
    "placeName": "테스트 장소",
    "appVersion": "1.0.0"
  }'
```

## Monitoring

### Metrics to Track

1. **제보량**: 일별/주별 제보 수
2. **유형 분포**: 오류/누락/신규 비율
3. **처리율**: Issue 생성 성공률
4. **Rate Limit**: 429 응답 빈도

### Error Logging

모든 에러는 Vercel Functions 로그에 기록됩니다:
```
[Report] GitHub API error: ...
[Report] Fallback logging: {...}
```

## Changelog

### v1.0.0 (Initial)
- ReportModal 컴포넌트 추가
- /api/report 엔드포인트 구현
- GitHub Issues 연동
- Rate Limiting 적용
- PII 보호 로직 구현
