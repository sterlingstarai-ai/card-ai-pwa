# 💳 Card AI - 스마트 카드 추천 PWA

## ⚠️ 중요: PWA 테스트는 HTTPS 필수!

> PWA 핵심 기능(서비스워커, 오프라인, 자동업데이트, 홈 화면 설치)은 **HTTPS에서만** 제대로 작동합니다.
> 
> 로컬 IP(`http://192.168.x.x`)는 개발용이며, **진짜 PWA 테스트는 HTTPS 배포 후** 해야 합니다.

---

## 🚀 빠른 시작 (권장: Vercel 배포)

### 1. 설치 & 빌드
```bash
npm install
npm run build
```

### 2. Vercel에 배포 (가장 쉬움)
```bash
npm install -g vercel
vercel
```
→ 배포 완료 후 `https://xxx.vercel.app` URL 받음

### 3. 폰에서 테스트
- **iPhone Safari**: URL 접속 → 공유 → "홈 화면에 추가"
- **Android Chrome**: URL 접속 → 메뉴 → "앱 설치"

---

## 📱 실기기 테스트 체크리스트

### 필수 테스트 (각 기기 15분)

| 테스트 | iPhone | Android |
|--------|:------:|:-------:|
| HTTPS URL 접속 정상 | ⬜ | ⬜ |
| 홈 화면 설치 → 아이콘 정상 | ⬜ | ⬜ |
| 설치된 앱 실행 | ⬜ | ⬜ |
| **비행기 모드에서 앱 실행** | ⬜ | ⬜ |
| 카드 토글 연타 20회 | ⬜ | ⬜ |
| 위치 권한 허용 → 내 주변 | ⬜ | ⬜ |
| 위치 권한 거부 → 앱 정상 | ⬜ | ⬜ |
| OCR 성공 1회 | ⬜ | ⬜ |
| OCR 실패 1회 | ⬜ | ⬜ |
| OCR 도중 모달 닫기 | ⬜ | ⬜ |
| 앱 종료 → 재실행 → 복원 | ⬜ | ⬜ |
| 노치/홈바 UI 겹침 없음 | ⬜ | ⬜ |

### ✅ 통과 기준
- 설치 아이콘 정상 표시
- 비행기 모드에서도 UI 정상 (오프라인 지원)
- OCR/위치가 성공 또는 **정상적인 실패 처리**

---

## 🔧 개발용 로컬 테스트 (기능 확인용)

```bash
npm run dev
# → http://localhost:5173

# 또는 빌드 후 프리뷰
npm run build
npm run preview
# → http://localhost:4173
```

⚠️ 로컬에서는 PWA 설치/오프라인 테스트 불완전!

---

## 🌐 배포 옵션

### Vercel (추천) ⭐
```bash
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### GitHub Pages
1. `vite.config.js`에 `base: '/레포명/'` 추가
2. `dist/` 폴더를 `gh-pages` 브랜치에 푸시

---

## 📦 프로젝트 구조

```
card-ai-pwa/
├── package.json
├── vite.config.js      # Vite + PWA 설정
├── index.html
├── public/
│   ├── favicon.ico          # 32x32
│   ├── apple-touch-icon.png # 180x180
│   ├── pwa-192x192.png      # 192x192
│   └── pwa-512x512.png      # 512x512
└── src/
    ├── main.jsx
    └── App.jsx              # vFinal 코드
```

---

## 📋 기술 스택

- React 18
- Vite 5
- Tailwind CSS (CDN)
- IndexedDB (localStorage 폴백)
- Tesseract.js 4.1.5 (OCR)
- Web Geolocation API
- PWA (vite-plugin-pwa)

---

## 📄 버전

**vFinal** - Production Release (PWA Ready)
