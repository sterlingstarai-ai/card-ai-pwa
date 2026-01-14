# Card AI 릴리즈 절차

## 개요

Card AI는 세 가지 배포 채널을 지원합니다:
1. **웹 (PWA)**: Vercel 자동 배포
2. **iOS**: App Store (TestFlight 포함)
3. **Android**: Google Play Store (내부 테스트 포함)

---

## 1. 웹 배포 (Vercel)

### 자동 배포 (권장)
```bash
# main 브랜치에 푸시하면 자동 배포
git push origin main
```

### 수동 배포
```bash
# 프로덕션 빌드
npm run build

# Vercel CLI로 배포
npx vercel --prod
```

### 배포 전 체크리스트
- [ ] `npm run validate` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] `npm run secrets:check` 통과

---

## 2. iOS 빌드 및 배포

### 2.1 빌드 준비
```bash
# 웹 빌드 + Capacitor 동기화
npm run cap:build:ios

# Xcode 프로젝트 열기
npm run cap:ios
# 또는: npx cap open ios
```

### 2.2 Xcode 설정 확인
1. **Signing & Capabilities**
   - Team: Apple Developer 계정 선택
   - Bundle Identifier: `com.cardai.app`
   - Provisioning Profile: 자동 또는 수동 설정

2. **버전 업데이트**
   - MARKETING_VERSION (예: 1.0.0)
   - CURRENT_PROJECT_VERSION (빌드 번호, 항상 증가)

### 2.3 TestFlight 배포 (내부 테스트)
1. Xcode → Product → Archive
2. Organizer → Distribute App → App Store Connect
3. TestFlight 업로드 후 내부 테스터에게 배포

### 2.4 App Store 제출
1. App Store Connect 접속
2. 새 버전 생성
3. 빌드 선택 및 메타데이터 작성
4. 심사 제출

---

## 3. Android 빌드 및 배포

### 3.1 빌드 준비
```bash
# 웹 빌드 + Capacitor 동기화
npm run cap:build:android

# Android Studio 프로젝트 열기
npm run cap:android
# 또는: npx cap open android
```

### 3.2 버전 업데이트
`android/app/build.gradle` 수정:
```groovy
android {
    defaultConfig {
        versionCode 2        // 매 업로드마다 증가
        versionName "1.0.1"
    }
}
```

### 3.3 릴리즈 빌드 생성
1. Android Studio → Build → Generate Signed Bundle / APK
2. Android App Bundle (AAB) 선택
3. 키스토어 서명 (신규 생성 또는 기존 사용)

### 3.4 내부 테스트 배포
1. Google Play Console 접속
2. 내부 테스트 트랙 선택
3. AAB 업로드
4. 테스터 이메일 추가 후 배포

### 3.5 프로덕션 배포
1. 프로덕션 트랙으로 승격
2. 출시 노트 작성
3. 단계적 출시 설정 (권장: 10% → 50% → 100%)

---

## 4. 릴리즈 체크리스트

### 공통
- [ ] 버전 번호 업데이트 (versioning.md 참조)
- [ ] 변경 로그 작성
- [ ] 데이터 검증 (`npm run validate`)
- [ ] 기능 테스트 완료

### iOS
- [ ] Info.plist 권한 문구 확인
- [ ] 앱 아이콘 및 스플래시 확인
- [ ] TestFlight 내부 테스트 완료
- [ ] 앱 스토어 스크린샷 준비

### Android
- [ ] AndroidManifest 권한 확인
- [ ] 앱 아이콘 및 스플래시 확인
- [ ] 내부 테스트 트랙 테스트 완료
- [ ] Play Store 스크린샷 준비

---

## 5. 긴급 핫픽스

### 웹
```bash
git checkout -b hotfix/버그명
# 수정 후
git push origin hotfix/버그명
# PR 생성 → 머지 → 자동 배포
```

### 네이티브 앱
1. 핫픽스 브랜치 생성
2. 버전/빌드 번호 증가
3. 빠른 심사 요청 (App Store) 또는 긴급 업데이트 (Play Store)

---

## 6. 롤백

### 웹
Vercel 대시보드에서 이전 배포로 롤백

### 네이티브 앱
- iOS: App Store Connect에서 이전 빌드 활성화
- Android: Play Console에서 이전 버전으로 롤백

---

## 7. 스토어 메타데이터

### 앱 이름
- 한국어: Card AI - 스마트 카드 추천
- 영어: Card AI - Smart Card Benefits

### 짧은 설명
지금, 여기서 어떤 카드 쓸지 알려드려요

### 카테고리
- iOS: Finance
- Android: Finance

### 연령 등급
- 4+ (iOS)
- Everyone (Android)
