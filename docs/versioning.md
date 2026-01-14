# Card AI 버전 관리 규칙

## 버전 형식

```
MAJOR.MINOR.PATCH (BUILD_NUMBER)
예: 1.2.3 (42)
```

### 의미

| 구성 요소 | 의미 | 예시 |
|---------|------|------|
| **MAJOR** | 대규모 변경, 호환성 변경 | 전체 UI 리뉴얼, API 변경 |
| **MINOR** | 새로운 기능 추가 | 새 카드사 추가, 새 기능 |
| **PATCH** | 버그 수정, 데이터 업데이트 | 혜택 정보 수정, 버그 수정 |
| **BUILD_NUMBER** | 각 릴리즈별 고유 번호 | 스토어 제출시 필수 증가 |

## 버전 업데이트 위치

### 1. package.json
```json
{
  "version": "1.0.0"
}
```

### 2. App.jsx CONFIG
```javascript
BUILD: {
  VERSION: '1.0.0',
  BUILD_NUMBER: '1',
  ...
}
```

### 3. iOS (Xcode)
- **MARKETING_VERSION**: 1.0.0 (앱 스토어 표시)
- **CURRENT_PROJECT_VERSION**: 1 (빌드 번호)

위치: `ios/App/App.xcodeproj/project.pbxproj`

### 4. Android (build.gradle)
```groovy
android {
    defaultConfig {
        versionCode 1        // BUILD_NUMBER (정수, 매 업로드마다 증가)
        versionName "1.0.0"  // VERSION
    }
}
```

위치: `android/app/build.gradle`

## 버전 증가 규칙

### 스토어 제출 전 필수
1. **BUILD_NUMBER / versionCode**: 항상 증가 (이전보다 큰 값)
2. **VERSION / versionName**: 변경사항에 따라 MAJOR.MINOR.PATCH 중 하나 증가

### 예시 시나리오

| 상황 | 이전 | 이후 |
|-----|-----|-----|
| 버그 수정 | 1.0.0 (1) | 1.0.1 (2) |
| 새 기능 추가 | 1.0.1 (2) | 1.1.0 (3) |
| 동일 버전 재제출 | 1.1.0 (3) | 1.1.0 (4) |
| 대규모 업데이트 | 1.1.0 (4) | 2.0.0 (5) |

## 버전 업데이트 체크리스트

```bash
# 1. package.json 수정
# 2. App.jsx CONFIG.BUILD 수정
# 3. iOS 빌드 설정 (Xcode에서)
# 4. Android build.gradle 수정
# 5. 빌드 및 테스트
# 6. 태그 생성
git tag -a v1.0.0 -m "Release v1.0.0"
```

## Git 태그 규칙

```bash
# 형식
v{VERSION}

# 예시
git tag -a v1.0.0 -m "Release v1.0.0: 초기 릴리즈"
git push origin v1.0.0
```

## 빌드 환경 변수

빌드 시 자동 주입 가능:

```bash
# .env 또는 CI/CD에서 설정
VITE_COMMIT_HASH=$(git rev-parse --short HEAD)
VITE_BUILD_DATE=$(date +%Y-%m-%d)
```
