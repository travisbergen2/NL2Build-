#!/bin/bash

# NL2Build APK Builder Script
# This script helps you build the APK easily

set -e

echo "=================================="
echo "  NL2Build APK Builder"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Java is installed
echo "Checking Java installation..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
    echo -e "${GREEN}✓${NC} Java found: $JAVA_VERSION"
else
    echo -e "${RED}✗${NC} Java not found!"
    echo "Please install Java 17 or higher:"
    echo "  Ubuntu/Debian: sudo apt install openjdk-17-jdk"
    echo "  macOS: brew install openjdk@17"
    echo "  Windows: Download from https://adoptium.net/"
    exit 1
fi

# Check if Android SDK is installed
echo ""
echo "Checking Android SDK..."
if [ -n "$ANDROID_HOME" ] || [ -n "$ANDROID_SDK_ROOT" ]; then
    echo -e "${GREEN}✓${NC} Android SDK found"
else
    echo -e "${YELLOW}!${NC} Android SDK not found"
    echo "You have two options:"
    echo "  1. Install Android Studio (recommended)"
    echo "  2. Set ANDROID_HOME environment variable"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Make gradlew executable
echo ""
echo "Setting up Gradle wrapper..."
chmod +x gradlew
echo -e "${GREEN}✓${NC} Gradle wrapper ready"

# Clean previous builds
echo ""
echo "Cleaning previous builds..."
./gradlew clean
echo -e "${GREEN}✓${NC} Clean complete"

# Build debug APK
echo ""
echo "Building debug APK..."
echo "This may take a few minutes on first run..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  BUILD SUCCESSFUL!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Your APK is ready at:"
    echo "  📱 app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "To install on your Samsung S23:"
    echo "  1. Connect your phone via USB"
    echo "  2. Enable USB debugging on your phone"
    echo "  3. Run: adb install -r app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "Or copy the APK to your phone and install manually."
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  BUILD FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Android SDK not installed"
    echo "  2. Wrong Java version (need 17+)"
    echo "  3. Network issues downloading dependencies"
    echo ""
    echo "Try building with Android Studio instead:"
    echo "  See BUILD_INSTRUCTIONS.md for details"
    exit 1
fi
