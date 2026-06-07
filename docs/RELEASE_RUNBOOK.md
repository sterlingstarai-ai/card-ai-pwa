# Release Runbook

Card AI v1.0.0 릴리즈 런북

## 1. 배포 전 체크리스트

### 코드 품질
```bash
# 로컬 릴리즈 프리플라이트
npm run release:preflight
```

### 환경변수 확인
```bash
# Vercel 환경변수 확인
vercel env ls

# 필수 환경변수:
# - GITHUB_TOKEN (repo scope)
# - GITHUB_REPO (sterlingstarai-ai/card-ai-pwa)
# - VITE_KAKAO_APP_KEY (Kakao Maps)
```

### 데이터 품질
```bash
# 데이터 감사 실행
node scripts/data-audit.js

# 데모 시나리오 확인
# - 장소: icn-t2 (인천공항 T2)
# - 카드: hyundai-purple, samsung-taptap-o, shinhan-the-best
```

프리플라이트 스크립트는 아래 항목을 자동으로 묶습니다.
- `lint`
- `validate`
- `test:unit`
- `test:e2e`
- `build`
- `secrets:check`
- PWA 빌드 아티팩트 확인
- `data-audit` 실행 및 리포트 경고 출력

### UX 회귀 스모크
- 하단 탭 전환 시 스크롤이 이전 탭 위치를 물고 가지 않는지 확인
- 홈 검색에서 혜택 선택 시 Benefits 탭 필터와 해당 카테고리 섹션이 함께 열리는지 확인
- 장소 시트/혜택 상세/OCR/제보 모달이 헤더·하단 탭보다 위에 올라오고 닫기 동작이 자연스러운지 확인
- 장소 시트 카테고리 필터에서 `cafe`, `mart` 실시간 로딩과 기본 정적 필터가 모두 비어 있지 않은지 확인

---

## 2. 배포 절차

### 2.1 스테이징 배포
```bash
# 1. 코드 푸시
git add -A && git commit -m "release: v1.0.0" && git push origin main

# 2. 스테이징 배포
vercel

# 3. 스테이징 URL에서 수동 테스트
# - 데모 모드 진입
# - 카드 추가/삭제
# - 장소 검색
# - 제보 기능
```

### 2.2 프로덕션 배포
```bash
# 프로덕션 배포
vercel --prod

# 배포 확인
curl -s https://card-ai-pi.vercel.app | head -20

# 배포 후 스모크
npm run release:postdeploy -- https://card-ai-pi.vercel.app
```

### 2.3 네이티브 앱 빌드

**iOS:**
```bash
# 빌드 및 Xcode 열기
npm run cap:ios

# Xcode에서:
# 1. Product > Archive
# 2. Distribute App > App Store Connect
```

**Android:**
```bash
# 빌드 및 Android Studio 열기
npm run cap:android

# Android Studio에서:
# 1. Build > Generate Signed Bundle
# 2. Google Play Console 업로드
```

---

## 3. 모니터링

### 3.1 핵심 지표

| 지표 | 정상 범위 | 알림 조건 |
|------|----------|----------|
| API 응답시간 | < 500ms | > 2000ms |
| 에러율 | < 1% | > 5% |
| 제보 API 성공률 | > 95% | < 80% |

### 3.2 로그 확인
```bash
# Vercel 함수 로그
vercel logs --follow

# 특정 배포 로그
vercel logs <deployment-url>
```

### 3.3 Sentry 대시보드
- URL: https://sentry.io/ (프로젝트 설정 후)
- 주요 알림: Unhandled Exception, API Failure

### 3.4 수동 헬스체크
```bash
# 웹앱 접속 확인
curl -I https://card-ai-pi.vercel.app

# API 엔드포인트 확인
curl -X POST https://card-ai-pi.vercel.app/api/report \
  -H "Content-Type: application/json" \
  -d '{"type":"test","cardName":"테스트"}'
```

---

## 4. 롤백 절차

> 상세 내용: [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md)

### 4.1 즉시 롤백 (Vercel 대시보드)
1. https://vercel.com/sterlingjangs-projects/card-ai/deployments
2. 이전 배포 선택 → "..." → "Promote to Production"

### 4.2 CLI 롤백
```bash
# 배포 목록 확인
vercel ls

# 특정 배포로 롤백
vercel promote <deployment-url>
```

### 4.3 코드 롤백
```bash
# 문제 커밋 revert
git revert <commit-hash>
git push origin main

# 재배포
vercel --prod
```

---

## 5. 긴급 대응

### P0 (서비스 불가)
1. 즉시 Vercel 롤백
2. 원인 파악 (로그 분석)
3. 핫픽스 후 재배포

### P1 (핵심 기능 장애)
1. 기능 킬스위치 확인 (`CONFIG.FEATURES`)
2. 임시 비활성화 후 수정

### P2 (경미한 버그)
1. 이슈 등록
2. 다음 릴리즈에 포함

---

## 6. 검증 명령어 요약

```bash
# 전체 CI 파이프라인
npm run ci

# 릴리즈 직전
npm run release:preflight

# 배포 직후
npm run release:postdeploy -- https://card-ai-pi.vercel.app
```

---

## 7. 연락처

| 역할 | 연락처 |
|------|--------|
| 개발 | - |
| 데이터 | sterling.star.ai@gmail.com |
| 지원 | sterling.star.ai@gmail.com |
| 인프라 | Vercel Dashboard |

---

*최종 업데이트: 2026-01-18*
