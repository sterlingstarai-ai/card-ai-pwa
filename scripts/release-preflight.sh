#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

run_step() {
  local label="$1"
  shift
  echo
  echo "==> ${label}"
  "$@"
}

check_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required build artifact: $path" >&2
    exit 1
  fi
}

run_step "Lint" npm run lint
run_step "Data validation" npm run validate
run_step "Unit tests" npm run test:unit
run_step "End-to-end tests" npm run test:e2e
run_step "Production build" npm run build
run_step "Secrets check" npm run secrets:check

echo
echo "==> PWA build artifact checks"
check_file "dist/index.html"
check_file "dist/manifest.webmanifest"
check_file "dist/sw.js"
check_file "dist/registerSW.js"
check_file "dist/pwa-192x192.png"
check_file "dist/pwa-512x512.png"

rg -n 'rel="manifest"|manifest.webmanifest' dist/index.html >/dev/null
rg -n '"display"[[:space:]]*:[[:space:]]*"standalone"' dist/manifest.webmanifest >/dev/null
rg -n '"start_url"[[:space:]]*:[[:space:]]*"/"' dist/manifest.webmanifest >/dev/null

echo "PWA build artifacts look good."

echo
echo "==> Data audit (soft gate)"
if node scripts/data-audit.js; then
  echo "Data audit completed without release-risk findings."
else
  echo "Data audit reported release risks. Review docs/audit-report.md before shipping."
fi

echo
echo "==> Remaining manual gates"
echo "- UX: z-index/layering, filter handoff, SPA scroll, modal close behavior"
echo "- Device: safe area/notch, permissions, offline fallback"
echo "- Post deploy: npm run release:postdeploy -- <production-url>"
echo
echo "Release preflight finished."
