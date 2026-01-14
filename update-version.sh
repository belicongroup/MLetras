#!/bin/bash

# Update version script for MLetras
# Usage: ./update-version.sh 1.0.9

if [ -z "$1" ]; then
    echo "Usage: ./update-version.sh <version>"
    echo "Example: ./update-version.sh 1.0.9"
    exit 1
fi

NEW_VERSION=$1
BUILD_NUMBER=$(echo $NEW_VERSION | cut -d'.' -f3)

echo "🔄 Updating version to $NEW_VERSION (Build: $BUILD_NUMBER)..."

# Update package.json
echo "📦 Updating package.json..."
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package.json

# Update SettingsPage.tsx
echo "⚙️  Updating SettingsPage.tsx..."
sed -i '' "s/1\.0\.[0-9]\+/$NEW_VERSION/g" src/components/SettingsPage.tsx

# Update Xcode project MARKETING_VERSION
echo "📱 Updating Xcode MARKETING_VERSION..."
sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $NEW_VERSION/g" ios/App/App.xcodeproj/project.pbxproj

# Update Xcode project CURRENT_PROJECT_VERSION
echo "📱 Updating Xcode CURRENT_PROJECT_VERSION..."
sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = $BUILD_NUMBER/g" ios/App/App.xcodeproj/project.pbxproj

# Update Info.plist using agvtool
echo "📱 Updating Info.plist..."
cd ios/App
agvtool new-marketing-version $NEW_VERSION > /dev/null 2>&1
agvtool new-version -all $BUILD_NUMBER > /dev/null 2>&1
cd ../..

# Rebuild web bundle
echo "🔨 Rebuilding web bundle..."
rm -rf dist
npm run build

# Sync to iOS
echo "🔄 Syncing to iOS..."
export LANG=en_US.UTF-8
npx cap sync ios

# Clean Xcode derived data
echo "🧹 Cleaning Xcode build cache..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App clean > /dev/null 2>&1
cd ../..

echo ""
echo "✅ Version update complete!"
echo ""
echo "📋 Summary:"
echo "   Version: $NEW_VERSION"
echo "   Build: $BUILD_NUMBER"
echo ""
echo "📱 Next steps in Xcode:"
echo "   1. Open App.xcworkspace"
echo "   2. Product → Clean Build Folder (Cmd+Shift+K)"
echo "   3. Product → Run (Cmd+R)"
echo ""

