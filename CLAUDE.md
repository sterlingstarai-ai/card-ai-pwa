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
- **버전 1.0.1**: ✅ 승인 완료
- **버전 1.0.2**: 🟡 심사 대기 중 (빌드 4)
  - 제출일: 2026년 1월 26일
  - **수정 내용**:
    - OCR 카드 인식 대폭 개선 (Google Vision WEB_DETECTION 폴백)
    - 2단계 인식 로직: 1차 OCR → 2차 이미지 검색
    - 에러 처리 및 사용자 메시지 개선
    - 코드 품질 개선 (정규식, 키워드 필터, 보안)

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

## 마지막 작업 세션 (2026-01-26)

### 완료된 작업
1. **OCR 카드 인식 대폭 개선 (구글렌즈 유사 방식)**:
   - `/api/identify.js` 신규 추가 (Vision WEB_DETECTION + LOGO_DETECTION)
   - **2단계 인식 로직**:
     - 1차: 기존 OCR 텍스트 기반 매칭
     - 2차: OCR 실패 시 → WEB_DETECTION (구글렌즈 유사) 폴백
   - 신호 매칭 함수 추가: `normalizeKey`, `buildSignalString`, `scoreKeyMatch`, `findCardCandidatesFromSignals`
   - diacritics 정규화 개선 (osée → osee)
   - 가중치 기반 점수 시스템 (issuer/name > ocrKeywords > network/grade)

2. **린트 에러 수정**:
   - OcrModal.jsx: `alert` → `window.alert`
   - App.jsx: 빈 catch 블록 수정

### 핵심 기술 메모

#### OCR 플로우 (2단계)
```
Capacitor Camera → base64 (quality:70, 1600px)
    → /api/ocr (DOCUMENT_TEXT_DETECTION)
    → 1차: findCardCandidatesFromSignals(ocrText)
    → 후보 있으면 완료

    → 후보 없으면 2차:
    → /api/identify (WEB_DETECTION + LOGO_DETECTION)
    → findCardCandidatesFromSignals(ocrText + bestGuessLabels + webEntities + logos)
    → 카드 후보 표시
```

#### 신규 API 엔드포인트
| 파일 | 용도 |
|------|------|
| `api/identify.js` | Vision WEB_DETECTION (구글렌즈 유사) |

#### 중요 설정값
| 항목 | 값 |
|------|-----|
| API Base URL | `https://card-ai-pi.vercel.app` (config.js) |
| Vision API 키 | Vercel 환경변수 `VISION_API_KEY` |
| 이미지 품질 | 70% (OcrModal.jsx) |
| 이미지 최대 크기 | 1600x1600 |
| Google Vision 제한 | 4MB |
| WEB_DETECTION 타임아웃 | 20초 |

#### 매칭 가중치
| 신호 유형 | 가중치 |
|----------|--------|
| issuer + name 조합 | 6 |
| name | 5 |
| issuer | 4 |
| 네트워크 로고 매칭 | +3 |
| ocrKeywords | 2 |
| network / grade | 1 |

#### 알려진 제한사항
- WEB_DETECTION은 OCR 실패 시에만 호출 (비용/지연 최소화)
- 카드 데이터에 없는 신규 카드는 인식 후 "데이터 없음" 처리 필요
- 혜택 데이터는 출처 검증 없이 자동 생성 금지

### 현재 상태
- **iOS 1.0**: 출시 완료
- **iOS 1.0.1**: 출시 완료
- **iOS 1.0.2**: 심사 대기 중 (빌드 4)
- **Android**: 비공개 테스트 준비 중
- **OCR**: ✅ 2단계 인식 적용 (구글렌즈 유사 폴백)

### 완료된 추가 작업 (2026-01-26 오후)
1. **코드 리뷰 권고사항 적용**:
   - `normalizeKey` 정규식 개선 (`[\u0300-\u036f]`)
   - `scoreKeyMatch` 최소 키워드 길이 필터 (3자 미만 무시)
   - `fetchVisionIdentify` 상태 코드별 에러 메시지
   - `api/identify.js` 프로덕션 에러 메시지 보안 강화
2. **Vercel 프로덕션 배포 완료**
3. **iOS 1.0.2 (빌드 4) 앱스토어 심사 제출 완료**

### 다음 할 일
- iOS 1.0.2 심사 결과 확인 (24-48시간)
- Android 테스터 20명 모집 → 비공개 테스트 시작
- 체크카드 데이터 추가 검토
- 카드 데이터 확장 (인식용 목록은 넓게, 혜택 데이터는 출처 기반)
