# Card AI 프로젝트 컨텍스트

> Claude Code가 이 프로젝트를 빠르게 이해하기 위한 메모리 파일

## 프로젝트 개요

**Card AI**는 사용자가 보유한 신용카드의 혜택을 장소별로 보여주는 PWA/하이브리드 앱입니다.

- **타입**: React PWA + Capacitor 네이티브 앱 (iOS/Android)
- **언어**: 한국어 (Korean)
- **버전**: 1.0.1
- **상태**: iOS 1.0 출시 완료, 1.0.1 심사 대기 중

## 핵심 기술 스택

```
React 18 + Vite 5
Capacitor 8 (iOS/Android)
Kakao Maps JavaScript SDK
PWA (vite-plugin-pwa)
Vercel (호스팅)
```

## 주요 설정값

| 항목 | 값 |
|------|-----|
| App ID | `com.sterlingstarai.cardai` |
| Vercel 도메인 | `card-ai-pi.vercel.app` |
| 지원 이메일 | `sterling.star.ai@gmail.com` |
| Kakao API 키 | 환경변수 `VITE_KAKAO_APP_KEY` |

## 폴더 구조

```
src/
├── components/     # React 컴포넌트 (MapView, CardList 등)
├── constants/      # 설정, 카드 데이터, 장소 데이터
├── lib/            # 유틸리티 (storage, analytics)
└── App.jsx         # 메인 앱

public/             # 정적 파일, 아이콘, privacy.html, terms.html
ios/                # Capacitor iOS 프로젝트
android/            # Capacitor Android 프로젝트
docs/               # 문서 (DEVELOPMENT_KNOWHOW.md 참고)
```

## 자주 쓰는 명령어

```bash
npm run dev          # 로컬 개발 서버
npm run build        # 프로덕션 빌드
npm run cap:ios      # iOS Xcode 열기
npm run cap:android  # Android Studio 열기
npx cap sync         # 네이티브 프로젝트 동기화
vercel --prod        # Vercel 배포
```

## 중요 파일

| 파일 | 용도 |
|------|------|
| `capacitor.config.json` | Capacitor 설정 (앱 ID, hostname) |
| `src/constants/config.js` | 앱 설정 (이메일, 버전 등) |
| `src/constants/cards.js` | 카드 데이터 |
| `src/constants/places.js` | 장소 데이터 |
| `public/privacy.html` | 개인정보처리방침 |
| `public/terms.html` | 이용약관 |

## 알려진 이슈

1. **Safari 브라우저 지도 렌더링**: Safari에서 터치해야 지도가 보이는 현상. 네이티브 앱에서는 정상 작동.

2. **Kakao Maps 도메인 제한**: capacitor.config.json의 hostname이 카카오 개발자 콘솔에 등록된 도메인과 일치해야 함.

## 앱스토어 제출 상태

### iOS
- **버전 1.0**: ✅ 승인 완료 (2026년 1월 23일)
- **버전 1.0.1**: 🟡 심사 대기 중 (빌드 3)
  - 제출일: 2026년 1월 23일
  - **수정 내용**:
    - OCR 카드 스캔 에러 처리 개선
    - 지도 호텔 좌표 오류 수정 (JW메리어트 서울 등)

### Android (테스터 모집 중)
- **상태**: 🟡 비공개 테스트 준비
- AAB 빌드: 완료 (versionCode 2)
- Keystore: `/Users/jmac/androidcardai.jks`
- **다음 단계**:
  1. 테스터 Gmail 20명 확보 (현재 진행 중)
  2. Google Play Console → 테스트 → 비공개 테스트 → 테스터 추가
  3. 테스트 링크 공유 → 테스터들 앱 설치
  4. 14일 후 프로덕션 출시 신청

## 주의사항

1. **Bundle ID 변경 시**: capacitor.config.json, Xcode, android/app/build.gradle 모두 수정 필요
2. **환경변수 변경 시**: Vercel에서 새 배포 필요 (`vercel --prod`)
3. **네이티브 변경 후**: 반드시 `npx cap sync` 실행

## 상세 문서

- 개발 노하우: `docs/DEVELOPMENT_KNOWHOW.md`
- 앱스토어 메타데이터: `docs/APP_STORE_METADATA.md`
- 릴리즈 노트: `docs/RELEASE_NOTES_v1.0.0.md`

---

## 마지막 작업 세션 (2026-01-25)

### 완료된 작업
1. **OCR 카드 스캔 완전 수정**:
   - Capacitor Camera 플러그인 사용 (base64 직접 반환)
   - API URL 절대경로로 변경 (`CONFIG.API.BASE_URL` 사용)
   - 악센트 문자 정규화 추가 (osée → osee 매칭)
   - Safari/WKWebView JSON 파싱 호환성 수정
   - 이미지 품질: 70%, 최대 1600x1600 (Google Vision 4MB 제한)

2. **Vercel 환경변수 추가**:
   - `VISION_API_KEY`: Google Cloud Vision API 키

3. **카드 데이터 확장** (총 약 110개):
   - 신세계 THE S (삼성)
   - 코스트코 리워드, 이마트 e카드, SSG.COM 카드
   - 현대백화점, 갤러리아 VIP, 롯데백화점
   - AK플라자, 홈플러스
   - 각 카드사 법인카드 (BC, KB, 신한, 삼성)

4. **커밋**: `eb38362` - fix: OCR 카드 인식 개선 및 카드 데이터 확장

### 핵심 기술 메모

#### OCR 플로우 (iOS)
```
Capacitor Camera → base64 (quality:70, 1600px)
    → fetch(CONFIG.API.BASE_URL + '/api/ocr')
    → Google Vision API
    → 텍스트 정규화 (악센트 제거, 소문자, 공백 제거)
    → cards.json ocrKeywords 매칭
```

#### 중요 설정값
| 항목 | 값 |
|------|-----|
| API Base URL | `https://card-ai-pi.vercel.app` (config.js) |
| Vision API 키 | Vercel 환경변수 `VISION_API_KEY` |
| 이미지 품질 | 70% (OcrModal.jsx) |
| 이미지 최대 크기 | 1600x1600 |
| Google Vision 제한 | 4MB |

#### 알려진 제한사항
- OCR은 `ocrKeywords`에 등록된 카드만 인식
- 법인카드는 회사명이 아닌 카드 종류로만 매칭
- 체크카드/법인카드 중 일부는 데이터 미등록

### 현재 상태
- **iOS 1.0**: 출시 완료
- **iOS 1.0.1**: 심사 대기 중
- **Android**: 비공개 테스트 준비 중
- **OCR**: ✅ 작동 확인 (카드 데이터 있으면 인식됨)

### 다음 할 일
- iOS 1.0.2 빌드 및 제출 (OCR 수정 반영)
- 누락된 카드 데이터 추가 (사용자 피드백 기반)
- Android 테스터 모집 후 비공개 테스트 시작
