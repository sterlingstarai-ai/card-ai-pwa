# 72-Hour Monitoring Runbook (v1.1.0)

Updated: 2026-02-21

## Monitoring Window

- Start: immediately after production deployment (`2026-02-21`)
- End: 72 hours later (`2026-02-24`)

## Cadence

| Time | Action |
|---|---|
| T+0 | Run smoke checks and record baseline |
| T+1h | Verify error rate and API health |
| T+6h | Verify 429 ratio and OCR failure trend |
| T+12h | Verify analytics ingestion and CPA click events |
| T+24h | Compare against baseline, decide rollback/escalation |
| T+48h | Re-check trends and incident log |
| T+72h | Final review and close monitoring window |

## Required Checks

1. Web/API health
- Homepage reachable and security headers intact
- API CORS allow/block behavior intact on `ocr`, `identify`, `kakao-places`, `report`

2. Error/quality indicators
- Client error rate (Sentry or equivalent)
- OCR failure ratio
- API 429 ratio

3. Product/business signals
- `PLACE_BENEFIT_COUNT` event reception
- `CPA_LINK_CLICK` event reception

## Thresholds and Actions

| Metric | Threshold | Action |
|---|---:|---|
| 5xx rate | > 2% for 15 min | Immediate rollback candidate |
| OCR failure ratio | > 20% for 1 hour | Pause OCR promotion, investigate API keys/quota |
| 429 ratio | > 10% sustained | Tune rate-limit policy and investigate abuse |
| Analytics drop | 0 events for 30 min | Verify SDK init/env vars, investigate ingestion |

## Rollback Procedure

1. Web rollback
- Roll back to previous stable Vercel deployment.

2. Mobile rollback
- iOS: keep previous TestFlight/App Store build active.
- Android: halt staged rollout and keep previous production release.

3. Incident record
- Log timestamp, symptom, suspected cause, mitigation, and final resolution.

## Commands

1. Generate production smoke report
```bash
npm run deploy:smoke
```

2. Verify Vercel env presence (values are not printed)
```bash
vercel env ls
```

## Baseline Artifact

- `/Users/jmac/Desktop/card-ai-pwa/docs/prod-smoke-report-2026-02-21.md`
