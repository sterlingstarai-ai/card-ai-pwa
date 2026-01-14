# Card AI - Mac에서 iOS/Android 실행 가이드

초보자를 위한 단계별 가이드입니다.

---

## 사전 준비

### 필수 설치
1. **Node.js** (v18 이상): https://nodejs.org
2. **Git**: `xcode-select --install`

### iOS 개발용
3. **Xcode**: App Store에서 설치 (무료, ~12GB)
4. Xcode 설치 후 터미널에서:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

### Android 개발용
5. **Android Studio**: https://developer.android.com/studio
6. 설치 후 SDK Manager에서 최신 SDK 설치

---

## 프로젝트 설정

```bash
# 1. 프로젝트 폴더로 이동
cd /Users/jmac/Desktop/card-ai-project/card-ai-pwa

# 2. 의존성 설치
npm install

# 3. 웹 빌드 + 네이티브 동기화
npm run cap:sync
```

---

## iOS 실행

### 시뮬레이터에서 실행
```bash
# Xcode 프로젝트 열기
npm run cap:ios
```

Xcode가 열리면:
1. 상단 왼쪽에서 시뮬레이터 선택 (예: iPhone 15)
2. ▶️ 버튼 클릭하여 실행

### 실제 iPhone에서 실행
1. iPhone을 Mac에 USB로 연결
2. iPhone에서 "이 컴퓨터를 신뢰" 선택
3. Xcode 상단에서 연결된 iPhone 선택
4. ▶️ 버튼 클릭

> **참고**: 무료 Apple ID로도 7일간 테스트 가능

---

## Android 실행

### 에뮬레이터에서 실행
```bash
# Android Studio 프로젝트 열기
npm run cap:android
```

Android Studio가 열리면:
1. Device Manager에서 가상 기기 생성 (없으면)
2. 상단에서 에뮬레이터 선택
3. ▶️ 버튼 클릭하여 실행

### 실제 Android 폰에서 실행
1. 폰 설정 → 개발자 옵션 활성화
   - 설정 → 휴대전화 정보 → 빌드 번호 7번 탭
2. 개발자 옵션 → USB 디버깅 활성화
3. USB로 Mac에 연결
4. Android Studio 상단에서 연결된 기기 선택
5. ▶️ 버튼 클릭

---

## 자주 발생하는 문제

### iOS

**문제**: "Signing requires a development team"
**해결**: Xcode → 프로젝트 → Signing & Capabilities → Team에서 Apple ID 선택

**문제**: 시뮬레이터가 안 보임
**해결**: Xcode → Window → Devices and Simulators → + 버튼으로 추가

### Android

**문제**: "SDK location not found"
**해결**: Android Studio → Preferences → SDK 경로 확인

**문제**: 에뮬레이터가 느림
**해결**: Device Manager에서 x86_64 이미지 사용 (ARM 대신)

### 공통

**문제**: 변경사항이 반영 안됨
**해결**:
```bash
npm run cap:sync
# 그래도 안되면
npx cap sync --force
```

---

## 빠른 참조

| 작업 | 명령어 |
|-----|-------|
| 웹 개발 서버 | `npm run dev` |
| 빌드 + 동기화 | `npm run cap:sync` |
| iOS 열기 | `npm run cap:ios` |
| Android 열기 | `npm run cap:android` |
| 데이터 검증 | `npm run validate` |

---

## 도움말

- Capacitor 공식 문서: https://capacitorjs.com/docs
- 문의: support@cardai.app
