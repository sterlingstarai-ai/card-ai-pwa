# Store Submission Checklist

Card AI v1.0.0 앱스토어 제출 체크리스트

---

## 공통 준비물

### 앱 정보
| 항목 | 값 |
|------|-----|
| App ID | com.cardai.app |
| 앱 이름 | Card AI |
| 버전 | 1.0.0 |
| 빌드 번호 | 1 |

### 필수 자료
- [ ] 앱 아이콘 (1024x1024, PNG, 투명 배경 X)
- [ ] 스크린샷 (각 디바이스별)
- [ ] 앱 설명 (한국어/영어)
- [ ] 개인정보처리방침 URL
- [ ] 이용약관 URL

### 앱 설명 (초안)

**짧은 설명 (80자):**
> 내 카드로 받을 수 있는 혜택을 장소에서 바로 확인하세요

**긴 설명:**
```
Card AI는 신용카드 혜택을 스마트하게 추천합니다.

주요 기능:
• 장소 기반 실시간 혜택 추천
• 내 카드 등록 및 관리
• 오프라인에서도 사용 가능
• 데모 모드로 미리 체험

지원 카드:
현대카드, 삼성카드, 신한카드 등 주요 프리미엄 카드

혜택 카테고리:
• 공항 라운지
• 발렛파킹
• 호텔
• 카페/레스토랑
• 골프
• 쇼핑
```

---

## iOS (App Store Connect)

### 빌드 준비
```bash
# 1. 웹 빌드
npm run build

# 2. iOS 동기화
npx cap sync ios

# 3. Xcode 열기
npx cap open ios
```

### Xcode 설정
- [ ] Signing & Capabilities > Team 설정
- [ ] Bundle Identifier: `com.cardai.app`
- [ ] Version: `1.0.0`
- [ ] Build: `1`
- [ ] Deployment Target: iOS 14.0+

### 아카이브 및 업로드
1. Product > Archive
2. Distribute App > App Store Connect
3. Upload

### App Store Connect 체크리스트

**앱 정보:**
- [ ] 앱 이름: Card AI
- [ ] 부제목: 스마트 카드 혜택 추천
- [ ] 카테고리: 금융 (Finance)
- [ ] 연령 등급: 4+

**스크린샷 (필수):**
- [ ] iPhone 6.7" (1290 x 2796) - 3장 이상
- [ ] iPhone 6.5" (1284 x 2778) - 3장 이상
- [ ] iPhone 5.5" (1242 x 2208) - 3장 이상

**메타데이터:**
- [ ] 설명 (4000자 이내)
- [ ] 키워드 (100자 이내): 카드혜택,신용카드,할인,라운지,발렛파킹,포인트
- [ ] 지원 URL: https://cardai.app/support
- [ ] 개인정보처리방침 URL: https://cardai.app/privacy

**앱 심사 정보:**
- [ ] 연락처 정보
- [ ] 데모 계정 (필요시)
- [ ] 심사 메모: "데모 모드로 테스트 가능합니다"

### iOS 권한 설명 (Info.plist)
| 권한 | 설명 |
|------|------|
| NSCameraUsageDescription | 카드 스캔을 위해 카메라 접근이 필요합니다 |
| NSLocationWhenInUseUsageDescription | 주변 혜택을 찾기 위해 위치 접근이 필요합니다 |

---

## Android (Google Play Console)

### 빌드 준비
```bash
# 1. 웹 빌드
npm run build

# 2. Android 동기화
npx cap sync android

# 3. Android Studio 열기
npx cap open android
```

### Android Studio 설정
- [ ] `android/app/build.gradle`:
  - versionCode: 1
  - versionName: "1.0.0"
- [ ] 서명 키 생성/설정
- [ ] ProGuard 설정 확인

### AAB 빌드
1. Build > Generate Signed Bundle / APK
2. Android App Bundle 선택
3. 키 생성 또는 기존 키 사용
4. Release 빌드

### Google Play Console 체크리스트

**앱 정보:**
- [ ] 앱 이름: Card AI
- [ ] 짧은 설명 (80자)
- [ ] 긴 설명 (4000자)
- [ ] 카테고리: 금융

**그래픽 자료:**
- [ ] 앱 아이콘 (512x512)
- [ ] 특성 그래픽 (1024x500)
- [ ] 스크린샷 (최소 2장, 최대 8장)
  - [ ] 휴대전화 (16:9 또는 9:16)

**콘텐츠 등급:**
- [ ] IARC 설문 완료
- [ ] 예상 등급: 전체이용가

**개인정보 및 보안:**
- [ ] 개인정보처리방침 URL
- [ ] 데이터 안전 섹션 작성:
  - 위치 데이터: 수집함 (기기 내 처리)
  - 개인 정보: 수집 안함
  - 금융 정보: 수집 안함

### Android 권한 (AndroidManifest.xml)
| 권한 | 용도 |
|------|------|
| CAMERA | 카드 OCR 스캔 |
| ACCESS_FINE_LOCATION | 주변 장소 검색 |
| ACCESS_COARSE_LOCATION | 주변 장소 검색 |
| INTERNET | API 통신 |

---

## 제출 전 최종 확인

### 기능 테스트
- [ ] 앱 설치 및 실행
- [ ] 온보딩 플로우
- [ ] 데모 모드 진입
- [ ] 카드 추가/삭제
- [ ] 장소 검색
- [ ] 혜택 표시
- [ ] 제보 기능

### 크래시 테스트
- [ ] 오프라인 상태에서 앱 실행
- [ ] 권한 거부 시 동작
- [ ] 빈 데이터 상태

### 성능 테스트
- [ ] 앱 시작 시간 < 3초
- [ ] 메모리 누수 없음
- [ ] 배터리 과다 사용 없음

---

## 심사 대응

### 일반적인 리젝 사유
| 사유 | 대응 |
|------|------|
| 기능 불완전 | 데모 모드 안내 추가 |
| 개인정보 미흡 | 개인정보처리방침 URL 확인 |
| 권한 설명 부족 | 권한 사용 이유 명확히 |
| 메타데이터 문제 | 설명/스크린샷 수정 |

### 심사 기간 (예상)
- iOS: 1-3일 (첫 제출 시 더 걸릴 수 있음)
- Android: 수 시간 ~ 7일

---

## 릴리즈 후

- [ ] 스토어 페이지 확인
- [ ] 다운로드 테스트
- [ ] 리뷰 모니터링 설정
- [ ] 크래시 리포트 모니터링

---

*최종 업데이트: 2026-01-18*
