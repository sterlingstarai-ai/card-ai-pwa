# Rollback Plan

Card AI 프로덕션 롤백 플랜 문서입니다.

## 롤백 시나리오

### 1. 데이터 문제 (혜택/장소 정보 오류)

**증상:**
- 잘못된 혜택 정보 표시
- 누락된 카드/장소
- 데모 시나리오 실패

**롤백 절차:**
```bash
# 1. 문제 커밋 확인
git log --oneline src/data/

# 2. 데이터 파일만 revert
git checkout <이전_커밋_해시> -- src/data/benefits.json
git checkout <이전_커밋_해시> -- src/data/places.json
git checkout <이전_커밋_해시> -- src/data/cards.json

# 3. 검증
node scripts/validate-data.js

# 4. 커밋 & 재배포
git add src/data/
git commit -m "rollback: 데이터 롤백 to <커밋_해시>"
vercel --prod
```

**최근 안정 데이터 커밋:**
- `1db4fa7` - 데이터 품질 검증 완료 (2026-01-16)

---

### 2. 코드 문제 (기능 버그/크래시)

**증상:**
- 앱 로딩 실패
- 기능 동작 안함
- 콘솔 에러 발생

**롤백 절차:**
```bash
# 1. 문제 커밋 확인
git log --oneline -10

# 2. 전체 revert
git revert <문제_커밋_해시>

# 3. 또는 특정 커밋으로 reset (주의: 히스토리 변경)
git reset --hard <안정_커밋_해시>
git push --force origin main  # 위험: 팀 협업 시 주의

# 4. 재배포
vercel --prod
```

**최근 안정 코드 커밋:**
- `ca380bf` - 리그레션 수정 완료 (2026-01-18)
- `0e0ce68` - UX 마감 및 데이터 제보 기능 (2026-01-16)

---

### 3. API 문제 (/api/report 실패)

**증상:**
- 제보 전송 실패
- 500 에러 발생
- GitHub Issue 미생성

**롤백 절차:**
```bash
# 1. API 파일 revert
git checkout <이전_커밋_해시> -- api/report.js

# 2. 재배포
vercel --prod

# 3. 환경변수 확인
vercel env ls
```

**환경변수 체크:**
- `GITHUB_TOKEN` - GitHub PAT (repo scope)
- `GITHUB_REPO` - `sterlingstarai-ai/card-ai-pwa`

---

### 4. Vercel 배포 롤백 (즉시 롤백)

**Vercel 대시보드에서 즉시 롤백:**
1. https://vercel.com/sterlingjangs-projects/card-ai/deployments
2. 이전 배포 선택
3. "..." 메뉴 → "Promote to Production"

**CLI로 롤백:**
```bash
# 이전 배포 목록 확인
vercel ls

# 특정 배포로 promote
vercel promote <deployment_url>
```

---

## 긴급 연락처

| 역할 | 담당 | 연락처 |
|------|------|--------|
| 개발 | - | - |
| 데이터 | - | data@cardai.app |
| 인프라 | Vercel | Dashboard |

---

## 롤백 체크리스트

롤백 후 반드시 확인:

- [ ] `npm run build` 성공
- [ ] `node scripts/validate-data.js` 통과
- [ ] 데모 시나리오 (인천공항 T2) 정상
- [ ] 제보 기능 `/api/report` 정상
- [ ] 오프라인 폴백 동작

---

## 배포 히스토리

| 날짜 | 커밋 | 설명 | 상태 |
|------|------|------|------|
| 2026-01-18 | `ca380bf` | 리그레션 수정 + 오프라인 폴백 | ✅ 안정 |
| 2026-01-16 | `1db4fa7` | 데이터 품질 검증 | ✅ 안정 |
| 2026-01-16 | `0e0ce68` | UX 마감 + 제보 기능 | ✅ 안정 |

---

*최종 업데이트: 2026-01-18*
