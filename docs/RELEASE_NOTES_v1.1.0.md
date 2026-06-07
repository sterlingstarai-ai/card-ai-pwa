# Release Notes v1.1.0

## Date
- 2026-02-21

## Highlights
- CORS allowlist hardened for all serverless APIs.
- Shared CORS/RateLimit middleware introduced (`api/lib/cors.js`, `api/lib/rate-limit.js`).
- Upstash Redis rate limit support added with safe local fallback.
- Production error message masking applied to OCR/Kakao/Report APIs.
- Automatic location request on app launch removed.
- First-launch auto demo onboarding added with one-time storage flag.
- Demo exit bridge added (keep demo cards or reset).
- Sensitive OCR/location logs reduced to debug-safe metadata.
- Open Graph/Twitter tags added, and `public/og-image.png` added.
- Unused legacy JSON files removed from `src/data`.
- `places.json` trimmed to curated dataset (140 places, ~21.3KB).
- PlaceSheet dynamic loading added for `cafe`/`mart` categories via Kakao API.
- Tailwind CDN removed and migrated to Vite + Tailwind v4 build pipeline.
- Firebase + Mixpanel integration added and analytics flush now sends events.
- `CPA_LINK_CLICK` analytics event added on benefit source link click.
- Settings and benefit modal share actions added.
- Capacitor App Review plugin integrated (`@capawesome/capacitor-app-review`).
- Top50 places output and coverage report generation added.
- Unit test runner (Vitest) and baseline unit tests added.
- E2E tests updated for v1.1 behavior and validated on Chromium/WebKit.

## New Files
- `api/lib/cors.js`
- `api/lib/rate-limit.js`
- `src/index.css`
- `src/lib/firebase.js`
- `src/lib/mixpanel.js`
- `src/lib/share.js`
- `src/data/top50-places.json`
- `scripts/generate-top50-places.js`
- `scripts/vercel-sync-env.sh`
- `scripts/prod-smoke-check.sh`
- `docs/top50-coverage-report.md`
- `docs/DEPLOYMENT_STATUS_v1.1.0.md`
- `docs/MONITORING_72H_v1.1.0.md`
- `docs/prod-smoke-report-2026-02-21.md`
- `docs/RELEASE_NOTES_v1.1.0.md`
- `vercel.json`
- `vitest.config.js`
- `tests/unit/*.test.js`

## Commands Verified
- `npm run lint`
- `npm run validate`
- `npm run build`
- `npm run test:unit`
- `npm run test:e2e`
- `npx cap sync`
- `npm run ci`
- `npm run deploy:smoke`
- `vercel deploy --prod -y`
- `xcodebuild ... archive` (success)
- `xcodebuild -exportArchive ...` (success on 2026-03-02, uploaded to TestFlight processing)
- `./gradlew bundleRelease` (success with local `JAVA_HOME`/`ANDROID_HOME`)

## Deployment Evidence
- Vercel production alias: `https://card-ai-pwa.vercel.app`
- Vercel inspect URL: `https://vercel.com/sterlingjangs-projects/card-ai-pwa/ELe9JjQYzFBUWLGGqgagHmdrjEe9`
- iOS archive output: `ios/build/CardAI.xcarchive`
- iOS upload result: `Uploaded App` (`xcodebuild exportArchive`, 2026-03-02)
- Android release bundle: `android/app/build/outputs/bundle/release/app-release.aab`
- Production smoke report: `docs/prod-smoke-report-2026-02-21.md`

## Deployment Blockers
- Vercel env vars are not configured (`vercel env ls` returned no vars), so OCR/identify/upstash production behavior requires env setup before full production readiness.
- (Resolved) Apple account/signing prerequisites were configured; TestFlight upload now succeeds.
- Google Play Console 업로드/트랙 전개는 콘솔 권한이 필요한 수동 단계로 남아 있음 (AAB 산출물은 생성 완료).
