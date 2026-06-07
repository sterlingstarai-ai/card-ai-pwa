# Production Smoke Report

- Timestamp (UTC): 2026-02-21T05:16:43Z
- Base URL: https://card-ai-pwa.vercel.app

## Security Headers

```text
HTTP/2 200 
permissions-policy: camera=(self), geolocation=(self), microphone=()
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
```

## CORS Preflight (Allowed Origin)

| Endpoint | Status | Access-Control-Allow-Origin |
|---|---:|---|
| `/api/ocr` | 204 | https://card-ai-pwa.vercel.app |
| `/api/identify` | 204 | https://card-ai-pwa.vercel.app |
| `/api/kakao-places` | 204 | https://card-ai-pwa.vercel.app |
| `/api/report` | 204 | https://card-ai-pwa.vercel.app |

## CORS Preflight (Blocked Origin)

| Endpoint | Status |
|---|---:|
| `/api/ocr` | 403 |
| `/api/identify` | 403 |
| `/api/kakao-places` | 403 |
| `/api/report` | 403 |

## OG/Twitter Meta Tags

```text
13:    <meta property="og:title" content="Card AI - 신용카드 혜택 추천" />
14:    <meta property="og:description" content="지금, 여기서 어떤 카드 쓸지 알려드려요. 장소별 카드 혜택 비교." />
15:    <meta property="og:image" content="https://card-ai-pwa.vercel.app/og-image.png" />
20:    <meta name="twitter:card" content="summary_large_image" />
21:    <meta name="twitter:title" content="Card AI - 신용카드 혜택 추천" />
22:    <meta name="twitter:description" content="지금, 여기서 어떤 카드 쓸지 알려드려요" />
23:    <meta name="twitter:image" content="https://card-ai-pwa.vercel.app/og-image.png" />
```
