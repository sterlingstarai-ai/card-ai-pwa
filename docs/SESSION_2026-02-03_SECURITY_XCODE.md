# 세션 기록: GitHub 보안 강화 & Xcode Cloud 수정

**날짜**: 2026-02-03
**프로젝트**: card-ai-pwa, ai-story-book, world-sim

---

## 1. GitHub 보안 강화

### 완료된 작업
- **3개 저장소에 브랜치 보호 규칙 설정** (이후 제거)
  - ai-story-book
  - world-sim
  - card-ai-pwa

- **Dependabot 설정** (3개 저장소)
  ```yaml
  # .github/dependabot.yml
  version: 2
  updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule:
        interval: "weekly"
      ignore:
        - dependency-name: "*"
          update-types: ["version-update:semver-major"]
  ```

### 브랜치 보호 규칙 제거
- 혼자 작업하는 프로젝트라 불편해서 제거
- 명령어: `gh api -X DELETE repos/{owner}/{repo}/rulesets/{id}`

---

## 2. Vercel 배포 오류 수정

### 문제: PWA 캐시 크기 초과
```
Error: One of your files exceeds the maximum precache file size (2.27 MB > 2 MB)
```

### 해결: vite.config.js 수정
```javascript
workbox: {
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
}
```

---

## 3. Xcode Cloud 빌드 오류 수정 (핵심!)

### 문제
```
Could not resolve package dependencies: a resolved file is required when automatic dependency resolution is disabled
```

### 시도했지만 실패한 방법들
1. Package.resolved 파일 추가/수정 - ❌
2. Package.resolved v2 포맷 사용 - ❌
3. originHash 제거 - ❌
4. ci_post_clone.sh에서 패키지 재해결 - ❌
5. WorkspaceSettings.xcsettings 수정 - ❌

### 실제 해결책: 공유 스키마 추가 ✅
```bash
mkdir -p ios/App/App.xcodeproj/xcshareddata/xcschemes/
# App.xcscheme 파일 생성
```

### 교훈
- **에러 메시지가 실제 원인을 가리키지 않음**
- Package.resolved 에러가 나도 **스키마 공유 여부를 먼저 확인**

---

## 4. 최종 필수 파일 목록 (Xcode Cloud)

| 파일 | 용도 |
|------|------|
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | 공유 스키마 (필수!) |
| `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` | SPM 의존성 |
| `ios/App/ci_scripts/ci_post_clone.sh` | 빌드 전 스크립트 |

---

## 5. ci_post_clone.sh 최종 버전

```bash
#!/bin/sh
set -e
cd "$CI_PRIMARY_REPOSITORY_PATH"
brew install node
npm ci
npm run build
npx cap sync ios
# Package.resolved 건드리지 않기!
```

---

## 6. 사용한 주요 명령어

```bash
# GitHub 브랜치 보호 규칙 확인/삭제
gh api repos/{owner}/{repo}/rulesets --jq '.[].id'
gh api -X DELETE repos/{owner}/{repo}/rulesets/{id}

# Xcode 스키마 확인
ls ios/App/App.xcodeproj/xcshareddata/xcschemes/

# 로컬에서 SPM 패키지 해결
cd ios/App && xcodebuild -resolvePackageDependencies -project App.xcodeproj

# Capacitor 동기화
npm ci && npm run build && npx cap sync ios
```

---

## 7. CLAUDE.md 업데이트

Xcode Cloud 트러블슈팅 가이드 추가:
- 빌드 실패 시 확인 순서
- 필수 파일 목록
- 흔한 에러와 실제 원인 매핑
