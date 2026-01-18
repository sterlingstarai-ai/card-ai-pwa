# Release Notes v1.0.0

**릴리즈 날짜**: 2026-01-18

## 주요 기능

1. **스마트 카드 추천** - 장소 기반 실시간 혜택 추천
2. **데모 모드** - 카드 없이도 인천공항 T2 시나리오 체험
3. **데이터 제보** - 오류/누락/신규 정보 사용자 제보 기능
4. **오프라인 지원** - PWA + 오프라인 폴백 UX

## 이번 릴리즈 변경사항

### 버그 수정
- 데모 장소 ID 오류 수정 (`incheon-t2` → `icn-t2`)
- ReportModal 오프라인 폴백 UX 추가
- Rate limit 에러 메시지 개선

### 데이터 품질
- 데모 시나리오 5개 혜택 100% 검증 (sourceUrl + lastVerifiedAt)
- 데이터 감사 스크립트 추가 (`scripts/data-audit.js`)

### 보안
- PII 전송 차단 (카드번호, 전화번호, 좌표)
- secrets-check.js 개선

## 검증 결과

| 항목 | 상태 |
|------|------|
| 리그레션 10개 | ✅ 통과 |
| validate-data.js | ✅ 통과 |
| secrets-check.js | ✅ 통과 |
| /api/report | ✅ GitHub Issue 생성 확인 |

## 배포 정보

- **Production**: https://card-ai-pi.vercel.app
- **환경변수**: GITHUB_TOKEN, GITHUB_REPO 설정 완료

## 롤백

문제 발생 시 `docs/ROLLBACK_PLAN.md` 참조
