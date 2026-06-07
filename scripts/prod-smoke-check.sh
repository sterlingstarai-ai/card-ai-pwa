#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/prod-smoke-check.sh [base_url] [output_md]

BASE_URL="${1:-https://card-ai-pwa.vercel.app}"
OUTPUT_FILE="${2:-docs/prod-smoke-report-$(date -u +%Y-%m-%d).md}"
ALLOWED_ORIGIN="${BASE_URL}"
BLOCKED_ORIGIN="https://evil.example.com"

tmp_headers="$(mktemp)"
tmp_body="$(mktemp)"

cleanup() {
  rm -f "$tmp_headers" "$tmp_body"
}
trap cleanup EXIT

status_for_options() {
  local endpoint="$1"
  local origin="$2"
  curl -s -o "$tmp_body" -D "$tmp_headers" \
    -X OPTIONS "${BASE_URL}/api/${endpoint}" \
    -H "Origin: ${origin}" \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type' \
    -w '%{http_code}'
}

status_for_asset() {
  local path="$1"
  curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${path}"
}

{
  echo "# Production Smoke Report"
  echo
  echo "- Timestamp (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Base URL: ${BASE_URL}"
  echo
  echo "## Security Headers"
  echo
  echo '```text'
  curl -sSI "${BASE_URL}" | rg -i '^(HTTP/|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|content-security-policy)' || true
  echo '```'
  echo
  echo "## CORS Preflight (Allowed Origin)"
  echo
  echo "| Endpoint | Status | Access-Control-Allow-Origin |"
  echo "|---|---:|---|"
  for ep in ocr identify kakao-places report; do
    code="$(status_for_options "$ep" "$ALLOWED_ORIGIN")"
    allow_origin="$(rg -i '^access-control-allow-origin:' "$tmp_headers" | sed -E 's/^[^:]+:[[:space:]]*//; s/\r$//' || true)"
    echo "| \`/api/${ep}\` | ${code} | ${allow_origin:-N/A} |"
  done
  echo
  echo "## CORS Preflight (Blocked Origin)"
  echo
  echo "| Endpoint | Status |"
  echo "|---|---:|"
  for ep in ocr identify kakao-places report; do
    code="$(status_for_options "$ep" "$BLOCKED_ORIGIN")"
    echo "| \`/api/${ep}\` | ${code} |"
  done
  echo
  echo "## OG/Twitter Meta Tags"
  echo
  echo '```text'
  curl -s "${BASE_URL}" | rg -n 'og:title|og:description|og:image|twitter:card|twitter:title|twitter:description|twitter:image' || true
  echo '```'
  echo
  echo "## PWA HTML Tags"
  echo
  echo '```text'
  curl -s "${BASE_URL}" | rg -n 'rel=\"manifest\"|theme-color|apple-mobile-web-app-capable|apple-mobile-web-app-title' || true
  echo '```'
  echo
  echo "## PWA Assets"
  echo
  echo "| Asset | Status |"
  echo "|---|---:|"
  for asset in /manifest.webmanifest /sw.js /registerSW.js /pwa-192x192.png /pwa-512x512.png; do
    code="$(status_for_asset "$asset")"
    echo "| \`${asset}\` | ${code} |"
  done
} > "${OUTPUT_FILE}"

echo "Wrote report to ${OUTPUT_FILE}"
