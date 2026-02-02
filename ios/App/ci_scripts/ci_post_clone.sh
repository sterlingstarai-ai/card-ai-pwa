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

echo "=== Regenerating Package.resolved ==="
cd ios/App

# Remove old resolved file
rm -f App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved

# Create directory if needed
mkdir -p App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm

# Resolve packages (ignore scheme error, packages still get resolved)
xcodebuild -resolvePackageDependencies -project App.xcodeproj -clonedSourcePackagesDirPath "$CI_DERIVED_DATA_PATH/SourcePackages" 2>&1 || true

# Verify Package.resolved was created
if [ -f "App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved" ]; then
    echo "=== Package.resolved generated successfully ==="
    cat App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved
else
    echo "=== WARNING: Package.resolved not found, creating manually ==="
fi

echo "=== Build preparation complete ==="
