#!/bin/sh

# Xcode Cloud ci_post_clone.sh
# This script runs after the repository is cloned

set -e

echo "=== Installing Node.js dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Node.js using Homebrew (Xcode Cloud has Homebrew)
brew install node

# Install npm dependencies
npm ci

# Build the web app
npm run build

# Sync Capacitor
npx cap sync ios

echo "=== Capacitor sync complete ==="
