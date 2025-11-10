# Build Troubleshooting Guide

## Issue: Build Not Completing

The build requires a proper Android development environment. This guide will help you successfully build the APK.

## ✅ Solution 1: Use GitHub Actions (EASIEST - No Setup Required!)

This is the **recommended method** because it requires zero setup on your computer:

### Step-by-Step:

1. **Ensure code is on GitHub**:
   ```bash
   git push origin claude/android-app-development-011CUxhgDPYaHpZQKwnMbhKt
   ```

2. **Go to your GitHub repository** in your web browser

3. **Click "Actions" tab** at the top

4. **The build should start automatically**
   - If not, click "Build Android APK" workflow
   - Click "Run workflow" button
   - Select your branch
   - Click green "Run workflow" button

5. **Wait 3-5 minutes** for the build to complete

6. **Download the APK**:
   - Click on the completed workflow run (green checkmark)
   - Scroll to bottom → "Artifacts" section
   - Click "app-debug" to download ZIP
   - Extract the ZIP file
   - Transfer `app-debug.apk` to your Samsung S23

7. **Install on your phone**:
   - Open the APK file on your phone
   - Tap "Install"
   - If prompted, allow "Install from Unknown Sources"

**✅ Done!** You now have NL2Build installed!

---

## ✅ Solution 2: Build with Android Studio

### Prerequisites:
- Android Studio installed
- 10-15 GB free disk space

### Steps:

1. **Download and Install Android Studio**
   - Visit: https://developer.android.com/studio
   - Download for your OS (Windows/Mac/Linux)
   - Run installer and follow wizard
   - Let it download Android SDK components

2. **Open the Project**
   - Launch Android Studio
   - Click "Open"
   - Navigate to your `NL2Build-` folder
   - Click "OK"

3. **Wait for Initial Sync**
   - Android Studio will sync Gradle (2-5 minutes first time)
   - Bottom panel shows progress
   - If it asks to install SDK components, click "Accept" → "Install"

4. **Build the APK**
   - Menu: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Wait 1-3 minutes
   - Look for "Build successful" notification
   - Click "locate" to find the APK

5. **APK Location**:
   ```
   NL2Build-/app/build/outputs/apk/debug/app-debug.apk
   ```

6. **Install on Samsung S23**:
   - **Option A - USB**: Connect phone, enable USB Debugging, click Run button ▶️
   - **Option B - File Transfer**: Copy APK to phone, open to install

---

## ✅ Solution 3: Build with Command Line

### Prerequisites:
- Java JDK 17 or higher
- Android SDK installed
- Command line experience

### Check Prerequisites:

```bash
# Check Java version (must be 17+)
java -version

# Check Android SDK
echo $ANDROID_SDK_ROOT  # macOS/Linux
echo %ANDROID_SDK_ROOT% # Windows
```

### If You Don't Have Android SDK:

**Option A - Install Android Studio** (includes SDK)
**Option B - Install SDK only**:
```bash
# Download from:
https://developer.android.com/studio#command-tools

# Extract and set environment variable:
export ANDROID_SDK_ROOT=/path/to/android-sdk  # Linux/Mac
set ANDROID_SDK_ROOT=C:\path\to\android-sdk   # Windows
```

### Build Commands:

```bash
# Navigate to project
cd NL2Build-

# Make gradlew executable (Linux/Mac only)
chmod +x gradlew

# Clean build
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Windows:
gradlew.bat clean
gradlew.bat assembleDebug
```

### Success!
If successful, find APK at:
```
app/build/outputs/apk/debug/app-debug.apk
```

---

## Common Errors and Fixes

### Error: "SDK location not found"

**Fix**:
```bash
# Linux/Mac
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export ANDROID_HOME=$ANDROID_SDK_ROOT

# Windows (Command Prompt)
set ANDROID_SDK_ROOT=C:\Users\YourName\AppData\Local\Android\Sdk
set ANDROID_HOME=%ANDROID_SDK_ROOT%

# Windows (PowerShell)
$env:ANDROID_SDK_ROOT="C:\Users\YourName\AppData\Local\Android\Sdk"
```

Or create `local.properties` file:
```properties
sdk.dir=/path/to/android/sdk
```

### Error: "Unsupported class file major version"

**Cause**: Wrong Java version
**Fix**: Install Java 17 or higher
```bash
# Check version
java -version

# Download JDK 17:
https://adoptium.net/
```

### Error: "Could not resolve dependencies"

**Cause**: Network/proxy issues
**Fixes**:
1. Check internet connection
2. Disable VPN temporarily
3. Try again (Gradle will retry failed downloads)
4. Use GitHub Actions instead (no network issues)

### Error: "Execution failed for task ':app:compileDebugKotlin'"

**Fix**: Clean and rebuild
```bash
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### Error: "Permission denied: ./gradlew"

**Fix** (Linux/Mac):
```bash
chmod +x gradlew
```

### Error: Build successful but can't find APK

**Check these locations**:
```
app/build/outputs/apk/debug/app-debug.apk
app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## Verification

### After Building, Verify APK:

```bash
# Check APK exists
ls -lh app/build/outputs/apk/debug/app-debug.apk

# Check APK size (should be 5-15 MB)
du -h app/build/outputs/apk/debug/app-debug.apk
```

### Installing the APK:

**Method 1 - ADB (if phone connected via USB)**:
```bash
# Install
adb install -r app/build/outputs/apk/debug/app-debug.apk

# If multiple devices
adb devices
adb -s DEVICE_ID install -r app/build/outputs/apk/debug/app-debug.apk
```

**Method 2 - File Transfer**:
1. Copy APK to phone (USB cable, cloud, email, etc.)
2. On phone: Open "Files" or "My Files" app
3. Navigate to Downloads
4. Tap the APK file
5. Tap "Install"
6. If blocked: Settings → Security → "Unknown Sources" → Enable

---

## Still Having Issues?

### Option 1: Use GitHub Actions
- Zero setup required
- Works every time
- No need for Android SDK on your computer
- See "Solution 1" above

### Option 2: Share Error Messages
If you still can't build, share:
1. The exact error message
2. Your operating system
3. Java version (`java -version`)
4. Gradle output (`./gradlew assembleDebug --stacktrace`)

### Option 3: Cloud Build Services
- **Codemagic**: https://codemagic.io/
- **GitHub Codespaces**: Has Android SDK pre-installed
- **GitPod**: Can run Android builds

---

## Quick Reference

| Method | Setup Time | Difficulty | Success Rate |
|--------|-----------|------------|--------------|
| GitHub Actions | 0 min | ⭐ Easy | 99% |
| Android Studio | 15 min | ⭐⭐ Medium | 95% |
| Command Line | 30+ min | ⭐⭐⭐ Hard | 80% |

**Recommendation**: Use GitHub Actions for fastest results!

---

## After Successfully Building

1. ✅ Install APK on Samsung S23
2. ✅ Open NL2Build app
3. ✅ Go to Settings tab
4. ✅ Configure Anthropic API key
5. ✅ Configure backend URL
6. ✅ Start building apps!

See `QUICKSTART.md` for next steps!
