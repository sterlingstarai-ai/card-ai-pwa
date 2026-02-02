#!/bin/sh

# Xcode Cloud ci_post_clone.sh
set -e

echo "=== Installing Node.js ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
brew install node

echo "=== Installing npm dependencies ==="
npm ci

echo "=== Building web app ==="
npm run build

echo "=== Syncing Capacitor ==="
npx cap sync ios

echo "=== Removing old Package.resolved ==="
rm -f ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved

echo "=== Resolving Swift Package Dependencies ==="
cd ios/App
xcodebuild -resolvePackageDependencies -project App.xcodeproj -clonedSourcePackagesDirPath /tmp/SourcePackages

echo "=== Build preparation complete ==="
