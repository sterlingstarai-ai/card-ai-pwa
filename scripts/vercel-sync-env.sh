#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/vercel-sync-env.sh .env.production.local
# Optional second arg:
#   "production preview development"

ENV_FILE="${1:-.env.production.local}"
TARGETS="${2:-production preview development}"

REQUIRED_KEYS=(
  VISION_API_KEY
  KAKAO_REST_API_KEY
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN
  VITE_KAKAO_APP_KEY
  VITE_MIXPANEL_TOKEN
  VITE_FIREBASE_CONFIG
)

OPTIONAL_KEYS=(
  VITE_SENTRY_DSN
  GITHUB_TOKEN
  GITHUB_REPO
)

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: vercel CLI is not installed."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE"
  exit 1
fi

extract_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi
  printf '%s' "${line#*=}"
}

sync_key() {
  local key="$1"
  local value="$2"
  local target="$3"

  vercel env rm "$key" "$target" -y >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$key" "$target" >/dev/null
  echo "synced $key -> $target"
}

echo "Reading env values from $ENV_FILE"
for key in "${REQUIRED_KEYS[@]}"; do
  if ! value="$(extract_value "$key")" || [[ -z "$value" ]]; then
    echo "Error: missing required key '$key' in $ENV_FILE"
    exit 1
  fi
done

for target in $TARGETS; do
  echo "Syncing target: $target"
  for key in "${REQUIRED_KEYS[@]}"; do
    value="$(extract_value "$key")"
    sync_key "$key" "$value" "$target"
  done

  for key in "${OPTIONAL_KEYS[@]}"; do
    if value="$(extract_value "$key")" && [[ -n "$value" ]]; then
      sync_key "$key" "$value" "$target"
    fi
  done
done

echo "Done. Current Vercel env list:"
vercel env ls
