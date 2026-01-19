# Card AI 개발 노하우 정리

> 이 문서는 Card AI PWA/네이티브 앱 개발 과정에서 배운 노하우를 정리한 것입니다.
> 향후 유사한 프로젝트 개발 시 참고용으로 사용하세요.

---

## 목차

1. [프로젝트 아키텍처](#1-프로젝트-아키텍처)
2. [Capacitor 하이브리드 앱 개발](#2-capacitor-하이브리드-앱-개발)
3. [iOS 개발 및 배포](#3-ios-개발-및-배포)
4. [Android 개발 및 배포](#4-android-개발-및-배포)
5. [Vercel 배포](#5-vercel-배포)
6. [외부 API 연동 (카카오 맵)](#6-외부-api-연동-카카오-맵)
7. [자주 발생하는 문제와 해결법](#7-자주-발생하는-문제와-해결법)
8. [앱스토어 심사 준비](#8-앱스토어-심사-준비)
9. [유용한 명령어 모음](#9-유용한-명령어-모음)

---

## 1. 프로젝트 아키텍처

### 기술 스택
```
Frontend: React 18 + Vite 5
Styling: Vanilla CSS (CSS-in-JS 일부)
State: React hooks (useState, useEffect)
Storage: localStorage (카드 데이터)
PWA: vite-plugin-pwa
Native: Capacitor 8
Map: Kakao Maps JavaScript SDK
Hosting: Vercel
```

### 폴더 구조
```
card-ai-pwa/
├── src/                    # React 소스코드
│   ├── components/         # UI 컴포넌트
│   ├── constants/          # 설정값, 카드/장소 데이터
│   ├── lib/                # 유틸리티 함수
│   └── App.jsx             # 메인 앱
├── public/                 # 정적 파일 (아이콘, HTML)
├── ios/                    # iOS 네이티브 프로젝트 (Capacitor)
├── android/                # Android 네이티브 프로젝트 (Capacitor)
├── dist/                   # 빌드 결과물
└── docs/                   # 문서
```

### 핵심 설정 파일
| 파일 | 용도 |
|------|------|
| `capacitor.config.json` | Capacitor 설정 (앱 ID, 서버 등) |
| `vite.config.js` | Vite 빌드 설정, PWA 설정 |
| `package.json` | 의존성, 스크립트 |
| `ios/App/App/Info.plist` | iOS 권한 설명, 앱 설정 |
| `android/app/build.gradle` | Android 빌드 설정 |
| `android/variables.gradle` | Android SDK 버전 설정 |

---

## 2. Capacitor 하이브리드 앱 개발

### 2.1 초기 설정

```bash
# Capacitor 설치
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android

# 플랫폼 추가
npx cap add ios
npx cap add android

# 플러그인 추가 (필요시)
npm install @capacitor/camera @capacitor/geolocation
```

### 2.2 개발 워크플로우

```bash
# 1. 웹 빌드
npm run build

# 2. 네이티브 프로젝트에 동기화
npx cap sync

# 3. IDE에서 열기
npx cap open ios      # Xcode
npx cap open android  # Android Studio

# 또는 한 번에
npm run cap:ios       # build + sync + open
npm run cap:android
```

### 2.3 capacitor.config.json 핵심 설정

```json
{
  "appId": "com.example.myapp",      // 앱 ID (앱스토어용)
  "appName": "My App",               // 앱 표시 이름
  "webDir": "dist",                  // 빌드 결과물 폴더
  "server": {
    "androidScheme": "https",        // Android WebView 스킴
    "iosScheme": "https",            // iOS WebView 스킴
    "hostname": "myapp.vercel.app"   // 호스트명 (API 호출용)
  }
}
```

**중요**: `hostname`은 외부 API (카카오맵 등)의 도메인 화이트리스트와 일치해야 함!

### 2.4 권한 설정

#### iOS (Info.plist)
```xml
<!-- 카메라 -->
<key>NSCameraUsageDescription</key>
<string>카드 스캔을 위해 카메라 접근이 필요합니다.</string>

<!-- 위치 -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>주변 혜택을 추천하기 위해 위치 정보가 필요합니다.</string>

<!-- 사진 라이브러리 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>저장된 카드 이미지를 스캔하기 위해 접근이 필요합니다.</string>
```

**팁**: 권한 거부해도 앱이 작동함을 설명에 포함하면 심사 통과율 높아짐

#### Android (AndroidManifest.xml)
```xml
<!-- 권한 선언 -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- 필수 아님 표시 (중요!) -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

---

## 3. iOS 개발 및 배포

### 3.1 사전 준비
- Apple Developer Program 등록 ($99/년, 승인까지 최대 48시간)
- Xcode 최신 버전 설치
- Apple ID로 Xcode 로그인

### 3.2 Bundle ID 설정

1. **capacitor.config.json**에서 `appId` 설정
2. **Xcode** > Signing & Capabilities > Bundle Identifier 동일하게 설정
3. App Store Connect에서 같은 Bundle ID로 앱 생성

**주의**: Bundle ID는 전 세계적으로 고유해야 함. 이미 사용 중이면 변경 필요
```
❌ com.cardai.app (이미 누가 사용 중일 수 있음)
✅ com.yourcompany.cardai (회사/개인 도메인 역순)
```

### 3.3 서명 설정

1. Xcode > Signing & Capabilities
2. Team 선택 (Apple Developer 계정)
3. "Automatically manage signing" 체크
4. Bundle Identifier 입력

### 3.4 Archive 빌드 및 업로드

```
1. Xcode 상단: Any iOS Device (arm64) 선택
2. Product > Archive
3. Archive 완료 후 Organizer 창 열림
4. "Distribute App" 클릭
5. "App Store Connect" 선택
6. "Upload" 선택
7. 옵션 기본값으로 Next
8. 업로드 완료
```

### 3.5 App Store Connect 설정

1. https://appstoreconnect.apple.com
2. 앱 > 새로운 앱 생성
3. 앱 정보 입력:
   - 이름, 부제
   - 설명 (4000자)
   - 키워드 (100자, 쉼표 구분)
   - 스크린샷 (6.7", 6.5", 5.5" 각각)
   - 개인정보처리방침 URL
4. 빌드 선택 (업로드된 Archive)
5. 심사 제출

### 3.6 스크린샷 사이즈

| 디바이스 | 해상도 |
|----------|--------|
| 6.7" (iPhone 15 Pro Max) | 1290 x 2796 px |
| 6.5" (iPhone 14 Plus) | 1284 x 2778 px |
| 5.5" (iPhone 8 Plus) | 1242 x 2208 px |

**팁**: 시뮬레이터에서 Cmd+S로 스크린샷 촬영

---

## 4. Android 개발 및 배포

### 4.1 사전 준비
- Google Play Console 등록 ($25 일회성)
- 신원 확인 필요 (1-3일 소요)
- Android Studio 설치

### 4.2 Application ID 설정

**android/app/build.gradle**:
```gradle
defaultConfig {
    applicationId "com.yourcompany.appname"
    // ...
}
```

**capacitor.config.json의 appId와 일치시키기!**

### 4.3 서명 키 생성

```bash
# 키스토어 생성 (최초 1회)
keytool -genkey -v -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**중요**: 키스토어 파일과 비밀번호 안전하게 보관! 분실 시 앱 업데이트 불가

### 4.4 Signed AAB 빌드

**방법 1: Android Studio GUI**
```
1. Build > Generate Signed Bundle / APK
2. Android App Bundle 선택
3. 키스토어 경로, 비밀번호 입력
4. release 선택
5. Finish
```

**방법 2: 명령어**
```bash
cd android
./gradlew bundleRelease
```

결과물: `android/app/build/outputs/bundle/release/app-release.aab`
또는: `android/app/release/app-release.aab`

### 4.5 Play Console 설정

1. https://play.google.com/console
2. 앱 만들기
3. 스토어 등록정보 작성:
   - 앱 이름
   - 짧은 설명 (80자)
   - 전체 설명 (4000자)
   - 앱 아이콘 (512x512)
   - 특성 그래픽 (1024x500)
   - 스크린샷 (휴대전화 필수, 태블릿 선택)
4. 개인정보처리방침 URL
5. 테스트 > 내부 테스트 > 버전 만들기
6. AAB 업로드
7. 테스터 추가 후 출시

### 4.6 스크린샷 사이즈

| 유형 | 해상도 |
|------|--------|
| 휴대전화 | 1080 x 1920 px (최소) |
| 태블릿 7" | 1080 x 1920 px |
| 태블릿 10" | 1920 x 1200 px |
| 특성 그래픽 | 1024 x 500 px |
| 앱 아이콘 | 512 x 512 px |

---

## 5. Vercel 배포

### 5.1 설정

1. Vercel 대시보드에서 프로젝트 연결
2. Settings > Git > Connect Git Repository
3. 환경 변수 설정 (Settings > Environment Variables)

### 5.2 환경 변수

```bash
# Vercel CLI로 추가
vercel env add VITE_KAKAO_APP_KEY
```

**중요**: `VITE_` 접두사가 있어야 클라이언트에서 접근 가능

### 5.3 배포 명령어

```bash
# 프로덕션 배포
vercel --prod

# 미리보기 배포
vercel
```

### 5.4 트러블슈팅

**Git 연결 안 됨 → 수동 배포 시 최신 코드 반영 안 됨**
- Vercel 대시보드 > Settings > Git > Repository 확인
- 연결 끊겼으면 다시 연결

**환경 변수 적용 안 됨**
- 새 배포 필요 (환경 변수 변경 후 자동 재배포 안 됨)
- `vercel --prod` 실행

---

## 6. 외부 API 연동 (카카오 맵)

### 6.1 카카오 개발자 설정

1. https://developers.kakao.com
2. 애플리케이션 추가
3. 플랫폼 > Web 사이트 도메인 등록:
   ```
   http://localhost:5173          # 로컬 개발
   https://yourapp.vercel.app     # 프로덕션
   capacitor://localhost          # iOS 앱
   https://localhost              # Android 앱
   ```

### 6.2 Capacitor 앱에서 API 호출

**핵심**: capacitor.config.json의 `hostname`이 카카오에 등록된 도메인과 일치해야 함

```json
{
  "server": {
    "hostname": "yourapp.vercel.app"  // 카카오에 등록된 도메인
  }
}
```

### 6.3 API 키 관리

```javascript
// .env 또는 환경변수
VITE_KAKAO_APP_KEY=your_javascript_key

// 코드에서 사용
const KAKAO_KEY = import.meta.env.VITE_KAKAO_APP_KEY;
```

---

## 7. 자주 발생하는 문제와 해결법

### 7.1 Safari WebView 렌더링 문제

**증상**: Safari 브라우저에서 지도가 안 보이거나 터치해야 보임

**시도한 해결책**:
```css
/* GPU 가속 강제 */
transform: translate3d(0,0,0);
-webkit-transform: translate3d(0,0,0);
backface-visibility: hidden;
-webkit-backface-visibility: hidden;
will-change: transform;
isolation: isolate;
```

**결론**: Xcode 시뮬레이터/실기기에서는 정상 작동. Safari 브라우저 특유의 문제이며, 네이티브 앱에서는 발생하지 않음.

### 7.2 Bundle ID 충돌

**증상**: "The bundle identifier is not available"

**해결**:
1. 고유한 Bundle ID 사용 (com.회사명.앱이름)
2. capacitor.config.json 수정
3. Xcode에서 Bundle Identifier 수정
4. `npx cap sync` 실행

### 7.3 Capacitor Sync 후 변경사항 미반영

**해결**:
```bash
# 완전히 다시 빌드
npm run build
npx cap sync

# 네이티브 프로젝트 클린 빌드
# Xcode: Product > Clean Build Folder (Cmd+Shift+K)
# Android Studio: Build > Clean Project
```

### 7.4 iOS 키체인 비밀번호 프롬프트

**증상**: Archive 업로드 시 키체인 비밀번호 반복 요청

**해결**: Mac 로그인 비밀번호 입력 후 "항상 허용"

### 7.5 Android targetSdkVersion 오류

**증상**: Play Console에서 "API 수준 XX 이상 타겟팅 필요"

**해결**: android/variables.gradle에서 버전 업데이트
```gradle
ext {
    targetSdkVersion = 34  // 또는 최신 버전
    compileSdkVersion = 34
}
```

### 7.6 Vercel 배포 후 이전 버전 표시

**원인**: Git 연결 끊김 또는 캐시

**해결**:
1. Git 연결 확인/재연결
2. `vercel --prod` CLI로 강제 배포
3. 브라우저 캐시 삭제 (Cmd+Shift+R)

---

## 8. 앱스토어 심사 준비

### 8.1 공통 필수 항목

| 항목 | 설명 |
|------|------|
| 개인정보처리방침 | HTTPS URL 필수 |
| 이용약관 | 권장 (금융/결제 앱은 필수) |
| 지원 연락처 | 이메일 또는 웹사이트 |
| 앱 설명 | 기능 명확히 설명 |
| 스크린샷 | 실제 앱 화면 (목업 허용) |

### 8.2 iOS 심사 주의사항

1. **권한 설명 필수**: 왜 필요한지 + 거부해도 된다는 안내
2. **메타데이터 일치**: 설명과 실제 기능 일치
3. **크래시 없어야 함**: 모든 시나리오 테스트
4. **결제**: 인앱 결제 아니면 외부 결제 유도 금지

### 8.3 Android 심사 주의사항

1. **신원 확인 필수**: 첫 앱 출시 전 1-3일 소요
2. **데이터 보안 섹션**: Play Console에서 작성 필수
3. **타겟 연령**: 아동 대상 아니면 명시

### 8.4 리젝 방지 체크리스트

```
[ ] 프로덕션 빌드 에러 없음
[ ] 모든 링크 정상 작동
[ ] 권한 거부 시에도 앱 작동
[ ] 오프라인에서도 기본 기능 작동
[ ] 개인정보처리방침 URL 접근 가능
[ ] 스크린샷이 실제 앱과 일치
[ ] 앱 설명에 과장 없음
[ ] 테스트 계정 필요시 제공
```

### 8.5 심사 메모 예시

```
이 앱은 신용카드 혜택 정보를 제공하는 앱입니다.

- 카드번호, 개인정보를 수집하지 않습니다
- 카메라 권한은 OCR 스캔용이며 선택사항입니다
- 위치 권한은 주변 혜택 추천용이며 선택사항입니다
- 모든 데이터는 로컬 기기에만 저장됩니다
```

---

## 9. 유용한 명령어 모음

### 개발

```bash
# 로컬 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint

# 빌드 + Capacitor 동기화
npm run cap:sync
```

### iOS

```bash
# iOS 프로젝트 열기
npm run cap:ios
# 또는
npx cap open ios

# iOS 동기화만
npx cap sync ios
```

### Android

```bash
# Android 프로젝트 열기
npm run cap:android
# 또는
npx cap open android

# Android 동기화만
npx cap sync android

# AAB 빌드 (CLI)
cd android && ./gradlew bundleRelease
```

### Vercel

```bash
# 프로덕션 배포
vercel --prod

# 환경 변수 추가
vercel env add VARIABLE_NAME

# 환경 변수 목록
vercel env ls
```

### Git

```bash
# 상태 확인
git status

# 커밋
git add .
git commit -m "메시지"

# 푸시
git push origin main
```

---

## 부록: 프로젝트별 설정값

### Card AI 설정

```
앱 ID (iOS/Android): com.sterlingstarai.cardai
앱 이름: Card AI
Vercel 도메인: card-ai-pi.vercel.app
지원 이메일: sterling.star.ai@gmail.com

카카오 맵 등록 도메인:
- https://card-ai-pi.vercel.app
- capacitor://localhost
- https://localhost
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-18 | 최초 작성 |

