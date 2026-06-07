# Deployment Status v1.1.0

Updated: 2026-03-02

## Overall

- Web production deployment: completed
- iOS store submission: TestFlight upload completed (processing)
- Android store submission: blocked by Google Play API/console credentials
- 72h monitoring: runbook and smoke automation prepared

## Completed

1. Web production deployed
- Alias: `https://card-ai-pwa.vercel.app`
- Inspect: `https://vercel.com/sterlingjangs-projects/card-ai-pwa/ELe9JjQYzFBUWLGGqgagHmdrjEe9`

2. Mobile artifacts built
- iOS archive: `/Users/jmac/Desktop/card-ai-pwa/ios/App/build/CardAI.xcarchive`
- Android AAB: `/Users/jmac/Desktop/card-ai-pwa/android/app/build/outputs/bundle/release/app-release.aab`

3. iOS upload executed
- Date/time: 2026-03-02 23:29 (KST)
- Action: `xcodebuild -exportArchive ... destination=upload`
- Result: `Uploaded App` / `** EXPORT SUCCEEDED **`
- Note: Version bumped to `1.0.3 (build 5)` due closed pre-release train on `1.0.2`

4. Quality gates passed
- `npm run ci`
- `npm run test:e2e`

5. Production smoke verified
- Command: `npm run deploy:smoke`
- Report: `/Users/jmac/Desktop/card-ai-pwa/docs/prod-smoke-report-2026-02-21.md`

## Blockers

1. Vercel env values are missing
- `vercel env ls` shows no configured variables.
- Required keys:
  - `VISION_API_KEY`
  - `KAKAO_REST_API_KEY`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `VITE_KAKAO_APP_KEY`
  - `VITE_MIXPANEL_TOKEN`
  - `VITE_FIREBASE_CONFIG`

2. iOS App Review submission remains manual
- Build upload is successful, but App Store Connect metadata/review submission flow must be completed in ASC UI.

3. Android Play Console upload blocked
- No Play Console service-account credentials found in environment.
- No `fastlane` tooling configured on this machine.

## Ready-to-run Commands

1. Sync Vercel env from local env file
```bash
npm run vercel:env:sync -- .env.production.local
```

2. Generate production smoke report
```bash
npm run deploy:smoke
```

3. iOS export retry (after Apple account + distribution cert/profile setup)
```bash
xcodebuild -exportArchive \
  -archivePath /Users/jmac/Desktop/card-ai-pwa/ios/App/build/CardAI.xcarchive \
  -exportOptionsPlist /Users/jmac/Desktop/card-ai-pwa/ios/App/ExportOptions.plist \
  -exportPath /Users/jmac/Desktop/card-ai-pwa/ios/App/build/export \
  -allowProvisioningUpdates
```

4. Android AAB generation (already working)
```bash
JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' \
ANDROID_HOME='/Users/jmac/Library/Android/sdk' \
ANDROID_SDK_ROOT='/Users/jmac/Library/Android/sdk' \
./gradlew bundleRelease
```
