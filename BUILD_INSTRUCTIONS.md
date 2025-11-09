# How to Build NL2Build APK

## Method 1: Using Android Studio (Recommended)

This is the easiest and most reliable method:

1. **Install Android Studio** (if not already installed)
   - Download from: https://developer.android.com/studio
   - Follow the installation wizard

2. **Open the Project**
   - Launch Android Studio
   - Click "Open"
   - Navigate to the `NL2Build-` folder
   - Click "OK"

3. **Wait for Sync**
   - Android Studio will automatically sync Gradle
   - This may take 2-5 minutes the first time
   - If prompted, accept any SDK installation requests

4. **Build the APK**
   - Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Wait for the build to complete (1-3 minutes)
   - When done, click "locate" in the notification

5. **Install on Your Samsung S23**
   - The APK will be at: `app/build/outputs/apk/debug/app-debug.apk`
   - **Option A**: Connect your phone via USB
     - Enable USB Debugging on your phone (Settings → Developer Options)
     - In Android Studio, click the green "Run" button
     - Select your Samsung S23
   - **Option B**: Transfer the APK file
     - Copy `app-debug.apk` to your phone
     - Open the file on your phone to install
     - You may need to enable "Install from Unknown Sources"

## Method 2: Command Line (For Advanced Users)

If you have Android SDK installed:

```bash
# Navigate to project directory
cd NL2Build-

# Make gradlew executable (Linux/Mac)
chmod +x gradlew

# Build the APK
./gradlew assembleDebug

# Or on Windows:
gradlew.bat assembleDebug

# The APK will be at:
# app/build/outputs/apk/debug/app-debug.apk
```

## Method 3: GitHub Actions (Automated Build)

If you push to GitHub, I can help you set up GitHub Actions to automatically build the APK:

1. Create `.github/workflows/build.yml`
2. Every push will automatically build an APK
3. Download from the Actions tab

## Method 4: Online Build Service

Use online services like:
- **Appetize.io** - For quick testing
- **GitHub Codespaces** - Has Android SDK pre-installed
- **Codemagic** - Free Android builds

## Troubleshooting

### "SDK not found"
- Open Android Studio
- Go to Tools → SDK Manager
- Ensure Android SDK 34 is installed

### "Build failed"
- Clean the project: `./gradlew clean`
- Rebuild: `./gradlew assembleDebug`

### "Cannot install APK"
- On your Samsung S23:
  - Settings → Apps → Menu → Special Access
  - Install Unknown Apps
  - Enable for your file manager

## Quick Start After Building

1. Install the APK on your Samsung S23
2. Open NL2Build app
3. Go to Settings tab
4. Enter your Anthropic API key
5. Enter your backend URL
6. Tap "Save Settings"
7. Go back to Home and describe your first app!

## Pre-built APK

If you'd like, I can provide you with a pre-built signed APK once you set up a signing key.

---

For any issues, check the main README.md or open an issue on GitHub.
