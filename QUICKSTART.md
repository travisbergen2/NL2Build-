# Quick Start Guide - Get NL2Build Running in Minutes!

## 🎯 Goal
Get the NL2Build APK installed on your Samsung S23 and start building apps with AI.

## 📦 Option 1: Download Pre-built APK (Easiest!)

### Using GitHub Actions (Automatic Build)

Once you push this code to GitHub:

1. **Go to your GitHub repository**
2. **Click "Actions" tab** at the top
3. **Click on the latest workflow run**
4. **Scroll down to "Artifacts"**
5. **Download "app-debug"**
6. **Unzip and transfer `app-debug.apk` to your phone**
7. **Install the APK on your Samsung S23**

The GitHub Actions will automatically build the APK every time you push code!

## 🏗️ Option 2: Build Locally with Android Studio

**Time: ~10 minutes**

### Step 1: Install Android Studio
- Download: https://developer.android.com/studio
- Install and follow the setup wizard

### Step 2: Open Project
1. Launch Android Studio
2. Click **"Open"**
3. Select the `NL2Build-` folder
4. Wait for Gradle sync (2-5 minutes first time)

### Step 3: Build APK
1. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait 1-3 minutes
3. Click **"locate"** when done

### Step 4: Install on Phone
**Method A - Direct Install (Easiest):**
1. Connect Samsung S23 via USB
2. Enable USB Debugging (Settings → Developer Options)
3. In Android Studio, click green **"Run"** button ▶️
4. Select your Samsung S23
5. Done!

**Method B - Manual Transfer:**
1. APK location: `app/build/outputs/apk/debug/app-debug.apk`
2. Copy to your phone
3. Open file on phone to install
4. Allow "Install from Unknown Sources" if prompted

## 🖥️ Option 3: Build with Command Line

**Prerequisites:** Java 17+, Android SDK

### Linux/Mac:
```bash
cd NL2Build-
./build-apk.sh
```

### Windows:
```bash
cd NL2Build-
build-apk.bat
```

The script will guide you through the process!

## ⚙️ After Installation

### 1. Get Your API Key
- Visit: https://console.anthropic.com
- Sign up / Log in
- Create an API key
- Copy it (starts with `sk-ant-api03-...`)

### 2. Set Up Backend

**Quick Test (Local):**
```bash
cd backend
npm install
npm start
```
Backend runs at `http://localhost:3000`

**For Phone to Access:**
- Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Use `http://YOUR_IP:3000/api` in the app

**Production (Cloud):**
- Deploy to Railway.app, Google Cloud Run, or Heroku
- See `backend/README.md` for details

### 3. Configure the App
1. Open **NL2Build** on your Samsung S23
2. Tap **Settings** tab (bottom right)
3. Enter **Anthropic API Key**
4. Enter **Backend URL**:
   - Local: `http://YOUR_COMPUTER_IP:3000/api`
   - Cloud: `https://your-backend-url.com/api`
5. Tap **"Save Settings"**

### 4. Create Your First App! 🎉
1. Go to **Home** tab
2. Describe your app:
   ```
   Create a simple todo list app with:
   - Add new tasks
   - Mark tasks as complete
   - Delete tasks
   - Material 3 design
   - Purple color theme
   ```
3. Tap **"Generate App"**
4. Wait ~2 minutes
5. Tap **"Install on Device"**
6. Your generated app installs automatically!

## 🆘 Troubleshooting

### "Cannot download APK from GitHub Actions"
- Make sure the workflow has run (check Actions tab)
- Click on the workflow run to see if it succeeded
- Artifacts expire after 30 days

### "Build failed in Android Studio"
- Make sure Android SDK 34 is installed (Tools → SDK Manager)
- Try: File → Invalidate Caches → Restart
- Try: Build → Clean Project, then Build → Rebuild Project

### "Cannot install APK on phone"
- Settings → Apps → Special Access → Install Unknown Apps
- Enable for your file manager or Chrome

### "Network Error" in app
- Make sure backend is running
- If using local backend, use computer's IP, not `localhost`
- Make sure phone and computer are on same WiFi
- Try using ngrok for local testing: `ngrok http 3000`

### "Please configure API key"
- Go to Settings tab in the app
- Paste your Anthropic API key
- Tap "Save Settings"

## 📱 Using Different Devices?

The app works on any Android 8.0+ device, not just Samsung S23:
- Google Pixel
- OnePlus
- Xiaomi
- Any Android phone/tablet with API 26+

## 💡 Pro Tips

1. **Test locally first**: Build backend on your computer before deploying
2. **Use ngrok**: Makes local backend accessible from phone easily
3. **Save your API key**: Store it securely in a password manager
4. **Start simple**: Begin with simple app descriptions
5. **AAB for Play Store**: Use the AAB file to upload to Google Play Console

## 📚 Need More Help?

- **Full Documentation**: See `README.md`
- **Detailed Setup**: See `SETUP.md`
- **Build Issues**: See `BUILD_INSTRUCTIONS.md`
- **Backend Setup**: See `backend/README.md`

## 🚀 What's Next?

After your first successful app generation:
- Try different app types (weather, fitness, notes, etc.)
- Upload AAB to Google Play Console
- Share generated APKs with friends
- Explore the Projects tab to see your history

---

**Ready to build apps with AI? Let's go! 🎉**
